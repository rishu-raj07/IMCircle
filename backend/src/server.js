import dotenv from "dotenv";
dotenv.config();

import http from "http";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/socket.js";
import { startJourneyReminderJobs } from "./services/journeyReminder.service.js";
import { startLearningExpiryJob } from "./services/learningExpiry.service.js";

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

connectDB();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

startJourneyReminderJobs();
startLearningExpiryJob();

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
