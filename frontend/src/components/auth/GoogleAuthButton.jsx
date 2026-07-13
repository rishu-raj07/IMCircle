import { memo, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { GoogleLogin } from "@react-oauth/google";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { perfMark } from "../../utils/perfLog.js";

import {
  APP_PLATFORM,
  GOOGLE_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  IS_ANDROID,
  IS_IOS,
} from "../../config/platform.js";

const IS_NATIVE = IS_ANDROID || IS_IOS;

// The web `<GoogleLogin>` widget (Google Identity Services JS) only works
// with a WEB-type OAuth client and only runs inside a real browser origin —
// it silently fails inside a Capacitor WebView on Android/iOS, which use
// Android/iOS-type OAuth clients tied to package name + SHA-1 / bundle ID
// instead. That's why Google Sign-In "wasn't even appearing" on the Android
// app while working fine on the website: this component used to render the
// same widget everywhere.
//
// Fix: on native platforms, use @capgo/capacitor-social-login, which calls
// Android's Credential Manager / iOS's native Google Sign-In SDK directly.
// It's initialized with the WEB client ID (not the Android/iOS one) because
// that's what ends up as the ID token's `aud` claim — the backend already
// validates against all three client IDs (googleClients.js), so this
// requires no backend change.
let nativeInitPromise = null;
function ensureNativeInitialized() {
  if (!nativeInitPromise) {
    nativeInitPromise = SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
      },
    });
  }
  return nativeInitPromise;
}

function NativeGoogleButton({ onSuccess, onError, text }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    perfMark("google_signin_start");

    try {
      await ensureNativeInitialized();
      perfMark("google_native_plugin_initialized");

      // No custom `scopes` here on purpose: the native plugin already
      // requests the default email/profile/openid scopes needed for the ID
      // token (see GoogleProvider.java's default scope set). Passing a
      // custom `scopes` array switches the plugin into a mode that requires
      // MainActivity to implement `ModifiedMainActivityForSocialLoginPlugin`
      // — without that, every login attempt is rejected with "You CANNOT
      // use scopes without modifying the main activity." We don't need any
      // scope beyond the default, so we just don't ask for one.
      const res = await SocialLogin.login({
        provider: "google",
        options: {},
      });

      // Response shape is { provider, result: { idToken, ... } } — the ID
      // token lives under `result`, not on the top-level response.
      const idToken = res?.result?.idToken;

      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }

      perfMark("google_id_token_received");

      // Match the same shape the web GoogleLogin's onSuccess passes so
      // Login.jsx/Signup.jsx don't need to know which flow ran.
      onSuccess({ credential: idToken });
    } catch (err) {
      // TEMPORARY DIAGNOSTIC: a real cert/config mismatch (e.g. the app's
      // signing SHA-1 no longer matching a registered Android OAuth client)
      // surfaces from Android's Credential Manager as a
      // GetCredentialCancellationException — whose message contains the
      // word "Cancellation", which used to match this same /cancel/i check
      // meant for genuine user-tapped-cancel. That made a real failure look
      // identical to "user backed out of the picker": nothing shown, stuck
      // on the login page with zero feedback. Always surface it for now so
      // the actual message is visible on screen instead of guessed at blind.
      console.error("[GoogleAuthButton] native sign-in failed:", err);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={loading}
      className="flex h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-3 text-[14px] font-semibold text-[var(--imc-text)] disabled:opacity-60"
    >
      <FcGoogle size={18} className="shrink-0" />
      {loading
        ? "Signing in…"
        : text === "signup_with"
          ? "Sign up with Google"
          : "Continue with Google"}
    </button>
  );
}

// Google's Identity Services button only accepts a `width` in *pixels*
// (see google.accounts.id.renderButton docs) — it does not understand
// percentage values. Earlier this screen passed width="100%" straight
// through to Google's renderer, which silently falls back to a default/
// minimum-sized button. Because that fallback gets recomputed on every
// re-render (e.g. every keystroke in the mobile-number field above this
// button), the button would visibly shrink/collapse and re-render mid
// interaction instead of holding a stable full-width size.
//
// Fix: measure the actual container width with a ResizeObserver and pass
// that as a concrete pixel value, and keep the button in its own memoized
// component so parent state changes (typing, loading, errors) never force
// Google's script to re-run renderButton with a bad width.
function GoogleAuthButton({ onSuccess, onError, text = "continue_with" }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const measured = Math.round(entry.contentRect.width);
      if (measured > 0) setWidth(measured);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A missing client ID for this platform (VITE_GOOGLE_WEB_CLIENT_ID /
  // VITE_GOOGLE_ANDROID_CLIENT_ID / VITE_GOOGLE_IOS_CLIENT_ID — see
  // config/platform.js) must never fail silently. Rendering Google's button
  // anyway with an empty clientId just produces a confusing failure the
  // moment someone taps it, and hiding the button entirely looks like a
  // missing feature rather than a config problem — so show a clear,
  // visible error in its place instead.
  const missingClientId = IS_NATIVE ? !GOOGLE_WEB_CLIENT_ID : !GOOGLE_CLIENT_ID;

  if (missingClientId) {
    return (
      <div
        ref={containerRef}
        className="flex h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 text-center text-[11.5px] font-bold text-red-600"
      >
        <TriangleAlert size={15} className="shrink-0" />
        Google Sign-In is not configured for {APP_PLATFORM} (missing VITE_GOOGLE_
        {(IS_NATIVE ? "web" : APP_PLATFORM).toUpperCase()}_CLIENT_ID)
      </div>
    );
  }

  if (IS_NATIVE) {
    return (
      <div ref={containerRef} className="w-full shrink-0">
        <NativeGoogleButton onSuccess={onSuccess} onError={onError} text={text} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[46px] w-full shrink-0 overflow-hidden rounded-2xl"
    >
      {width > 0 && (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text={text}
          shape="pill"
          size="large"
          width={width}
        />
      )}
    </div>
  );
}

// Google's Sign-In behavior (onSuccess/onError/credential flow) is
// untouched — this only stabilizes layout, so memoize on the callback
// identities to stop unrelated parent re-renders (typing, loading state)
// from reaching Google's renderer at all.
export default memo(GoogleAuthButton);
