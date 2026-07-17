import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import Session from "../models/Session.js";

import { sendOtpSms, verifyOtpSms } from "../services/msg91.service.js";
import { verifyGoogleCredential } from "../services/google.service.js";
import { ensureUserIndexes } from "../services/userIndex.service.js";
import { startTimer } from "../utils/perfTimer.js";
import { resolveReferrerId } from "../utils/referral.js";
import notificationService from "../services/notification.service.js";

// Shared by every signup path (email OTP, mobile OTP, Google) — fires once,
// exactly when the referred account actually completes signup/verification
// (never at account-pre-creation, e.g. before an OTP is confirmed), so the
// referrer isn't notified about someone who never finished signing up.
function notifyReferrerOfJoin(referredBy, newUser) {
  if (!referredBy) return;

  const name = newUser.fullName && newUser.fullName !== "BN User" ? newUser.fullName : "Someone you referred";

  notificationService
    .create({
      recipientId: referredBy,
      actorId: newUser._id,
      type: "referral",
      entityType: "user",
      entityId: newUser._id,
      metadata: { username: newUser.username },
      message: `${name} joined IMCircle using your referral`,
    })
    .catch(() => {});
}

// --- Google Play review OTP bypass -----------------------------------
// The Play Store review team's automated/manual test devices can't
// receive a real SMS, so we reserve one fixed phone number + OTP pair
// that skips MSG91 entirely on both send and verify. This is backend-only:
// the frontend calls the exact same /mobile/send-otp and
// /mobile/verify-otp endpoints with no special-casing and never renders
// this number or OTP anywhere. Do not remove without confirming Play
// Console review notes no longer reference this login.
const PLAY_REVIEW_MOBILE = "9999988888";
const PLAY_REVIEW_OTP = "888888";

const REFRESH_DAYS = 60;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;
const ACCESS_MS = 15 * 60 * 1000;

const getAccessSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// `sameSite: "lax"` cookies are never attached to cross-site XHR/fetch
// requests (only top-level navigations) — the native app's WebView runs on
// its own origin (`https://localhost`, see capacitor.config.ts's
// androidScheme), which is cross-site relative to the API domain, so the
// refreshToken cookie was silently never sent on POST /auth/refresh-token
// from the app. That made every silent refresh 401 once the 15-minute
// access token expired, which the frontend's axios interceptor correctly
// (but confusingly, from a user's perspective) treats as a dead session and
// force-logs-out — reproducing exactly as "logs out every ~10-15 min on the
// app, but the website stays logged in" (web is same-origin, where Lax
// cookies flow fine regardless). `sameSite: "none"` fixes this for native
// without weakening web security: it's a superset of "lax" (still sent on
// every same-site/same-origin request the website makes), and per spec must
// be paired with `secure: true`, which production already sets. CSRF
// exposure from this is already covered by this app's own origin allowlist
// (`secureCorsOptions`) plus the separate CSRF token middleware — this
// project isn't relying on SameSite alone for that.
const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge,
  path: "/",
});

const createOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const getSafeUser = (user) => {
  const obj = user.toObject();

  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.loginAttempts;
  delete obj.lockUntil;

  return obj;
};

const createAccessToken = (userId) => {
  return jwt.sign({ id: userId }, getAccessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });
};

const createRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    {
      id: userId,
      sessionId,
      tokenVersion: crypto.randomBytes(8).toString("hex"),
    },
    getRefreshSecret(),
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || "60d",
    }
  );
};

const getDeviceInfo = (req) => ({
  deviceId:
    req.headers["x-device-id"] ||
    crypto
      .createHash("sha256")
      .update(`${req.ip}-${req.headers["user-agent"] || ""}`)
      .digest("hex"),

  deviceName: req.headers["x-device-name"] || "Unknown Device",
  ipAddress: req.ip || "",
  userAgent: req.headers["user-agent"] || "",
});

// `timer` is optional — passed by callers (e.g. googleLogin) that want this
// step folded into their own request-level perf breakdown instead of a
// standalone one.
const sendSecureAuthResponse = async (req, res, user, statusCode, message, timer = null) => {
  const device = getDeviceInfo(req);

  // Previously: Session.create() with a "pending" placeholder hash, then a
  // second Session.save() once the refresh token (which needs the session's
  // _id) could be computed — two round trips to Mongo for one login. The
  // session _id can be generated up front instead, so the refresh token
  // (and its hash) are already known before the single insert happens.
  const sessionId = new mongoose.Types.ObjectId();
  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id, sessionId);
  timer?.step("token_generation");

  await Session.create({
    _id: sessionId,
    user: user._id,
    refreshTokenHash: Session.hashToken(refreshToken),
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
    expiresAt: new Date(Date.now() + REFRESH_MS),
  });
  timer?.step("session_create");

  res.cookie("accessToken", accessToken, cookieOptions(ACCESS_MS));
  res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_MS));

  return res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    user: getSafeUser(user),
  });
};

