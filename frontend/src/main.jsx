import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { ThemeProvider } from "./store/themeStore.jsx";
import { GOOGLE_CLIENT_ID, IS_ANDROID, IS_IOS } from "./config/platform.js";
import "./index.css";

const IS_NATIVE = IS_ANDROID || IS_IOS;

// The PWA service worker is web-only (see vite.config.js's injectRegister:
// false for why). On native, any service worker left registered from a
// PREVIOUS build of this app is what caused the reload loop — registering
// nothing from here on doesn't remove an already-active one, so this
// actively tears down any existing registration + its caches on native
// launch. Safe to run every time: a no-op once nothing's left to clean up.
if (IS_NATIVE && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });

  if (window.caches?.keys) {
    window.caches.keys().then((keys) => {
      keys.forEach((key) => window.caches.delete(key));
    });
  }
} else if (!IS_NATIVE) {
  // Real web build only — hand-registered now that vite.config.js no
  // longer auto-injects this (see injectRegister: false there).
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // vite-plugin-pwa not available (e.g. dev server without the plugin
      // enabled) — safe to ignore, PWA install just won't be offered.
    });
}

const googleClientId = GOOGLE_CLIENT_ID;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GoogleOAuthProvider clientId={googleClientId}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
