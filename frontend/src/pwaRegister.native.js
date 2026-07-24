// Native (Capacitor) stand-in for pwaRegister.js. The VitePWA plugin isn't
// included in native builds (see isCapacitorBuild in vite.config.js), so
// "virtual:pwa-register" doesn't exist there. main.jsx never actually calls
// registerSW() on native (guarded by !IS_NATIVE), but vite.config.js's
// resolve.alias still needs a real file to point "pwa-register-bridge" at
// for the native build to bundle successfully.
export function registerSW() {
  return () => {};
}
