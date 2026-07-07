# IMCircle — Pre-Deployment Checklist

Founder: Rishu Raj · Covers the current auth/media/env architecture:
Cloudinary-only media, exactly two env files per side, Google OAuth for
web/Android/iOS, MSG91 OTP. See `launch-checklist.md` from an earlier
session for the broader store/PWA launch checklist.

## What the backend requires to boot

`backend/src/server.js` fails fast (exits before starting the HTTP
server) if any of these are missing, in **every** environment:

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudinary is the only media provider, so it's required — not optional)
- `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`
- at least one of `GOOGLE_WEB_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` / legacy `GOOGLE_CLIENT_ID`

**In production only** (`NODE_ENV=production`), `CLIENT_URL` must also be
set.

**No `CLOUDFLARE_*` variable is required anywhere** — the backend boots
with Cloudinary only, exactly as required.

`COOKIE_SECRET` and `GOOGLE_MAPS_API_KEY` are optional — the server logs a
one-line warning if `COOKIE_SECRET` is unset (cookies still work,
unsigned) and doesn't mention `GOOGLE_MAPS_API_KEY` at all since nothing
currently reads it.

Your current local `backend/.env` already has every required var set —
the dev server's startup behavior is unchanged by this session's work.

## Env file structure (exactly 2 real files per side)

| | Dev | Production | Template |
|---|---|---|---|
| Frontend | `.env` | `.env.production` | `.env.example`, `.env.production.example` |
| Backend | `.env` | `.env.production` | `.env.example`, `.env.production.example` |

No per-platform env files exist or are needed — see `env-setup.md`.

## What changed this session

| Area | Before | After |
|---|---|---|
| Media | Cloudinary + parallel (unused) Cloudflare Images/Stream/R2 code | Cloudinary only — Cloudflare media code removed entirely |
| Env files | 4 frontend files (`.env`, `.env.production`, `.env.web.production.example`, `.env.android.production.example`, `.env.ios.production.example`) + 4 backend | Exactly 2 real + 2 example per side |
| Frontend API var | `VITE_API_URL` (read independently in ~25 files) | `VITE_API_BASE_URL` (same 25 files updated) |
| Platform detection | Capacitor detection + `VITE_APP_PLATFORM` env fallback | Capacitor detection only — no env-based platform override |
| Upload folders | `bharat-network/*` (posts, journeys, learnings) | `imcircle/*` (profiles, posts, journeys, learnings, communities, logos, videos, files) |
| Cookie signing | Unsigned only | Optional `COOKIE_SECRET` support added (backward compatible) |
| Google OAuth | Web client ID only really in use | Real Android + iOS client IDs on file for `com.imcircle.app` |
| `@aws-sdk/*` packages | Installed for Cloudflare R2 | Removed from `package.json` (see note below) |

## A note on package cleanup

`npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` failed in
this sandbox due to a known network-mount limitation (`ENOTEMPTY` during
npm's internal directory rename) — the same issue documented in earlier
sessions. The two packages were removed from `backend/package.json`
directly instead, which is safe and correct, but `package-lock.json`
still lists them and `node_modules` still has them on disk. Run `npm
install` in `backend/` on your machine to reconcile both — this is
automatic and doesn't require any manual editing.

## Testing locally (dev mode)

1. `cd backend && npm run dev` — starts exactly as before.
2. `cd frontend && npm run dev` — Google Sign-In, mobile OTP, and Cloudinary uploads (profile photo, post image, journey update, learning post, community logo) should all work.
3. Confirm a profile photo upload lands in the `imcircle/profiles` Cloudinary folder (previously it would have gone to a generic folder).

## Testing in production mode

1. Set `NODE_ENV=production` plus every required var above.
2. Confirm the server refuses to start and logs a clear message if you deliberately omit one — that's the fail-fast behavior working as intended.

## Manual steps outside this codebase

- Run `npm install` in both `frontend/` and `backend/` to reconcile `package-lock.json`/`node_modules` with the package.json changes (aws-sdk removal).
- If a native Android/iOS build is tested, confirm Google Sign-In works for those platforms using the real client IDs already in `backend/.env`/`.env.production` and `frontend/.env`/`.env.production` — see `google-oauth-setup.md`.
- If a native Google Maps SDK is added later, set `MAPS_API_KEY` in `frontend/android/local.properties` (Android) and wire up `GMSServices.provideAPIKey` in `AppDelegate.swift` (iOS) — see `google-maps-setup.md`. Not required to ship today.
- Actually deploying anything — explicitly out of scope for this session.

## Do not forget

- Never commit a real `.env` or `.env.production` file with actual secrets — only the `.example` files are meant to be committed.
- `.gitignore` on both sides now only allows `.env.example` and `.env.production.example` through — verified this session (the previous 3 platform-specific negation lines per side were removed since those files no longer exist).
