import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pwaPackageName = "vite-plugin-pwa";
const { VitePWA = () => null } = await import(pwaPackageName).catch(() => ({}));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
        screenshots: [
          { src: "/screenshots/mobile-home.png", sizes: "1080x2340", type: "image/png", form_factor: "narrow", label: "IMCircle home feed" },
          { src: "/screenshots/desktop-home.png", sizes: "1920x1080", type: "image/png", form_factor: "wide", label: "IMCircle on desktop" }
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
