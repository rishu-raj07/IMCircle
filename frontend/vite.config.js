import { readFileSync } from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pwaPackageName = "vite-plugin-pwa";
const { VitePWA = () => null } = await import(pwaPackageName).catch(() => ({}));

// Baked into the bundle at build time so the running app always knows its
// own version/build-date without an extra network request — compared
// against GET /api/meta/version by useVersionCheck.js to decide whether to
// show the "New version available" banner. A stale cached bundle keeps
// whatever value was baked in when IT was built, which is exactly the
// signal this comparison needs.
const appVersion = JSON.parse(readFileSync("./package.json", "utf-8")).version;
const buildDate = new Date().toISOString();

// Every native (Capacitor) build runs `vite build` through one of the
// "cap:*" package.json scripts (cap:sync, cap:android, cap:ios) — npm sets
// npm_lifecycle_event to the script name being run, so this is a reliable,
// zero-dependency way to tell "building for the native app" apart from a
// plain `npm run build` (real web deploy) without needing a separate env
// file or cross-platform env-var syntax (which doesn't work the same way
// in PowerShell vs bash anyway).
//
// Root-cause fix for the repeated splash/reload-loop bugs (see
// SplashIntro.jsx, main.jsx): those were ultimately caused by a Workbox
// service worker getting registered inside the Capacitor WebView — the app
// already ships fully bundled in the APK, so a service worker adds nothing
// there and only risks re-triggering the exact same reload loop every time
// a stale one is still active from a previous build (unregistering it at
// boot, in main.jsx, only takes effect once the CURRENT WebView session
// ends — it can't dislodge a SW that's already controlling the running
// page). The only fully reliable fix is for native builds to never contain
// a service worker file at all, so there is nothing left for a stale
// registration to ever re-arm itself from. Real web builds (`npm run
// build`) are unaffected — this only skips the plugin for cap:* builds.
const isCapacitorBuild = (process.env.npm_lifecycle_event || "").startsWith("cap:");

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    tailwindcss(),
    !isCapacitorBuild &&
    VitePWA({
      registerType: "autoUpdate",
      // "auto" used to inject a <script> into index.html that registers the
      // service worker unconditionally — including inside the Capacitor
      // native app. A service worker adds nothing there (the app already
      // ships its assets bundled in the APK) and actively conflicts with
      // it: registerType "autoUpdate" reloads the page whenever a new SW
      // takes control, and in the WebView's file/https-localhost origin the
      // SW kept re-registering as "new" on every launch, causing an endless
      // reload loop — the app (or its splash) restarting over and over
      // instead of settling on a page. Registration is now done by hand in
      // main.jsx, which only calls it on a real web build.
      injectRegister: false,
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "favicon-16.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icons/*.png",
      ],
      manifest: {
        id: "/",
        name: "IMCircle",
        short_name: "IMCircle",
        description:
          "IMCircle - the social network for people who grow. Share your journey, learn in public, find opportunities, and grow with the right circle.",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait",
        background_color: "#FFFCF7",
        theme_color: "#6D28D9",
        categories: ["social", "education", "productivity"],
        lang: "en-IN",
        dir: "ltr",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "Home feed", url: "/home", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Create post", url: "/create-post", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Messages", url: "/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-media",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/[^/]+\/api\/(meta|companies|colleges)(\/|$)/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "imcircle-public-reference-data",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  build: {
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) {
            return "vendor";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }
          if (/[\\/]node_modules[\\/](axios|zustand|socket\\.io-client)[\\/]/.test(id) || id.includes("node_modules/@tanstack/react-query")) {
            return "data";
          }
          return undefined;
        }
      }
    }
  }
});
