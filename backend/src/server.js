import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
// This VPS has both IPv4 and IPv6 addresses, and Node prefers IPv6 by
// default when a hostname resolves to both (e.g. maps.googleapis.com) —
// so every outbound call from this server (Google Maps geocoding/places,
// or anything else that hits a dual-stack host) leaves over IPv6 unless
// told otherwise. That broke server-side Google Maps API key restrictions
// specifically: the key's "Authorized IP addresses" only had the server's
// IPv4 listed, so Google rejected every request with "This IP ... is not
// authorized" even though the IPv4 address WAS correctly whitelisted —
// curl -4 against the same key/endpoint worked immediately, plain curl
// (IPv6-first) didn't. Forcing IPv4-first resolution for the whole process
// fixes this at the source instead of also having to keep a second,
// less-stable IPv6 address in sync on every Google Cloud key restriction
// (some hosts rotate/reassign IPv6 more readily than IPv4).
dns.setDefaultResultOrder("ipv4first");

import http from "http";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/socket.js";
import { startJourneyReminderJobs } from "./services/journeyReminder.service.js";
import { startLearningExpiryJob } from "./services/learningExpiry.service.js";
import { startSpotlightScheduler } from "./services/spotlightScheduler.service.js";
// NOT a static import, on purpose: google.service.js statically imports
// googleClients.js, whose top-level code reads process.env.GOOGLE_* once,
// at module-evaluation time, into a frozen `const allowedGoogleClientIds`
// array that's never recomputed afterward. ES module static imports are
// hoisted and evaluated before any other code in THIS file runs — including
// the dotenv.config() call two lines above, even though it's written first
// — so a static import here made googleClients.js read process.env before
// dotenv had populated it, permanently freezing allowedGoogleClientIds as
// empty for the process's entire lifetime regardless of what .env actually
// contains. Every Google login was rejected as a result, on every restart,
// no matter how correct the .env file was. Deferred to a dynamic import
// below (after dotenv.config() has already run) fixes it — same pattern
// already used for ./app.js.

// Fail fast on missing critical secrets instead of booting into a half-broken
// state where auth/session/upload routes 500 unpredictably on first real
// request. Cloudinary/MSG91/Google previously only logged a warning at
// import time (or threw only when a request first hit them), so a missing
// key could sit unnoticed until a real user's upload or OTP attempt failed.
//
// Cloudinary is the ONLY active media upload provider (Cloudflare
// Images/Stream/R2 media-upload code has been removed — see
// launch/docs/cloudflare-media-setup.md). Cloudflare, if used at all, is
// DNS/SSL/CDN only from here on and needs nothing from this backend.
// Required in EVERY environment (dev included) — these already match your
// working local .env, so nothing changes for you today. Google client ID
// accepts any of the per-platform vars (or the legacy single one).
const REQUIRED_ENV_VARS = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "MSG91_AUTH_KEY",
  "MSG91_TEMPLATE_ID",
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `[startup] Missing required environment variable(s): ${missingEnvVars.join(", ")}. Refusing to start.`
  );
  process.exit(1);
}

const hasGoogleClientId = Boolean(
  process.env.GOOGLE_WEB_CLIENT_ID ||
    process.env.GOOGLE_ANDROID_CLIENT_ID ||
    process.env.GOOGLE_IOS_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID // legacy fallback
);

if (!hasGoogleClientId) {
  console.error(
    "[startup] No Google client ID configured — set at least one of GOOGLE_WEB_CLIENT_ID, " +
      "GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, or the legacy GOOGLE_CLIENT_ID. Refusing to start."
  );
  process.exit(1);
}

if (!process.env.COOKIE_SECRET) {
  // Not required — cookie-parser works fine unsigned, which is how this
  // app's accessToken/refreshToken cookies are read today (req.cookies,
  // not req.signedCookies). This is a soft nudge toward the extra
  // integrity check signed cookies provide, not a hard requirement.
  console.warn(
    "[startup] COOKIE_SECRET is not set — cookies are unsigned. Optional, but " +
      "recommended for production. See launch/docs/env-setup.md."
  );
}

if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
  console.error(
    "[startup] CLIENT_URL is not set in production — CORS will fall back to localhost and block the real frontend. Refusing to start."
  );
  process.exit(1);
}

const { default: app } = await import("./app.js");
const { warmGoogleCertCache } = await import("./services/google.service.js");

connectDB();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

startJourneyReminderJobs();
startLearningExpiryJob();
startSpotlightScheduler();

// Fire-and-forget: pre-warms Google's public cert cache so the first real
// Google login doesn't pay for it (see warmGoogleCertCache's own comment).
// Never blocks server startup and never crashes it if Google is briefly
// unreachable — verifyGoogleCredential() will just fetch+cache it lazily on
// the next login attempt instead, same as before this existed.
warmGoogleCertCache().catch((err) => {
  console.warn("[startup] Google cert cache warm-up failed (non-fatal):", err.message);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.io initialized");
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection Full Error:");
  console.error(err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception Full Error:");
  console.error(err);
});
