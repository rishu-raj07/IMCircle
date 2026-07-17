// Lazy, defensive Firebase Admin init for sending push notifications
// (see push.service.js). Mirrors googleClients.js's approach: never throw
// at import time just because push notifications aren't configured yet —
// every other feature must keep working with this fully unset. If it's
// missing, push sends silently no-op (logged once) instead of crashing
// whatever request happened to trigger a notification.
//
// The service account key is a secret and must never be committed to git.
// Configure ONE of these two env vars on the server:
//   FIREBASE_SERVICE_ACCOUNT_JSON  — the whole service account JSON, as a
//                                    single-line string, pasted directly
//                                    into the env file.
//   FIREBASE_SERVICE_ACCOUNT_PATH  — absolute path to the downloaded
//                                    service account .json file on disk
//                                    (e.g. /var/www/imcircle/backend/secrets/firebase-service-account.json).
// Uses the modern modular Admin SDK API (`firebase-admin/app`) rather than
// the classic `import admin from "firebase-admin"; admin.credential.cert()`
// namespace style. As of firebase-admin v14, the plain default export under
// ESM only exposes the flattened app-lifecycle functions (initializeApp,
// cert, getApps, etc.) — there is no `.credential` namespace and no
// `.messaging()` method on that object at all, so the old namespaced style
// throws "Cannot read properties of undefined (reading 'cert')" here. The
// modular imports below are the officially supported path and match what
// push.service.js now imports from "firebase-admin/messaging".
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";

let app = null;
let attempted = false;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    return JSON.parse(raw);
  }

  return null;
}

export function getFirebaseApp() {
  if (app) return app;
  if (attempted) return null; // already tried and failed this process lifetime
  attempted = true;

  try {
    const serviceAccount = loadServiceAccount();

    if (!serviceAccount) {
      console.error(
        "[firebaseAdmin] No Firebase service account configured — set " +
          "FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH. " +
          "Push notifications will not be sent until this is set (in-app " +
          "notifications and everything else are unaffected)."
      );
      return null;
    }

    app = initializeApp({
      credential: cert(serviceAccount),
    });

    return app;
  } catch (error) {
    // Temporary: full stack instead of just .message, since "Cannot read
    // properties of undefined (reading 'cert')" alone hasn't been enough to
    // pin down which line/module is actually throwing this. Revert to just
    // error.message once this is resolved.
    console.error("[firebaseAdmin] Failed to initialize:", error.stack || error);
    return null;
  }
}
