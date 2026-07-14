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

// CLIENT_URL in .env is a single string, but the site is actually reachable
// at BOTH imcircle.com and www.imcircle.com (nginx's server_name lists both,
// and DNS/browsers happily resolve either) — whichever variant ISN'T the
// exact CLIENT_URL string gets its Origin header rejected here, which is
// what showed up in the logs as "Not allowed by CORS: https://www.imcircle.com"
// and silently broke login/every API call for anyone who landed on the www
// version. Always allow both the apex and www form of whatever CLIENT_URL is
// set to, regardless of which one is actually configured.
function withWwwVariant(url) {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : "";

    if (parsed.hostname.startsWith("www.")) {
      return [url, `${parsed.protocol}//${parsed.hostname.slice(4)}${port}`];
    }

    return [url, `${parsed.protocol}//www.${parsed.hostname}${port}`];
  } catch {
    return [url];
  }
}

// Exported so socket.js can build its Socket.IO CORS allowlist from the
// exact same set — the realtime connection (online status/typing/live
// message delivery) needs the same www-vs-apex tolerance the REST API does,
// otherwise a socket handshake from whichever variant isn't in this list
// gets silently rejected and everything that depends on it (presence,
// typing indicator, live message push) quietly stops working for that
// session — the client falls back to looking "stuck" until a manual reload
// re-fetches over plain REST.
export const allowedOrigins = [
  ...withWwwVariant(process.env.CLIENT_URL || "http://localhost:5173"),
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