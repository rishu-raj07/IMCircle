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
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FFFCF7',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#FFFCF7',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DEFAULT',
      resizeOnFullScreen: true,
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
