# IMCircle — Google Maps Setup (Web, Android, iOS)

## Current state

The app uses the **web Google Maps JavaScript API** via
`VITE_GMAPS_BROWSER_KEY` (frontend env, browser-restricted key — safe to
expose in the bundle). This works inside the WebView on Android/iOS too,
since Capacitor apps render the web app inside a native WebView. There is
no native Maps SDK integration today, so no native Maps key is strictly
required to ship — the placeholders below are prepared for later, not
blocking.

## Web

- `VITE_GMAPS_BROWSER_KEY` in `frontend/.env` (dev) / `frontend/.env.production` (prod).
- Get one at [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create Credentials → API Key → restrict it to "Maps JavaScript API" and your web origin(s).

## Android (native key placeholder — not required today)

If a native Capacitor Google Maps plugin is added later, Android needs a
`com.google.android.geo.API_KEY` manifest entry. This is already wired up
as an empty placeholder so no code changes are needed later:

- `frontend/android/app/src/main/AndroidManifest.xml` has a `<meta-data android:name="com.google.android.geo.API_KEY" android:value="${mapsApiKey}" />` entry.
- `frontend/android/app/build.gradle` reads `MAPS_API_KEY` from `frontend/android/local.properties` (gitignored, per-machine) or a `MAPS_API_KEY` environment variable (for CI), and injects it via `manifestPlaceholders`.
- **To set a real key**: add `MAPS_API_KEY=your_real_key` to `frontend/android/local.properties` on your machine (never commit it — that file is already gitignored), or set a `MAPS_API_KEY` env var in your CI/build pipeline.
- Leaving it unset is harmless — the placeholder resolves to an empty string and nothing currently reads it.

## iOS (native key placeholder — not required today)

`frontend/ios/App/App/AppDelegate.swift` has a comment block in
`application(_:didFinishLaunchingWithOptions:)` showing exactly where a
native `GMSServices.provideAPIKey(...)` call would go if a native Maps SDK
is added later. Nothing is hardcoded. When you're ready:

1. Add the Google Maps iOS SDK (CocoaPods/SPM).
2. Store the real key in an Xcode build configuration / `.xcconfig` file (gitignored, one per developer/CI) — never as a literal string in Swift source.
3. Call `GMSServices.provideAPIKey(...)` at the marked spot in `AppDelegate.swift`.

**Team ID and App Store Connect app ID** are not yet available — add them
to `google-oauth-setup.md`'s iOS row and to your Xcode signing
configuration once you have them; nothing in this codebase currently
blocks on them.

## Testing

- Web: confirm the map renders on any page that uses it, with `VITE_GMAPS_BROWSER_KEY` set.
- Android/iOS: no native testing needed yet since no native Maps SDK is integrated — the WebView-based map already works identically to web.
