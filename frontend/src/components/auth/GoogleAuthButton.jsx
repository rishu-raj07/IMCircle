import { memo, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

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
