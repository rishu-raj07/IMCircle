// Central place that answers "what platform am I running on, and which
// API/Socket/Google client config applies?" — used instead of scattering
// `import.meta.env.VITE_*` reads (and hardcoded client IDs) across the app.
//
// Platform detection is done entirely in code at runtime via Capacitor's
// `Capacitor.getPlatform()` ("android" | "ios" | "web") — there is
// deliberately no separate env file per platform. A single .env /
// .env.production is shared across web, Android, and iOS builds; only the
// Google client ID actually varies by platform, and that's selected below
// from the one env file using whichever platform Capacitor reports.
import { Capacitor } from "@capacitor/core";

function detectPlatform() {
  try {
    const native = Capacitor.getPlatform(); // "android" | "ios" | "web"
    if (native === "android" || native === "ios") return native;
    return "web";
  } catch {
    // @capacitor/core not usable in this environment (e.g. a very old
    // browser where the dynamic import fails) — a plain web build is the
    // only safe default here.
    return "web";
  }
}

export const APP_PLATFORM = detectPlatform();
export const IS_WEB = APP_PLATFORM === "web";
export const IS_ANDROID = APP_PLATFORM === "android";
export const IS_IOS = APP_PLATFORM === "ios";

export const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, "");

const GOOGLE_CLIENT_IDS = {
  web: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || "",
  android: import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || "",
  ios: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || "",
};

export const GOOGLE_CLIENT_ID = GOOGLE_CLIENT_IDS[APP_PLATFORM] || "";

// Dev-only visibility into misconfiguration — never throws, never shown to
// the user. A missing client ID in production should fail visibly on the
// Google button itself (it simply won't work), not crash the whole app.
if (import.meta.env.DEV) {
  if (!GOOGLE_CLIENT_ID) {
    console.error(
      `[platform.js] No Google client ID configured for platform "${APP_PLATFORM}". ` +
        `Set VITE_GOOGLE_${APP_PLATFORM.toUpperCase()}_CLIENT_ID in your .env file. ` +
        `Google Sign-In will not work until this is set.`
    );
  }
  if (!import.meta.env.VITE_API_BASE_URL) {
    console.error(
      "[platform.js] VITE_API_BASE_URL is not set — falling back to http://localhost:5000/api. " +
        "This is fine in local dev, but must be set explicitly for any production build."
    );
  }
}

export default {
  APP_PLATFORM,
  IS_WEB,
  IS_ANDROID,
  IS_IOS,
  API_URL,
  SOCKET_URL,
  GOOGLE_CLIENT_ID,
};
