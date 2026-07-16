import { useState } from "react";
import { ImageOff } from "lucide-react";

import { getOptimizedImageUrl } from "../../utils/mediaOptimization";
import { getMediaUrl } from "../../utils/media";

// Shared responsive media renderer for every post/journey/learning surface
// (feed, discover, single item, profile activity, reposts). Fixes the old
// "every image forced into a fixed-height object-cover box" bug: portrait
// photos got cropped, landscape photos got stretched/cropped, and there was
// no consistent rule across screens.
//
// Classification (per product spec):
//   portrait      ratio < 0.85   -> full image visible, object-fit: contain
//   square-ish    0.85 <= r <= 1.2 -> fills card width, near-square box
//   landscape     ratio > 1.2    -> fills card width, natural aspect ratio
//
// The backend doesn't store natural width/height on Post.media today, so
// this reads it client-side via the loaded <img>/<video> element
// (naturalWidth/naturalHeight) the same way the browser would for any
// other responsive image — see IMCircle_* audit docs referenced in the
// task for why a stored-dimension approach isn't available yet.
function classifyRatio(ratio) {
  if (!ratio || Number.isNaN(ratio) || !Number.isFinite(ratio)) return "unknown";
  if (ratio < 0.85) return "portrait";
  if (ratio <= 1.2) return "square";
  return "landscape";
}

function ResponsivePostMedia({
  src,
  alt = "Media",
  type = "image",
  onClick,
  className = "",
  rounded = "rounded-[14px]",
  maxHeightVh = 88,
  maxHeightPx = 900,
  eager = false,
  controls = true,
  interactive = true,
  // Feed lists read better when every card is the same height (uniform
  // grid rhythm) — the full "show the whole portrait image" treatment is
  // reserved for when someone actually opens the post. When `uniform` is
  // set, every card gets the same fixed-ratio, object-fit:cover box
  // (never stretched, just cropped to fit — same principle Instagram's own
  // feed grid uses); the detail/lightbox view (uniform unset) still shows
  // the true, uncropped aspect ratio once tapped.
  uniform = false,
  uniformRatio = "4 / 5",
  children,
}) {
  const [ratio, setRatio] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const resolvedSrc = getMediaUrl(src);
  const optimizedSrc = getOptimizedImageUrl(resolvedSrc, { width: 1200 });
  const kind = classifyRatio(ratio);
  const isPortrait = !uniform && kind === "portrait";
  const maxHeightCss = `min(${maxHeightVh}vh, ${maxHeightPx}px)`;

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
    setLoaded(true);
  };

  const handleVideoMeta = (event) => {
    const { videoWidth, videoHeight } = event.target;
    if (videoWidth && videoHeight) setRatio(videoWidth / videoHeight);
    setLoaded(true);
  };

  if (!resolvedSrc) return null;

  const Wrapper = interactive ? "button" : "div";
  const wrapperProps = interactive
    ? { type: "button", onClick }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative block w-full overflow-hidden ${rounded} ${className}`}
      style={{
        background: "var(--imc-surface-2)",
        minHeight: loaded ? undefined : "180px",
        // maxHeight is the actual fix here — without it, an extreme-ratio
        // image (a tall boomerang/portrait shot) computes its box height
        // straight from aspectRatio with no ceiling, so the card can grow
        // taller than the viewport and blow out the whole page layout. This
        // caps that growth; the img below is sized to fill whatever height
        // the box actually ends up with (capped or not) via height:"100%",
        // so nothing overflows past this boundary. Tapping still opens the
        // full, uncropped image in the lightbox via the existing onClick.
        maxHeight: maxHeightCss,
        aspectRatio: uniform ? uniformRatio : ratio ? String(ratio) : "4 / 3",
      }}
    >
      {!loaded && !failed && (
        <span className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,var(--imc-surface-2)_0%,rgba(148,163,184,0.18)_48%,var(--imc-surface-2)_100%)] bg-[length:240%_100%]" />
      )}

      {failed && (
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
          style={{ color: "var(--imc-text-muted)" }}
        >
          <ImageOff size={20} />
          Media unavailable
        </span>
      )}

      {!failed && type === "video" ? (
        <video
          src={optimizedSrc}
          className="mx-auto block"
          style={{
            width: "100%",
            height: "100%",
            objectFit: uniform ? "cover" : "contain",
            opacity: loaded ? 1 : 0,
            transition: "opacity .3s ease",
          }}
          controls={controls}
          playsInline
          onLoadedMetadata={handleVideoMeta}
          onError={() => setFailed(true)}
        />
      ) : !failed ? (
        <img
          src={optimizedSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleImageLoad}
          onError={() => setFailed(true)}
          className="mx-auto block"
          style={{
            width: "100%",
            height: "100%",
            objectFit: uniform ? "cover" : "contain",
            opacity: loaded ? 1 : 0,
            transition: "opacity .3s ease",
          }}
        />
      ) : null}

      {children}
    </Wrapper>
  );
}

export default ResponsivePostMedia;
