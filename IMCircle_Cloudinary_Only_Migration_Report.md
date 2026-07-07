# IMCircle — Cloudinary-Only Migration & Env Consolidation Report

Founder: Rishu Raj · This session reversed the earlier Cloudflare-media
detour: Cloudinary is now the only media provider, env files are
consolidated to exactly two per side, and Google OAuth/Maps groundwork
for Android/iOS is in place. **Nothing was deployed.**

## 1. Files changed

Backend:
- `backend/src/server.js` — required-env list restored to Cloudinary-required, no `CLOUDFLARE_ACCOUNT_ID` check, added optional `COOKIE_SECRET` warning
- `backend/src/app.js` — `cookieParser()` now accepts optional `COOKIE_SECRET`
- `backend/src/controllers/upload.controller.js` — folders renamed to `imcircle/*`, added optional `purpose`-based folder routing, response enriched with normalized fields (additive, old fields untouched)
- `backend/src/controllers/post.controller.js`, `journey.controller.js`, `learning.controller.js`, `circlePost.controller.js` — Cloudinary folder strings renamed from `bharat-network/*` to `imcircle/*`
- `backend/src/routes/upload.routes.js` — Cloudflare direct-upload routes removed, legacy Cloudinary routes untouched
- `backend/package.json` — removed `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- `backend/.env`, `backend/.env.production` (real files) — added `GOOGLE_WEB_CLIENT_ID`, real `GOOGLE_ANDROID_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID`, `GOOGLE_MAPS_API_KEY`, `COOKIE_SECRET`, `MSG91_SENDER_ID`/`MSG91_OTP_EXPIRY_MINUTES` placeholders
- `backend/.env.example`, `backend/.env.production.example` — fully rewritten, no `CLOUDFLARE_*`
- `backend/.gitignore` — simplified to just `.env.example`/`.env.production.example` negations

Frontend:
- `frontend/src/config/platform.js` — rewritten: platform detection is Capacitor-only (no `VITE_APP_PLATFORM` env dependency), `VITE_API_URL` → `VITE_API_BASE_URL`
- **25 files** renamed `VITE_API_URL` → `VITE_API_BASE_URL` (see list below) — every one of these independently reads this env var for building absolute asset/upload URLs
- `frontend/src/api/uploadApi.js` — Cloudflare direct-upload functions removed (dead code, never called by anything); `uploadImage()` now accepts an optional `purpose` option
- `frontend/src/utils/media.js` — header comment corrected to reflect Cloudinary-only reality (function itself unchanged, still safe/forward-compatible)
- `frontend/src/pages/create/CreateCircle.jsx`, `AddCompanyModal.jsx`, `AddCollegeModal.jsx`, `ImageUploader.jsx` — now pass `{ purpose: "community" | "logo" | "profile" }` to `uploadImage()`
- `frontend/.env`, `frontend/.env.production` (real files) — rewritten with `VITE_API_BASE_URL`, real Android/iOS Google client IDs, no `VITE_APP_PLATFORM`
- `frontend/.env.example`, `frontend/.env.production.example` — rewritten
- `frontend/.gitignore` — simplified
- `frontend/android/app/build.gradle` — added `MAPS_API_KEY` manifest placeholder wiring (reads `local.properties` or env var, never hardcoded)
- `frontend/android/app/src/main/AndroidManifest.xml` — added `com.google.android.geo.API_KEY` meta-data using the placeholder
- `frontend/android/local.properties` — added commented `MAPS_API_KEY=` placeholder (gitignored file, safe)
- `frontend/ios/App/App/AppDelegate.swift` — added clear comment block showing exactly where a native Maps key would be wired later (nothing hardcoded)

Docs (`launch/docs/`):
- Rewrote `env-setup.md`, `google-oauth-setup.md`, `pre-deployment-checklist.md`
- Repurposed `cloudflare-media-setup.md` into a historical/removal note
- Added `cloudinary-media-setup.md` (new primary media doc) and `google-maps-setup.md` (new)
- Lightly amended `msg91-otp-setup.md` (added a graceful-failure section)

25 files renamed `VITE_API_URL` → `VITE_API_BASE_URL`: `admin/pages/Users.jsx`, `admin/api/adminApi.js`, `pages/discover/JourneyReelSlide.jsx`, `pages/create/CreatePost.jsx`, `pages/home/Home.jsx`, `pages/learning/LearningViewMeType.jsx`, `pages/learning/LearningView.jsx`, `pages/network/CircleCommunity.jsx`, `pages/network/Requests.jsx`, `pages/network/BrowseCircles.jsx`, `pages/network/Network.jsx`, `pages/journey/JourneyProfile.jsx`, `pages/messages/Inbox.jsx`, `pages/messages/Chat.jsx`, `pages/notifications/Notifications.jsx`, `pages/search/Search.jsx`, `pages/profile/ProfilePeoplePage.jsx`, `pages/profile/Profile.jsx`, `components/post/SocialProofBanner.jsx`, `components/post/RepostCard.jsx`, `components/post/ReplyPreview.jsx`, `components/post/JourneyCard.jsx`, `components/post/PostCard.jsx`, `components/post/PostReelSlide.jsx`, `components/navigation/SideDrawer.jsx`.

## 2. Files deleted

- `backend/src/services/cloudflareImages.service.js`
- `backend/src/services/cloudflareStream.service.js`
- `backend/src/services/cloudflareR2.service.js`
- `backend/src/controllers/uploadCloud.controller.js`
- `backend/src/config/uploadPolicy.js`
- `frontend/.env.web.production.example`
- `frontend/.env.android.production.example`
- `frontend/.env.ios.production.example`

Confirmed via repo-wide search before deleting: none of these were
imported or called from anywhere else in the codebase.

## 3. Env variables required

**Backend, required in every environment** (server refuses to boot if missing): `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, at least one of `GOOGLE_WEB_CLIENT_ID`/`GOOGLE_ANDROID_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID`/`GOOGLE_CLIENT_ID`. Production only: `CLIENT_URL`. Optional: `COOKIE_SECRET`, `GOOGLE_MAPS_API_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_EXPIRY_MINUTES`.

