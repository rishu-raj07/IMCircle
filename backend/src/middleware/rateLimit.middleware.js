import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";

// This ran per-IP only, at a fairly tight 300 requests/15min in production.
// That's fine for a single dev/tester, but in real usage most Indian mobile
// carriers put large numbers of unrelated users behind the same public IP
// (carrier-grade NAT) — so one busy IP could lock out many real users who
// never actually made those requests. It also meant one person testing
// heavily from home WiFi (phone + laptop sharing one IP, plus every screen
// making a few calls, plus TopHeader re-fetching the streak on every route
// change) could hit the ceiling by themselves within a normal session,
// which is exactly what surfaced this.
//
// Fix: bucket logged-in requests by their token instead of by IP, so each
// authenticated user gets their own budget regardless of who else shares
// their network. Anonymous requests (no token yet, e.g. login/signup) still
// fall back to IP-based limiting, which is fine since those routes are
// separately protected by authLimiter/otpLimiter below anyway.
function requestKey(req) {
  const header = req.headers.authorization;
  const token =
    header && header.startsWith("Bearer")
      ? header.split(" ")[1]
      : req.cookies?.accessToken;

  if (token) {
    const hash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 24);
    return `user:${hash}`;
  }

  return `ip:${ipKeyGenerator(req.ip)}`;
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: requestKey,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait before requesting again.",
  },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Please try again later.",
  },
});

// Shared limiter for lower-frequency but still spammable/abusable write
// actions — reporting or blocking a user, reporting content, sending a
// support message. Generous enough for normal use, tight enough to stop a
// script from mass-reporting/blocking or flooding the support inbox.
export const actionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again later.",
  },
});

// Chat messages are legitimately high-frequency (a real conversation can
// easily send dozens of messages a minute), so this is deliberately much
// looser than actionLimiter — it's only here to stop a scripted flood, not
// to throttle normal typing/sending.
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "You're sending messages too fast. Please slow down.",
  },
});
