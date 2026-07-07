# IMCircle — Launch Readiness Checklist

Founder: Rishu Raj · App ID: com.imcircle.app · Web: https://imcircle.com

This is the single source of truth for what's done vs. what needs a human with
Android Studio, Xcode, an Apple Developer account, and/or Play Console access.
Nothing below was faked — items marked [MANUAL] genuinely cannot be completed
from an automated coding session.

## 1. Web production deployment
- [x] Production `.env.production.example` created for frontend and backend
- [x] Vite build config: hidden sourcemaps, vendor/motion/data chunk splitting
- [x] No hardcoded dev URLs found outside safe `|| "http://localhost..."` dev fallbacks (confirmed via full-repo search)
- [ ] [MANUAL] Deploy frontend `dist/` to real hosting (Vercel/Netlify/S3+CDN/etc.) and backend to a real Node host; set real `VITE_API_URL`/`VITE_SOCKET_URL`/`CLIENT_URL`
- [ ] [MANUAL] Point `imcircle.com` DNS + HTTPS certificate at the deployed frontend; `api.imcircle.com` at the backend

## 2. PWA installability
- [x] `vite-plugin-pwa` installed and configured (manifest, service worker, Workbox runtime caching)
- [x] Icons: 192/512 (any + maskable), favicons, apple-touch-icon, splash all generated and wired
- [x] Offline app-shell precaching + safe, privacy-conscious API caching rules (only public reference data cached; auth/feed/messages/notifications never cached)
- [ ] [MANUAL] Run `npm run build` on a real machine and Lighthouse-audit the deployed site for the installability checklist (this sandbox's build could not be fully verified end-to-end — see final report)

## 3. Android Play Store publishing
- [x] `android/` platform generated via Capacitor, package `com.imcircle.app`
- [x] Adaptive icon, legacy launcher icons, splash screens branded (purple/cream)
- [x] `AndroidManifest.xml`: deep link intent filters (`imcircle://`, `https://imcircle.com` App Links with `autoVerify`), minimal permissions (INTERNET, ACCESS_NETWORK_STATE only)
- [x] `app/build.gradle`: versionCode/versionName, `minifyEnabled true` + proguard for release, signing config commented out with setup instructions (no fake keys)
- [ ] [MANUAL] Generate a real release keystore (`keytool -genkey ...`), create `android/keystore.properties` (gitignored), uncomment the signing block in `app/build.gradle`
- [ ] [MANUAL] Open in Android Studio (`npx cap open android`), let Gradle sync, run `./gradlew bundleRelease` — requires Android SDK/Studio, not available in this sandbox
- [ ] [MANUAL] Host `/.well-known/assetlinks.json` on `imcircle.com` for the App Links `autoVerify` intent filter to actually verify (template below)
- [ ] [MANUAL] Create a Play Console app listing, complete Data Safety form (see `privacy-disclosure-notes.md`), upload the signed AAB, add store graphics/screenshots (real device captures — the ones in `frontend/public/screenshots/` are clearly-labeled placeholders)

**assetlinks.json template** (host at `https://imcircle.com/.well-known/assetlinks.json`):
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.imcircle.app",
    "sha256_cert_fingerprints": ["<SHA256 of your release signing certificate>"]
  }
}]
```
Get the fingerprint after signing with: `keytool -list -v -keystore imcircle-release.keystore -alias imcircle`

## 4. iOS App Store publishing
- [x] `ios/` platform generated via Capacitor (Swift Package Manager, no CocoaPods needed)
- [x] `Info.plist`: custom URL scheme (`imcircle://`), NSCameraUsageDescription/NSPhotoLibraryUsageDescription/NSPhotoLibraryAddUsageDescription/NSMicrophoneUsageDescription (needed for WKWebView file-upload picker), no ATS exceptions (HTTPS-only by default)
- [x] `App.entitlements` created with `applinks:imcircle.com`
- [x] App icon (1024×1024, no alpha channel) and splash screens replaced with brand assets
- [ ] [MANUAL] Open in Xcode (`npx cap open ios`), select your Apple Developer Team under Signing & Capabilities, attach `App.entitlements` via "+ Capability → Associated Domains" (file exists but must be linked through Xcode's UI)
- [ ] [MANUAL] Host `/.well-known/apple-app-site-association` on `imcircle.com` (no file extension, served with `Content-Type: application/json`, no redirects) for Universal Links to verify:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "<TEAMID>.com.imcircle.app",
      "paths": ["/u/*", "/journey/*", "/learning/*", "/post/*", "/opportunity/*"]
    }]
  }
}
```
- [ ] [MANUAL] Archive and upload via Xcode / Transporter — requires a real Mac + Xcode + paid Apple Developer Program membership, none of which exist in this sandbox
- [ ] [MANUAL] Complete App Privacy ("Nutrition Label") questionnaire in App Store Connect (see `privacy-disclosure-notes.md`)

## 5. SEO and social sharing
- [x] Full meta tag suite + JSON-LD in `index.html` (Organization, WebSite, MobileApplication, founder Person)
- [x] `robots.txt`, static `sitemap.xml` (static routes only), `og-image.png`
- [x] Per-route client-side title/meta updater (`useSEO.js`) wired into 6 pages
- [ ] [MANUAL / follow-up engineering] Dynamic sitemap for user/journey/learning pages needs a backend endpoint (DB-driven) — not safe to fake from static files
- [ ] [MANUAL / follow-up engineering] **Structural limitation, not a bug**: this is a client-rendered SPA, so social/crawler bots see only the generic `index.html` tags for every shared profile/journey/learning link. Real fix needs SSR/prerendering or a backend unfurl endpoint for bot user-agents. Flagged, not attempted — it's a scoped project of its own.

## 6. Store listing content
- [x] `launch/docs/play-store-listing.md`, `app-store-listing.md`, `seo-keywords.md` — full text ready to paste into each console
- [ ] [MANUAL] Real device screenshots (Play Console needs at least 2 phone screenshots min 320px; App Store needs 6.7"/6.5" + iPad if supporting tablet) — replace the placeholder images in `frontend/public/screenshots/`
- [ ] [MANUAL] Feature graphic (1024×500) for Play Store

## 7. Compliance
- [x] Privacy Policy, Terms, Community Guidelines (new), account deletion, blocking, reporting all present and reachable from Settings
- [x] `frontend/src/pages/settings/CommunityGuidelines.jsx` created (was referenced by nothing before this session) and routed at `/community-guidelines`
- [ ] [MANUAL / product decision] Cookie/data-collection consent banner if launching in GDPR/CCPA-applicable regions (flagged in the prior audit, still open)

## 8. Production hardening (carried over from the prior security audit — see `IMCircle_Production_Readiness_Audit.md` and `IMCircle_Security_QA_Audit.md` at repo root for full detail; not re-litigated here)
- [x] `.env`/`.env.*` correctly gitignored except `.env.example`/`.env.production.example`
- [x] No `console.log`/`debugger` leftovers found in frontend; backend's few `console.log`s are legitimate operational logs (DB connect, cron status), not debug leaks
- [ ] [MANUAL] Rotate/verify all production secrets (JWT, Cloudinary, MSG91, Google) are real values in the production environment, not the example placeholders

## Post-launch (from the prior audit, still open — not part of this pass's scope)
- Migrate `Post`/`User` embedded arrays (likes, comments, followers) to separate collections before meaningful scale
- Fix `adminDashboard.controller.js`'s full-document stats fetch
- Add `eslint-plugin-jsx-a11y`, close remaining icon-button aria-label gaps
- Add CI (lint + build on push) and a smoke-test suite