**Frontend**: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_ANDROID_CLIENT_ID`, `VITE_GOOGLE_IOS_CLIENT_ID`, `VITE_GMAPS_BROWSER_KEY`.

Your real `backend/.env` and `frontend/.env` already have every required
value set — nothing changes for your current dev workflow. The real
Android (`979359043747-q7mds1kt1m7up5n4fdvv8j2lv0k1md6m...`) and iOS
(`979359043747-mu2vs9upjopkftoc8ails89pgu4nhsv4...`) Google client IDs
you provided are now in both `backend/.env`/`.env.production` and
`frontend/.env`/`.env.production` (these are public identifiers, not
secrets — safe to have on file).

## 4. Manual steps still needed

- Run `npm install` in `backend/` on your machine to reconcile `package-lock.json`/`node_modules` with the `@aws-sdk/*` removal (the `npm uninstall` command failed in this sandbox with a known `ENOTEMPTY` network-mount issue, so I edited `package.json` directly — see risk section).
- If/when a native Google Maps SDK is added: set `MAPS_API_KEY` in `frontend/android/local.properties` (Android, gitignored) and wire up `GMSServices.provideAPIKey` in `AppDelegate.swift` at the marked spot (iOS). Not required to ship today — the app currently uses the web Maps JS API inside the WebView.
- Confirm the Android SHA-1 (`B1:E3:DB:C5:6B:E7:DB:07:71:EB:6D:67:48:AE:41:F3:BE:29:B4:64`) on file with Google Cloud Console still matches whatever keystore you actually sign releases with — if you regenerate the release keystore later, the Google Cloud Console Android OAuth client needs its SHA-1 updated too, or Android Google Sign-In will silently fail.
- Add Team ID and App Store Connect app ID to `google-oauth-setup.md`/Xcode signing once available (you noted these come later).
- Real production secrets (Mongo URI, JWT secrets, Cloudinary/MSG91 keys) are still blank in `backend/.env.production` — fill those in only when actually ready to deploy.

## 5. Exact test result

Given this sandbox's known file-bridge limitation (documented in earlier
sessions — the shell's reads of certain already-edited files return
stale/truncated content while my file-editing tool reads the true,
correct content), I did not trust a shell-based `npm run build` this
time. Instead, every changed file was verified through my file-reading
tool directly (the reliable path) plus targeted `node --check` on
brand-new files that hadn't been touched by the shell before:

- **Newly created backend files** (`cloudinaryUpload.js`, rewritten `upload.routes.js`, `googleClients.js` from a prior session): syntax-clean.
- **`backend/package.json`**: confirmed valid JSON, `@aws-sdk/*` entries removed, everything else intact — the shell falsely reported this as broken (stale-cache artifact); my file-reading tool confirmed the true, correct content.
- **All 5 controllers with folder renames**: confirmed via targeted search — zero remaining `bharat-network/` references, all correctly on `imcircle/*`.
- **All 25 frontend files renamed to `VITE_API_BASE_URL`**: confirmed zero remaining `VITE_API_URL` references anywhere in `frontend/src`; spot-checked several files' exact content.
- **`platform.js`, Android `build.gradle`/`AndroidManifest.xml`, iOS `AppDelegate.swift`**: read in full, confirmed complete and correctly formed.
- **`@aws-sdk/client-s3`/`@aws-sdk/s3-request-presigner` install/uninstall**: install succeeded earlier; uninstall failed with `ENOTEMPTY` (network-mount limitation), handled by editing `package.json` directly instead.

I could not run a real `npm run build` or start the dev server myself in
this sandbox with confidence in the result. **Please run the commands
below on your own machine as the real verification step:**

```bash
# Backend
cd backend
npm install
npm run dev
# Confirm: starts cleanly, no missing-env errors, no Cloudflare mentions in logs.

# Frontend
cd frontend
npm install
npm run dev
# Then also:
npm run build
```

Checklist to verify manually once running:
- [ ] Backend starts without any `CLOUDFLARE_*` env set — it will, since none is required or read anywhere anymore.
- [ ] Upload a profile photo — lands in Cloudinary folder `imcircle/profiles`.
- [ ] Upload a post image — lands in `imcircle/posts`.
- [ ] `POST /api/upload/video` (if exercised) still works — `imcircle/videos`.
- [ ] Request a mobile OTP — response never contains an `msg91` field or MSG91's raw error text.
- [ ] Google web login still works with your existing client ID.
- [ ] `backend/.env` and `backend/.env.production` both contain `GOOGLE_ANDROID_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID` (confirmed present, real values).

## 6. Risk or warning

- **`package-lock.json` is now slightly out of sync** with `package.json` (still lists `@aws-sdk/*`) until you run `npm install` — this is inert (no code references those packages anymore) but should be cleaned up on your next install.
- **The `COOKIE_SECRET` production check is a soft warning, not a hard failure** — the app will boot and function without it. If you want signed cookies as an extra integrity layer, set it before going to production; if not, no action needed.
- **`GOOGLE_MAPS_API_KEY` (backend) and the native Android/iOS Maps key placeholders are unused by any current code path** — they're wired up structurally per your request but there's no native Maps SDK integration to actually consume them yet. Nothing breaks by leaving them blank.
- **I could not verify a real `npm run build` in this sandbox** (see section 5) — treat your own local `npm run dev`/`npm run build` as the actual pass/fail signal, not anything I report from here.
- **Folder rename (`bharat-network/*` → `imcircle/*`) only affects new uploads.** Anything already sitting in the old Cloudinary folders keeps working exactly as before — their stored URLs didn't change.
