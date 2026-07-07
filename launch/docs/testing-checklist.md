# IMCircle — Pre-Launch Testing Checklist

No automated test suite exists yet (see prior audit). Until one does, use
this manual checklist before every store submission or production deploy.

## Web (production build)
- [ ] `cd frontend && npm install && npm run build` completes with no errors
- [ ] `npm run preview` and click through: signup/OTP, login, Home feed, Discover, create a post, create a journey, create a learning update, Network/Circles, Messages, Notifications, Search, Settings, Privacy Policy, Terms, Community Guidelines, Delete Account flow (cancel before confirming, in a test account)
- [ ] Confirm no `localhost` URLs are reachable in the built `dist/` output (`grep -r localhost dist/assets/*.js` should only match if you intentionally left a dev fallback — verify `VITE_API_URL`/`VITE_SOCKET_URL` were set at build time)
- [ ] Lighthouse audit (Performance, Accessibility, Best Practices, SEO, PWA) on the deployed URL — target 90+ where realistic

## PWA
- [ ] Chrome DevTools → Application → Manifest: icons, name, theme/background color all correct
- [ ] Application → Service Workers: `sw.js` registers and activates; "Offline" checkbox + reload still shows the app shell
- [ ] "Install app" prompt appears (desktop Chrome/Edge address bar icon, or Android Chrome "Add to Home Screen")
- [ ] Confirm private/auth API responses are NOT present in the Cache Storage (DevTools → Application → Cache Storage) — only `google-fonts-*`, `cloudinary-media`, and `imcircle-public-reference-data` caches should exist

## Android
- [ ] `npx cap sync android` completes without errors
- [ ] `npx cap open android`, Gradle sync succeeds in Android Studio
- [ ] Run on an emulator or real device: app launches, splash screen shows brand colors, status bar matches theme, back button behaves correctly (doesn't exit on nested screens), keyboard doesn't cover input fields
- [ ] Test deep link: `adb shell am start -a android.intent.action.VIEW -d "imcircle://user/someusername" com.imcircle.app` opens the right in-app screen
- [ ] `./gradlew bundleRelease` produces a signed AAB (after keystore setup — see launch-checklist.md)
- [ ] Install the release AAB (via `bundletool`) on a device and smoke-test the same core flows as web

## iOS
- [ ] `npx cap sync ios` completes without errors
- [ ] `npx cap open ios`, project builds and runs on the iOS Simulator
- [ ] Camera/Photo Library permission prompts appear with the correct wording when uploading media
- [ ] Test deep link: `xcrun simctl openurl booted "imcircle://user/someusername"` opens the right in-app screen
- [ ] Archive build succeeds in Xcode (Product → Archive) after a Team is selected
- [ ] TestFlight build installs and core flows work on a real device

## Cross-cutting
- [ ] Report a post/comment/profile → confirm it reaches the admin reports queue
- [ ] Block a user → confirm both directions (blocked user can't see/message the blocker, and vice versa's presence per the Socket.io fix in the prior audit)
- [ ] Delete account → confirm login with the same credentials afterward fails
- [ ] Refresh-token flow: let an access token expire (or force it in dev) and confirm a 401 triggers silent refresh, not a logout, for a still-valid session
- [ ] Socket.io connects to the production `VITE_SOCKET_URL`, not localhost, in a production build
