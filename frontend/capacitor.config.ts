import type { CapacitorConfig } from '@capacitor/cli';

// IMCircle — Capacitor configuration
//
// appId / appName must never change after the first Play Store / App Store
// submission — both stores identify your app by appId (Android package name /
// iOS bundle ID) forever. Changing it later means launching as a brand new,
// unconnected app listing.
const config: CapacitorConfig = {
  appId: 'com.imcircle.app',
  appName: 'IMCircle',
  webDir: 'dist',

  // Custom URL scheme used for deep links like imcircle://user/:username,
  // imcircle://post/:id, etc. See src/utils/deepLinks.js for the handler.
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Uncomment and point at your local machine's LAN IP during device
    // testing against a dev server instead of the bundled `dist` build:
    // url: 'http://192.168.1.50:5173',
    // cleartext: true,
    allowNavigation: [
      'api.imcircle.com',
      '*.imcircle.com',
      'res.cloudinary.com',
    ],
  },

  plugins: {
    SplashScreen: {
      // Kept short on purpose — this just covers the native WebView's
      // initial blank frame. The actual designed "intro feel" is the
      // animated logo handoff in src/components/common/SplashIntro.jsx,
      // which takes over immediately after this hides.
      launchShowDuration: 400,
      launchAutoHide: true,
      // Brand ink tone (start of the gradient baked into drawable*/splash.png
      // and animated in SplashIntro.jsx) — used as a fallback flat color if
      // this plugin ever re-shows the splash programmatically.
      backgroundColor: '#12141C',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Left as-is deliberately: unlike SplashScreen, nothing in the app
      // ever calls StatusBar.setStyle/setBackgroundColor at runtime, so
      // this value is the status bar's color for the ENTIRE app session,
      // not just the splash. Changing it here would recolor the OS status
      // bar on every screen, not just the splash intro — out of scope for
      // "make the splash colorful."
      style: 'DEFAULT',
      backgroundColor: '#FFFCF7',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DEFAULT',
      resizeOnFullScreen: true,
    },
    // Native Google Sign-In (see src/components/auth/GoogleAuthButton.jsx).
    // Only the `google` provider is bundled — the plugin also ships
    // Facebook/Apple/Twitter providers we don't use, and the Facebook SDK in
    // particular pulls in an AD_ID permission that Play Console rejects for
    // apps that declare no ads/analytics use of it.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },

  android: {
    allowMixedContent: false,
  },

  ios: {
    contentInset: 'automatic',
  },
};

export default config;
