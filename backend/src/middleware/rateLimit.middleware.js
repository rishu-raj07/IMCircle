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

// 600/15min (40/min) per authenticated user sounds generous but wasn't in
// practice: a single Home page load alone fires ~10-12 GET requests (feed,
// profile, suggestions, streak, journeys, sent circle requests, plus
// TopHeader/BottomNav's own badge fetches), and a plain browser refresh
// re-fires all of them from scratch (no SPA route change to dedupe against,
// see axios.js's GET cache). A handful of manual refreshes during normal use
// — or anyone actively testing the app — burns through that budget in
// minutes, well before 15 fill back up. Anonymous (`ip:`) traffic is worse:
// Indian mobile carriers put large numbers of unrelated real users behind
// one shared public IP (carrier-grade NAT), so that bucket represents many
// people, not one, and needs a proportionally higher ceiling than a single
// user's own bucket.
function globalLimiterMax(req) {
  if (process.env.NODE_ENV !== "production") return 10000;
  return requestKey(req).startsWith("ip:") ? 6000 : 3000;
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: globalLimiterMax,
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

// Shared limiter for lower-frequency but still spammable/abusable 