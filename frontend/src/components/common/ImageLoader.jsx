import { useEffect, useMemo, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import {
  getOptimizedImageUrl,
  getPlaceholderImage,
} from "../../utils/mediaOptimization";
import { getMediaUrl } from "../../utils/media";

function ImageLoader({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  width = 700,
  eager = false,
  variant = "image",
  // Gender-appropriate placeholder (see utils/avatar.js's
  // getGenderAvatarIcon) — callers rendering an avatar pass this so a
  // broken/missing photo swaps to that instead of the generic UserRound
  // icon. Left empty for non-avatar media, which keeps the old behavior.
  fallbackSrc = "",
  onError,
  ...props
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retrySrc, setRetrySrc] = useState("");

  // `src` is almost always a plain URL string today (getMediaUrl passes
  // those straight through unchanged) — but this also lets callers pass a
  // normalized Cloudflare media object ({ provider, url, variants, ... })
  // once any component starts producing those, without every ImageLoader
  // call site needing to know the difference. See utils/media.js.
  const resolvedSrc = useMemo(() => getMediaUrl(src), [src]);

  const optimizedSrc = useMemo(
    () => getOptimizedImageUrl(resolvedSrc, { width }),
    [resolvedSrc, width]
  );

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setRetrySrc("");
  }, [optimizedSrc]);

  useEffect(() => {
    if (eager || visible) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, visible]);

  const finalSrc = failed ? fallbackSrc || getPlaceholderImage() : retrySrc || optimizedSrc;
  const isAvatar =
    variant === "avatar" ||
    Number(width) <= 128 ||
    wrapperClassName.includes("rounded-full") ||
    className.includes("rounded-full");

  return (
    <span
      ref={ref}
      className={`imc-image-loader relative block overflow-hidden ${wrapperClassName}`}
    >
      {!loaded && !isAvatar && (
        <span className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,var(--imc-surface-2)_0%,rgba(148,163,184,0.18)_48%,var(--imc-surface-2)_100%)] bg-[length:240%_100%]" />
      )}

      {(!loaded || failed || !visible) && isAvatar && (
        <span className="absolute inset-0 grid place-items-center bg-[var(--imc-surface-2)] text-[var(--imc-text-faint)]">
          {fallbackSrc ? (
            <img src={fallbackSrc} alt={alt} className="h-full w-full object-cover" />
          ) : (
            <UserRound size={18} />
          )}
        </span>
      )}

      {visible && !failed && (
        <img
          src={finalSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={`transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          onLoad={() => setLoaded(true)}
          onError={(event) => {
            if (!retrySrc && optimizedSrc !== resolvedSrc) {
              setRetrySrc(resolvedSrc);
              return;
            }

            setFailed(true);
            setLoaded(true);
            onError?.(event);
          }}
          {...props}
        />
      )}
    </span>
  );
}

export default ImageLoader;
