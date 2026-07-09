import { memo, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

import { APP_PLATFORM, GOOGLE_CLIENT_ID } from "../../config/platform.js";

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
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div
        ref={containerRef}
        className="flex h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 text-center text-[11.5px] font-bold text-red-600"
      >
        <TriangleAlert size={15} className="shrink-0" />
        Google Sign-In is not configured for {APP_PLATFORM} (missing VITE_GOOGLE_
        {APP_PLATFORM.toUpperCase()}_CLIENT_ID)
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
