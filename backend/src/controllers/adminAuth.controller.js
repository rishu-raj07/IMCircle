import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { sendOtpSms, verifyOtpSms } from "../services/msg91.service.js";

// Only these pre-approved mobile numbers may ever request/verify an admin
// OTP. This is the primary access-control gate for the admin panel, so it
// intentionally lives outside the OTP flow itself — even a leaked/replayed
// OTP is useless without control of one of these numbers. Configure via
// ADMIN_ALLOWED_MOBILES (comma separated) in production; the hardcoded
// fallback only exists so local/dev setups keep working out of the box.
const ALLOWED_ADMIN_MOBILES = (
  process.env.ADMIN_ALLOWED_MOBILES ||
  process.env.ADMIN_ALLOWED_MOBILE ||
  "9661140991"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MAX_OTP_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const ACCESS_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Admin panel is never navigated to cross-site (no OAuth redirect flow
  // like the user-facing app), so we can lock this down to "strict" rather
  // than "lax" for stronger CSRF protection on the account that holds
  // access to all platform data.
  sameSite: "strict",
  maxAge,
});

const accessSecret = () =>
  process.env.ADMIN_JWT_ACCESS_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET;

const refreshSecret = () =>
  process.env.ADMIN_JWT_REFRESH_SECRET ||
  process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_SECRET;

const normalizeMobile = (mobile = "") => String(mobile).replace(/\D/g, "").slice(-10);

const isAllowedMobile = (mobile) => Boolean(mobile) && ALLOWED_ADMIN_MOBILES.includes(mobile);

const isLocked = (admin) => Boolean(admin?.lockedUntil && admin.lockedUntil > new Date());

const signAccess = (admin) =>
  jwt.sign({ id: admin._id, role: admin.role, scope: "admin" }, accessSecret(), {
    expiresIn: process.env.ADMIN_JWT_ACCESS_EXPIRE || "1d",
  });

const signRefresh = (admin) =>
  jwt.sign({ id: admin._id, role: admin.role, scope: "admin_refresh" }, refreshSecret(), {
    expiresIn: process.env.ADMIN_JWT_REFRESH_EXPIRE || "30d",
  });

export const sendAdminOtp = async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);

    if (!isAllowedMobile(mobile)) {
      console.warn(
        `[admin-auth] rejected OTP request for disallowed mobile from IP ${req.ip}`
      );
      return res.status(403).json({
        success: false,
        message: "This mobile number is not allowed for admin login.",
      });
    }

    const admin = await Admin.findOne({ mobile });

    if (isLocked(admin)) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please try again later.",
      });
    }

    await sendOtpSms(mobile);

    await Admin.findOneAndUpdate(
      { mobile },
      {
        $set: {
          mobile,
          role: "owner",
          isActive: true,
          "otp.lastSentAt": new Date(),
          "otp.attempts": 0,
          lockedUntil: null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Never echo the OTP back to the client, in any environment — this is
    // the highest-privilege login in the app.
    return res.status(200).json({
      success: true,
      message: "OTP sent to the registered mobile number.",
    });
  } catch (error) {
    console.error("ADMIN SEND OTP ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyAdminOtp = async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile);
    const otp = String(req.body.otp || "").trim();

    if (!isAllowedMobile(mobile)) {
      return res.status(403).json({
        success: false,
        message: "This mobile number is not allowed for admin login.",
      });
    }

    if (!otp || !/^\d{4,8}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Valid OTP is required" });
    }

    const admin = await Admin.findOne({ mobile }).select("+otp.attempts +otp.lastSentAt");

    if (!admin || !admin.isActive) {
      return res.status(400).json({ success: false, message: "Send OTP first." });
    }

    if (isLocked(admin)) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please try again later.",
      });
    }

    const msg91Response = await verifyOtpSms(mobile, otp);
    const msgType = String(msg91Response?.type || "").toLowerCase();

    if (msgType && msgType !== "success") {
      admin.otp = admin.otp || {};
      admin.otp.attempts = (admin.otp.attempts || 0) + 1;

      if (admin.otp.attempts >= MAX_OTP_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCK_MS);
        console.warn(
          `[admin-auth] locked admin login for ${mobile} after repeated failed OTP attempts from IP ${req.ip}`
        );
      }

      await admin.save();

      return res.status(400).json({
        success: false,
        message: msg91Response?.message || "Invalid OTP.",
      });
    }

    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.ip;
    admin.otp = { attempts: 0, lastSentAt: admin.otp?.lastSentAt || null };
    admin.lockedUntil = null;
    await admin.save();

    console.warn(`[admin-auth] successful admin login for ${mobile} from IP ${req.ip}`);

    const adminAccessToken = signAccess(admin);
    const adminRefreshToken = signRefresh(admin);

    res.cookie("adminAccessToken", adminAccessToken, cookieOptions(ACCESS_MS));
    res.cookie("adminRefreshToken", adminRefreshToken, cookieOptions(REFRESH_MS));
    res.cookie("adminAuth", "1", { ...cookieOptions(ACCESS_MS), httpOnly: false });

    res.status(200).json({
      success: true,
      adminAccessToken,
      adminRefreshToken,
      admin: {
        id: admin._id,
        mobile: admin.mobile,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("ADMIN VERIFY OTP ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

export const getAdminMe = async (req, res) => {
  res.status(200).json({
    success: true,
    admin: {
      id: req.admin._id,
      mobile: req.admin.mobile,
      role: req.admin.role,
      lastLoginAt: req.admin.lastLoginAt,
    },
  });
};

export const logoutAdmin = async (req, res) => {
  res.clearCookie("adminAccessToken", cookieOptions(0));
  res.clearCookie("adminRefreshToken", cookieOptions(0));
  res.clearCookie("adminAuth", { ...cookieOptions(0), httpOnly: false });
  res.status(200).json({ success: true, message: "Admin logged out." });
};
