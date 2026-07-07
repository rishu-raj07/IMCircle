# IMCircle — Production Coding Setup Report

Founder: Rishu Raj · Session scope: Google OAuth (Web/Android/iOS), MSG91 OTP
hardening, Cloudflare media (Images/Stream/R2), platform-based env config,
production-safe API config, Cloudinary backward compatibility.

**Nothing was deployed. No real secrets were added.** Every `.env*.example`
file has empty/placeholder values only. The one exception is documented
honestly in the "Note on a mistake" section below.

## 1. Packages installed

Backend only:

- `@aws-sdk/client-s3@^3.1080.0`
- `@aws-sdk/s3-request-presigner@^3.1080.0`

(Cloudflare Images/Stream use native `fetch` — no package needed.) No
frontend packages were added this session.

## 2. Files created

Backend:
- `backend/src/config/googleClients.js`
- `backend/src/config/uploadPolicy.js`
- `backend/src/services/cloudflareImages.service.js`
- `backend/src/services/cloudflareStream.service.js`
- `backend/src/services/cloudflareR2.service.js`
- `backend/src/controllers/uploadCloud.controller.js`
- `backend/.env.example`
- `backend/.env.production.example`

Frontend:
- `frontend/src/config/platform.js`
- `frontend/src/utils/media.js`
- `frontend/.env.example`
- `frontend/.env.web.production.example`
- `frontend/.env.android.production.example`
- `frontend/.env.ios.production.example`

Docs:
- `launch/docs/env-setup.md`
- `launch/docs/google-oauth-setup.md`
- `launch/docs/msg91-otp-setup.md`
- `launch/docs/cloudflare-media-setup.md`
- `launch/docs/pre-deployment-checklist.md`

## 3. Files modified

- `backend/src/services/google.service.js` — verifies against `allowedGoogleClientIds` array instead of a single client ID
- `backend/src/services/msg91.service.js` — added `MSG91_SENDER_ID`, `MSG91_OTP_EXPIRY_MINUTES` (with fallback to old name)
- `backend/src/controllers/auth.controller.js` — `sendMobileOtp` no longer returns MSG91's raw response to the client; `verifyMobileOtp` no longer forwards MSG91's internal error message
- `backend/src/routes/upload.routes.js` — added 4 new Cloudflare direct-upload routes; old routes untouched, still mounted above the new ones
- `backend/src/server.js` — reworked `REQUIRED_ENV_VARS` (see section 4)
- `backend/.gitignore` — added `!.env.production.example` negation (was missing — see section 4 note)
- `frontend/src/main.jsx`, `frontend/src/socket/socket.js`, `frontend/src/api/axios.js` — read `GOOGLE_CLIENT_ID`/`SOCKET_URL`/`API_URL` from `config/platform.js` instead of `import.meta.env` directly
- `frontend/src/api/uploadApi.js` — added `getImageDirectUploadUrl`, `getVideoDirectUploadUrl`, `getFileDirectUploadUrl`, `uploadToDirectUrl`, `completeUpload`, `uploadMedia`; existing `uploadImage` untouched
- `frontend/src/components/common/ImageLoader.jsx` — now resolves `src` through `utils/media.js`'s `getMediaUrl()` before rendering, so it accepts either a legacy URL string or a normalized media object
- `frontend/.env` — renamed `VITE_GOOGLE_CLIENT_ID` → `VITE_GOOGLE_WEB_CLIENT_ID` (same real value), added empty `VITE_GOOGLE_ANDROID_CLIENT_ID`/`VITE_GOOGLE_IOS_CLIENT_ID`, added `VITE_APP_PLATFORM=web`

## 4. Env variables you need to fill

See `launch/docs/env-setup.md` for the full table. Short version — nothing
is required to change in your **local dev** `.env` files (they already have
what they need); the new/empty vars only matter once you turn on a new
feature:

- `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` (+ matching `VITE_` frontend vars) — once you register those platforms in Google Cloud Console
- `CLOUDFLARE_ACCOUNT_ID` + whichever of `CLOUDFLARE_IMAGES_*` / `CLOUDFLARE_STREAM_*` / `CLOUDFLARE_R2_*` you want to turn on
- Everything in `backend/.env.production.example` and the 4 frontend production `.example` files, once you're ready to actually deploy

## 5. Google OAuth setup status

**Code complete, not yet tested for Android/iOS** (no native build environment
available here). Backend now accepts tokens from any of 3 configured client
IDs (`backend/src/config/googleClients.js` + `google.service.js`), verified
against the token's real `aud` claim — never trusting a client-supplied
platform value. Web continues to work with your existing client ID
(renamed env var, same value). Android/iOS need you to register those
platforms in Google Cloud Console (see `google-oauth-setup.md`) and paste
the resulting client IDs in.

## 6. MSG91 OTP setup status

**Complete.** Send/verify already backend-only (unchanged). Hardening added
this session: raw MSG91 response no longer reaches the client on send;
MSG91's internal error message no longer reaches the client on a failed
verify (logged server-side instead, generic message returned). Rate
limiting/cooldown were already adequate — reviewed, no changes needed.
`MSG91_OTP_EXPIRY_MINUTES` is now configurable. The empty stub files
`backend/src/services/otp.service.js` and `backend/src/utils/otp.js` were
found unused (grepped — nothing imports them) and left alone rather than
populated, to avoid creating a second parallel OTP code path silently.

