import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),

  mongoSanitize(),

  hpp(),
];

// The web frontend is one fixed origin (CLIENT_URL), but the Android/iOS
// Capacitor apps are NOT — capacitor.config.ts sets androidScheme/iosScheme
// to "https", so every request from those native apps' WebView carries
// `Origin: https://localhost` (some older Capacitor/Cordova builds instead
// send `capacitor://localhost` or `ionic://localhost`). A single hardcoded
// origin string here was silently rejecting every one of those requests —
// which is what showed up as "Failed to send OTP" (and would have broken
// every other API call) on the mobile apps while the website worked fine.
const CAPACITOR_ORIGINS = [
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
];

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  ...CAPACITOR_ORIGINS,
];

export const secureCorsOptions = {
  origin(origin, callback) {
    // Requests with no Origin header at all (native HTTP clients, curl,
    // server-to-server calls) aren't browser/WebView requests subject to
    // CORS in the first place — let them through.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};