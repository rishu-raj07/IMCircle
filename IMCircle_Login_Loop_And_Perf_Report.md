# IMCircle — Splash/Login Loop, Google Sign-In Error, and Auth Performance

## 1. The infinite splash ↔ login loop (from your screen recording)

**Root cause:** a leftover PWA service worker from an earlier build, still registered inside the Capacitor Android WebView. `vite-plugin-pwa` was set to `registerType: "autoUpdate"`, which reloads the page whenever a new service worker takes control — and inside the WebView's origin, that service worker kept re-registering as "new" on every launch, so the app (and its splash) restarted in an endless cycle instead of settling on the login screen. This matches exactly what your recording shows: splash → login → splash → login, full restarts, not a fast UI flicker.

**Status: already fixed in code**, in two commits made before this session:
- `be4b779` — "Stop service worker from causing reload loop inside the Capacitor app": `injectRegister: false` in `vite.config.js`, plus code in `main.jsx` that actively unregisters any service worker + clears its caches on native launch.
- `15c2e95` — added an explicit `SplashScreen.hide()` call as defense-in-depth.

**Why you were probably still seeing it for 3 hours:** the broken service worker and its cached files are stored in the Android app's persistent storage. Reinstalling the APK over the old one (`adb install -r`, or hitting Run again from Android Studio) does **not** clear that storage — so the old rogue service worker can keep intercepting page loads and serving stale JS even after you rebuild with the fix.

**What to do:**
1. Uninstall the app fully from the device/emulator (not just reinstall) — or go to Android Settings → Apps → IMCircle → Storage → **Clear storage**.
2. Rebuild (`npm run build` in `frontend/`, then sync/run through Capacitor) and install fresh.
3. It should now settle on the login screen in under ~1.5 seconds (see §3).

## 2. The "Continue with Google" error on native

**Root cause:** `frontend/android/app/google-services.json` has an **empty `oauth_client` array**:
```json
"oauth_client": []
```
This means no Android-type OAuth client (package `com.imcircle.app` + a signing SHA-1 fingerprint) is actually linked to this Firebase/Google Cloud project. Without that, the native Google Sign-In (Android Credential Manager) can't find a matching registration and fails — which is exactly the `GetCredentialCancellationException` your own code comment in `GoogleAuthButton.jsx` already anticipated as "a real cert/config mismatch."

**What to do:**
1. Get the SHA-1 of whichever keystore signs the build you're testing:
   - Debug build (normal `Run` from Android Studio / `npx cap run android`): 
     `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - Release build (`frontend/android/imcircle-release.keystore`):
     `keytool -list -v -keystore imcircle-release.keystore -alias <your key alias>`
2. In Firebase Console → Project Settings → your Android app (`com.imcircle.app`) → Add fingerprint, paste the SHA-1 (add SHA-256 too if offered).
3. Re-download `google-services.json` and replace the one in `frontend/android/app/` — the `oauth_client` array should now be populated.
4. Rebuild and reinstall.

Note: `VITE_GOOGLE_ANDROID_CLIENT_ID` / `VITE_GOOGLE_WEB_CLIENT_ID` in your `.env` files are already consistent with each other and with the native plugin config — this was not an env variable problem, it's specifically the missing SHA-1 registration.

## 3. Performance work requested

### Splash screen
`SplashIntro.jsx`'s hold time is a fixed `setTimeout(1150ms)` + `350ms` fade — always ~1.5s total, never dependent on network or auth state. It was already within the 2s budget; I added perf log markers (`splash_intro_mounted`, `splash_intro_hide_timer_fired`, `splash_intro_exit_complete`) so this is now provable from device logs instead of assumed. **The "several seconds" you saw was the loop in §1, not this component.**

### Auth initialization
Checked: there is no network call blocking startup. `ProtectedRoute` decides authenticated-vs-not with a synchronous `localStorage` read (`isAuthSessionValid()` in `store/authStore.js` / `utils/storage.js`) — nothing to move to a background thread because nothing there was blocking render in the first place.

### 5-second timeout on auth requests
Added `{ timeout: 5000 }` to `sendMobileOtp`, `verifyMobileOtp`, and `googleLogin` in `frontend/src/api/authApi.js`. Previously these had no timeout at all and could hang indefinitely on a stalled connection.

### Perf logging added (new `frontend/src/utils/perfLog.js`)
Markers now fire at, in order: `app_boot_start` → `react_render_call` → `splash_intro_mounted` → `splash_intro_hide_timer_fired` → `splash_intro_exit_complete` → `google_signin_start` → `google_native_plugin_initialized` → `google_id_token_received` → `backend_auth_google_request_start` → `backend_auth_google_response_received` → `auth_context_updated` → `navigate_to_home_called`. Each line logs elapsed ms since boot and delta since the previous mark — visible via `chrome://inspect` (Android) or the dev console.

### Navigate to Home immediately
Already true in `Login.jsx`: `saveLoginData(data)` is synchronous (its analytics call is fire-and-forget, `.catch(() => {})`), and `navigate("/home", { replace: true })` runs right after with nothing unrelated awaited in between. No change needed here beyond adding the perf marks.

### Backend `/api/auth/google` (`backend/src/controllers/auth.controller.js`)
- Added `backend/src/utils/perfTimer.js` and instrumented every step: `verify_google_token`, `user_lookup`, `user_create`/`user_update`, `token_generation`, `session_create` — each logged with its own duration plus a total.
- **DB queries:** the user lookup was already a single `findOne({ $or: [{googleId}, {email}] })` — no duplicate lookups to remove. `googleId` and `email` both already have indexes (`User.js`), so this query is index-backed.
- **Removed a real duplicate write:** `sendSecureAuthResponse` (used by every login path — mobile OTP, Google, email) was doing `Session.create()` with a placeholder hash, then a second `Session.save()` once the refresh token was computed. The session's `_id` is now pre-generated before the insert, so the refresh token (and its hash) are known upfront and only **one** `Session.create()` runs. This removes one MongoDB round trip from every single login, not just Google.
- **Warmed Google's cert cache at server boot:** `google-auth-library` normally fetches + caches Google's public signing certs on whichever request first calls `verifyIdToken()` — usually the first real login after a server restart, which pays for an extra network round trip to Google exactly when a user is waiting. Added `warmGoogleCertCache()` (`google.service.js`), called once, fire-and-forget, in `server.js` at startup — so that cost is paid during boot instead of on someone's login.

### Measured step timings
I did not have a live device or a running backend/MongoDB instance in this environment to produce real measured numbers — the logging above is now in place specifically so the *next* login attempt on your device/server produces real timestamps you (or I, from the logs you share back) can read off directly, rather than estimated numbers that wouldn't reflect your actual network/DB. Once you've done the app-storage clear + Google Cloud fingerprint fix in §1–2 and run a login, send me the `[perf]` lines from `chrome://inspect` (frontend) and your server console (backend) and I'll turn those into the exact "step X took Yms" breakdown.

## Summary — what actually needs to happen on your end
1. Fully clear IMCircle's app storage (or uninstall) before your next install — this is what actually stops the loop, since the code fix already exists but can't override an already-persisted broken service worker.
2. Add your build's SHA-1 fingerprint to Firebase/Google Cloud Console for `com.imcircle.app`, re-download `google-services.json`.
3. Rebuild, reinstall, log in once, and share the `[perf]` console output if you want the exact millisecond breakdown filled in.