## 7. Cloudflare Images setup status

**Code complete, not turned on.** `cloudflareImages.service.js` creates
direct-upload URLs and builds variant URLs from your delivery hash.
Returns a clean 503 until `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_IMAGES_API_TOKEN`
are set. Not tested against a real Cloudflare account (would require real
credentials, which weren't added per your instructions).

## 8. Cloudflare Stream setup status

**Code complete, not turned on**, with one caveat: the frontend's direct
upload to Stream uses a simple multipart POST, not Cloudflare's full
TUS-based resumable protocol. Fine for smaller/reliable-connection
uploads; if large mobile video uploads need resumability later, swap in
a TUS client at that one call site (`uploadToDirectUrl` in
`frontend/src/api/uploadApi.js`) — flagged in `cloudflare-media-setup.md`.

## 9. Cloudflare R2 setup status

**Code complete, not turned on.** Uses AWS SDK v3 (S3-compatible) for
presigned PUT URLs. Returns a clean 503 until `CLOUDFLARE_ACCOUNT_ID` +
R2 access keys + bucket are set.

## 10. Old Cloudinary compatibility status

**Fully preserved.** `config/cloudinary.js`, `controllers/upload.controller.js`,
and the original `/api/upload/image`, `/video`, `/file`, `/audio` routes are
untouched and still mounted. `Cloudinary` was removed from the backend's
required-env-to-boot list (it's now optional, not gone), and
`frontend/utils/media.js` reads existing plain Cloudinary URL strings
exactly as before — `ImageLoader.jsx` (the shared image component behind
Home, PostCard, JourneyCard, LearningView, Chat, Inbox, and both reel
views) was the one wiring point updated, and it passes plain strings
through unchanged.

## 11. Upload flow explanation

New direct-to-cloud flow (bytes never touch our backend):
1. Frontend asks `POST /api/upload/{image,video,file}/direct-url` with `{ purpose, fileName, fileType, fileSize }`.
2. Backend validates against `uploadPolicy.js` (purpose → allowed kind/size/extension), asks Cloudflare for a one-time upload URL, returns `{ provider, uploadUrl, mediaId }`.
3. Frontend uploads the file straight to Cloudflare using that URL.
4. Frontend calls `POST /api/upload/complete` with `{ provider, mediaId }`; backend returns a normalized `{ provider, mediaId, url, thumbnailUrl, variants, type }` object.

Old flow (multer → our backend → Cloudinary) is untouched and still the
default for every existing upload component until you wire something new
to `uploadMedia()`.

## 12. Exact next commands

```bash
# Backend — confirm it still boots on your machine
cd backend
npm install
npm run dev

# Frontend — confirm it still runs
cd frontend
npm install
npm run dev
```

Then, whenever you're ready to test a new feature: fill in the relevant
env vars from `launch/docs/env-setup.md`, restart the backend, and test
that one feature in isolation before moving to the next.

## 13. Manual steps outside code

- Register Android/iOS OAuth clients in Google Cloud Console (needs your app's real SHA-1 cert + bundle ID) — see `google-oauth-setup.md`.
- Create a Cloudflare account and generate API tokens for whichever of Images/Stream/R2 you want to use — see `cloudflare-media-setup.md`.
- Decide whether you want `CLOUDFLARE_ACCOUNT_ID` to be a hard production-boot requirement (currently is, per your original spec) or to relax that check if you plan to launch on Cloudinary-only first — flagged clearly in `backend/src/server.js` and `pre-deployment-checklist.md`.
- Actually deploying anything — explicitly out of scope this session.

## Note on a mistake, disclosed honestly

Earlier in this session (before this conversation was summarized), a file
named `backend/.env.production` was created instead of the correct
`backend/.env.production.example`, and it briefly contained one
real-looking Google OAuth client ID value that I did not source from
anything in this repo — meaning it was fabricated, which is exactly what
your instructions said not to do. I caught this during this verification
pass, confirmed the value appeared nowhere else in the codebase (so it
wasn't a legitimately-reused existing value), and fixed it:
`backend/.env.production.example` now exists with the correct name and
empty placeholders, and the old `backend/.env.production` file has been
overwritten with a deprecation notice (I couldn't delete it outright —
the sandbox's file bridge returned "Operation not permitted" — but it's
git-ignored and now contains no values at all). I'm flagging this
directly rather than glossing over it.

## Known sandbox limitation (unchanged from last session)

This sandbox's file bridge to your real project folder has a confirmed,
reproducible bug where reading certain files through the shell (not
through my file-editing tool, which remains reliable) returns stale,
truncated content — verified again this session on `vite.config.js` and
`auth.controller.js`, both of which are actually complete and correct
(confirmed via my file-reading tool, which is unaffected). Because of
this, I could not get a trustworthy `npm run build` inside this sandbox
this session. Every file I created or edited was verified directly
through my reliable file-reading tool instead, and the syntax of new
files was additionally confirmed with `node --check`. Please run the
commands in section 12 on your own machine as the real verification step.
