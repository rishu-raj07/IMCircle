// Thin, statically-resolvable wrapper around vite-plugin-pwa's virtual
// module. main.jsx used to dynamic-import "virtual:pwa-register" directly
// with a /* @vite-ignore */ comment so the native (Capacitor) build — which
// doesn't include the VitePWA plugin, see isCapacitorBuild in
// vite.config.js — wouldn't fail to resolve it at build time.
//
// The problem: @vite-ignore tells Rolldown to skip resolving/bundling that
// specifier ENTIRELY, including on real web builds where the plugin IS
// present. That left the literal string "virtual:pwa-register" sitting in
// the production bundle, which the browser then tried to fetch as a real
// script URL — an invalid, guaranteed-to-fail request (surfaced as a CSP
// script-src violation in the console, but it would have failed regardless
// of CSP). Net effect: the service-worker registration / "update available"
// banner has never actually worked on the live web app.
//
// Fix: this file makes a normal, staticly-analyzable import of
// "virtual:pwa-register", so Rolldown bundles the real vite-plugin-pwa
// registration code for web builds. vite.config.js aliases the bare
// specifier "pwa-register-bridge" (used in main.jsx) to THIS file for web
// builds, and to pwaRegister.native.js (a harmless stub) for Capacitor
// builds — so "virtual:pwa-register" is never referenced at all in a build
// where the plugin isn't present.
export { registerSW } from "virtual:pwa-register";
