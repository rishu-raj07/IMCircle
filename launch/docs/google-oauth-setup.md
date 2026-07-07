# IMCircle — Google OAuth Setup (Web, Android, iOS)

## How it works

Up to three separate Google OAuth client IDs exist — one per platform —
because Google requires a distinct client registration per platform (web
origin, Android package + SHA-1, iOS bundle ID). All three can live in
the same single `.env` / `.env.production` file at once; there is no
separate env file per platform (see `env-setup.md`).

- `backend/src/config/googleClients.js` builds an `allowedGoogleClientIds` array from `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, and the legacy single `GOOGLE_CLIENT_ID` — whichever of these are set gets included.
- `backend/src/services/google.service.js` verifies the Google ID token's `aud` (audience) claim against that whole array. The backend never trusts a client-supplied "platform" field — the token itself proves which client it was minted for.
- `frontend/src/config/platform.js` detects the running platform via `Capacitor.getPlatform()` at runtime and picks the matching `VITE_GOOGLE_*_CLIENT_ID` for the login button.

## Known client IDs on file (com.imcircle.app)

These were provided directly and are already in `backend/.env`,
`backend/.env.production`, `frontend/.env`, and `frontend/.env.production`
(Google client IDs are public identifiers, not secrets — safe to have in
a frontend bundle):

| Platform | Client ID | Notes |
|---|---|---|
| Web | `906382822490-fqqaff075jup2kofmdrqspnfivuph54o.apps.googleusercontent.com` | existing, unchanged |
| Android | `979359043747-q7mds1kt1m7up5n4fdvv8j2lv0k1md6m.apps.googleusercontent.com` | package `com.imcircle.app`, SHA-1 `B1:E3:DB:C5:6B:E7:DB:07:71:EB:6D:67:48:AE:41:F3:BE:29:B4:64` |
| iOS | `979359043747-mu2vs9upjopkftoc8ails89pgu4nhsv4.apps.googleusercontent.com` | bundle ID `com.imcircle.app`; Team ID and App Store ID to be added once available |

If the Android release keystore is ever regenerated, the SHA-1
fingerprint on file with Google Cloud Console for the Android client ID
must be updated to match the new keystore's fingerprint, or Android
Google Sign-In will start failing silently.

## Avatar-from-Google-profile behavior

`backend/src/controllers/auth.controller.js`'s `googleLogin` already does
the right thing and needed no change:

- **New user** (first-ever Google login): `avatar` is set to the Google profile photo, since there's nothing to preserve yet.
- **Existing user**: `user.avatar = user.avatar || avatar` — the Google photo is only used as a fallback if the user has no avatar already. An uploaded avatar is never overwritten by a Google login.

## Testing

- **Web**: `npm run dev` in `frontend/`, try Google Sign-In — should work exactly as before.
- **Android/iOS**: only testable with a real native build (`npx cap open android` / `npx cap open ios`, requiring Android Studio / Xcode) — not available in this sandbox. Confirm the client IDs above are present in `backend/.env`/`.env.production` before testing, since the backend rejects any token whose audience doesn't match one of the configured IDs.