export const sendMobileOtp = async (req, res) => {
  try {
    const { mobile, ref } = req.body;

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10 digit Indian mobile number is required",
      });
    }

    let user = await User.findOne({ mobile });

    if (!user) {
      // Resolved once, up front — this account doesn't exist yet, so
      // there's no "is this a returning user" branch to worry about.
      const referredBy = await resolveReferrerId(ref).catch(() => null);

      try {
        user = await User.create({
          fullName: "BN User",
          mobile,
          verification: { mobile: false },
          referredBy,
        });
      } catch (error) {
        if (error?.code !== 11000 || error?.keyPattern?.email !== 1) {
          throw error;
        }

        await ensureUserIndexes();

        user = await User.create({
          fullName: "BN User",
          mobile,
          verification: { mobile: false },
          referredBy,
        });
      }
    }

    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Account not available",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked",
      });
    }

    // Play Store review bypass: this reserved number never goes to MSG91
    // (no real SMS, no MSG91 credit spent) — verifyMobileOtp below accepts
    // only the fixed PLAY_REVIEW_OTP for it.
    if (mobile === PLAY_REVIEW_MOBILE) {
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    }

    const msg91Response = await sendOtpSms(mobile);

    // MSG91's raw response is logged server-side only (useful while
    // debugging a real integration issue) and never returned to the
    // client, even in development — its `type`/`message` fields are
    // MSG91-internal wording, not something we want to commit to as a
    // stable API contract or leak to whoever's calling this endpoint.
    if (process.env.NODE_ENV === "development") {
      console.log("[dev] MSG91 send-otp response:", msg91Response);
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("SEND MOBILE OTP ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

export const verifyMobileOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10 digit Indian mobile number is required",
      });
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Valid 6 digit OTP is required",
      });
    }

    const isPlayReviewLogin =
      mobile === PLAY_REVIEW_MOBILE && otp === PLAY_REVIEW_OTP;

    if (isPlayReviewLogin) {
      // Skip MSG91 entirely for the reserved Play Store review login —
      // there's no real OTP to check against their SMS provider.
    } else {
      const msg91Response = await verifyOtpSms(mobile, otp);
      const msgType = String(msg91Response?.type || "").toLowerCase();

      if (msgType && msgType !== "success") {
        // Log MSG91's raw response server-side for debugging, but never pass
        // its internal message text straight through to the client — it's
        // provider-specific wording we don't control and shouldn't leak.
        console.warn("MSG91 OTP verify rejected:", msg91Response);

        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Account not available",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked",
      });
    }

    const isFirstMobileVerification = !user.verification.mobile;

    user.verification.mobile = true;
    user.lastActiveAt = Date.now();

    if (isPlayReviewLogin) {
      user.isReviewAccount = true;
    }

    await user.save({ validateBeforeSave: false });

    if (isFirstMobileVerification) {
      notifyReferrerOfJoin(user.referredBy, user);
    }

    return sendSecureAuthResponse(req, res, user, 200, "Mobile verified successfully");
  } catch (error) {
    console.error("VERIFY MOBILE OTP ERROR:", error.response?.data || error.message);

    return res.status(400).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

export const googleLogin = async (req, res) => {
  const timer = startTimer("auth.googleLogin");

  try {
    const { credential, ref } = req.body;

    const payload = await verifyGoogleCredential(credential);
    timer.step("verify_google_token");

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const fullName = payload.name || "BN User";
    const avatar = payload.picture || "";

    if (!email || !googleId) {
      timer.done({ result: "missing_email" });
      return res.status(400).json({
        success: false,
        message: "Google account email is required",
      });
    }

    // Single lookup covers both "already signed up with this Google
    // account" (googleId match) and "already has an account under this
    // email via mobile/password, now linking Google" (email match) — no
    // second query needed to distinguish the two, the branch below handles
    // both from this one result.
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });
    timer.step("user_lookup");

    if (!user) {
      const referredBy = await resolveReferrerId(ref).catch(() => null);

      user = await User.create({
        fullName,
        email,
        googleId,
        avatar,
        verification: {
          email: true,
          mobile: false,
        },
        referredBy,
      });
      timer.step("user_create");

      // Google sign-in verifies email as part of the provider flow itself,
      // so account creation here IS the completed signup — no separate OTP
      // step to wait for.
      notifyReferrerOfJoin(referredBy, user);
    } else {
      if (user.isDeleted) {
        timer.done({ result: "account_deleted" });
        return res.status(401).json({
          success: false,
          message: "Account not available",
        });
      }

      if (user.isBlocked) {
        timer.done({ result: "account_blocked" });
        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
        });
      }

      user.googleId = user.googleId || googleId;
      user.email = user.email || email;
      user.fullName = user.fullName === "BN User" ? fullName : user.fullName;
      user.avatar = user.avatar || avatar;
      user.verification.email = true;
      user.lastActiveAt = Date.now();

      await user.save({ validateBeforeSave: false });
      timer.step("user_update");
    }

    const result = await sendSecureAuthResponse(
      req,
      res,
      user,
      200,
      "Google login successful",
      timer
    );
    timer.done({ result: "success" });
    return result;
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error.message);
    timer.done({ result: "error", message: error.message });

    return res.status(401).json({
      success: false,
      message: "Google login failed",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const decoded = jwt.verify(oldRefreshToken, getRefreshSecret());

    const session = await Session.findById(decoded.sessionId);

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const oldHash = Session.hashToken(oldRefreshToken);

    if (oldHash !== session.refreshTokenHash) {
      session.isRevoked = true;
      session.revokedAt = Date.now();
      await session.save({ validateBeforeSave: false });

      res.clearCookie("accessToken", cookieOptions(0));
      res.clearCookie("refreshToken", cookieOptions(0));

      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected. Session revoked.",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted || user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: "User not available",
      });
    }

    const accessToken = createAccessToken(user._id);
    const newRefreshToken = createRefreshToken(user._id, session._id);

    session.refreshTokenHash = Session.hashToken(newRefreshToken);
    session.lastUsedAt = Date.now();
    session.expiresAt = new Date(Date.now() + REFRESH_MS);

    await session.save({ validateBeforeSave: false });

    res.cookie("accessToken", accessToken, cookieOptions(ACCESS_MS));
    res.cookie("refreshToken", newRefreshToken, cookieOptions(REFRESH_MS));

    return res.status(200).json({
      success: true,
      accessToken,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error.message);

    res.clearCookie("accessToken", cookieOptions(0));
    res.clearCookie("refreshToken", cookieOptions(0));

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

export const register = async (req, res) => {
  const { fullName, email, password, ref } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  const otp = createOtp();
  const referredBy = await resolveReferrerId(ref).catch(() => null);

  const user = await User.create({
    fullName,
    email,
    password,
    referredBy,
    otp: {
      code: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
    },
  });

  return res.status(201).json({
    success: true,
    message: "Account created. Please verify OTP.",
    devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
    user: getSafeUser(user),
  });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select("+otp.code +otp.expiresAt");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.verification.email) {
    return res.status(400).json({
      success: false,
      message: "Email already verified",
    });
  }

  if (!user.otp?.code || !user.otp?.expiresAt) {
    return res.status(400).json({
      success: false,
      message: "OTP not found. Please request a new OTP.",
    });
  }

  if (user.otp.expiresAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "OTP expired. Please request a new OTP.",
    });
  }

  if (hashOtp(otp) !== user.otp.code) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  user.verification.email = true;
  user.otp = undefined;

  await user.save({ validateBeforeSave: false });

  // The guard at the top of this function (`if (user.verification.email)
  // return 400`) already guarantees this only runs once per account, so no
  // extra "was this already verified" tracking is needed here.
  notifyReferrerOfJoin(user.referredBy, user);

  return sendSecureAuthResponse(req, res, user, 200, "Email verified successfully");
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil"
  );

  if (!user || user.isDeleted) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "Your account is blocked",
    });
  }

  if (user.isAccountLocked()) {
    return res.status(423).json({
      success: false,
      message: "Account locked. Please try again later.",
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000;
    }

    await user.save({ validateBeforeSave: false });

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastActiveAt = Date.now();

  await user.save({ validateBeforeSave: false });

  return sendSecureAuthResponse(req, res, user, 200, "Login successful");
};

export const logout = async (req, res) => {
  const refreshTokenValue = req.cookies?.refreshToken;

  if (refreshTokenValue) {
    const refreshTokenHash = Session.hashToken(refreshTokenValue);

    await Session.findOneAndUpdate(
      { refreshTokenHash },
      {
        isRevoked: true,
        revokedAt: Date.now(),
      }
    );
  }

  res.clearCookie("accessToken", cookieOptions(0));
  res.clearCookie("refreshToken", cookieOptions(0));

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

export const logoutAll = async (req, res) => {
  await Session.updateMany(
    { user: req.user._id },
    {
      isRevoked: true,
      revokedAt: Date.now(),
    }
  );

  res.clearCookie("accessToken", cookieOptions(0));
  res.clearCookie("refreshToken", cookieOptions(0));

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select("+otp.code +otp.expiresAt");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.verification.email) {
    return res.status(400).json({
      success: false,
      message: "Email already verified",
    });
  }

  const otp = createOtp();

  user.otp = {
    code: hashOtp(otp),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
  });
};
