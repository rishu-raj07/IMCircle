import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { getMediaUrl } from "../../utils/media";
import { getOptimizedImageUrl } from "../../utils/mediaOptimization";

// Focused media viewer for normal image/video posts — intentionally NOT the
// reel-style, swipeable, full-screen-action-rail experience Journeys use
// (JourneyReelSlide/PostReelSlide). A static image post tapped open should
// just show the complete image, full-bleed but uncropped, with a close
// button and (if there are multiple items) simple prev/next arrows. Likes,
// comments, repost, save, share stay on the card underneath — this
// component owns nothing but "show me this media clearly."
function MediaLightbox({ media = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, media.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media.length, onClose]);

  if (!media.length) return null;

  const item = media[index];
  const src = getOptimizedImageUrl(getMediaUrl(item?.url), { width: 1600 });

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/15 active:scale-95"
        style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <X size={18} color="#fff" />
      </button>

      <div className="flex flex-1 items-center justify-center px-2" onClick={(e) => e.stopPropagation()}>
        {media.length > 1 && index > 0 && (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            className="absolute left-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/15 active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft size={20} color="#fff" />
          </button>
        )}

        {item?.type === "video" ? (
          <video src={src} controls playsInline className="max-h-full max-w-full object-contain" />
        ) : (
          <img src={src} alt="Media" className="max-h-full max-w-full object-contain" />
        )}

        {media.length > 1 && index < media.length - 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(i + 1, media.length - 1))}
            className="absolute right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/15 active:scale-95"
            aria-label="Next"
          >
            <ChevronRight size={20} color="#fff" />
          </button>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {media.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i === index ? "#fff" : "rgba(255,255,255,0.35)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaLightbox;
