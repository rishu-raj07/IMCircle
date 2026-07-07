// Allowed Google OAuth client IDs — one per platform, plus a legacy
// single-ID var for backward compatibility with deployments that predate
// the web/android/ios split (see frontend/src/config/platform.js and
// launch/docs/google-oauth-setup.md).
//
// A Google ID token's `aud` (audience) claim must match ONE of these for
// login to be accepted — never trust a platform value sent by the client
// itself (see google.service.js: the token's real audience is what's
// verified, regardless of what the frontend claims to be).
export const allowedGoogleClientIds = [
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID, // legacy single-client fallback
].filter(Boolean);

if (allowedGoogleClientIds.length === 0) {
  // Not throwing at import time — server.js's startup env check is the
  // right place to hard-fail. This log makes the cause obvious if that
  // check is ever bypassed or run in an unexpected order.
  console.error(
    "[googleClients] No Google client IDs configured — set at least one of " +
      "GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID " +
      "(or the legacy GOOGLE_CLIENT_ID). Google Sign-In will reject every " +
      "login attempt until this is set."
  );
}
