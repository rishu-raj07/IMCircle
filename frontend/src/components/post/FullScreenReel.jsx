import { X } from "lucide-react";

// Shared full-screen chrome for the single-item reel view — just a close
// button over a fixed, viewport-height black backdrop. The actual content
// (PostReelSlide or JourneyReelSlide) is passed in as children so this stays
// a thin wrapper rather than a second copy of the reel UI.
//
// z-index has to stay BELOW 120: CommentSheet and RepostSheet (opened from
// inside the reel) are both fixed, viewport-level overlays at z-[120], and
// since they don't live inside this component's own stacking context they
// need a strictly higher z-index than it to ever be visible on top of it —
// at z-[999] they were rendering behind the reel, present in the DOM with
// correct geometry but fully hidden, which is why comment/repost looked
// "broken" even though the click handlers were firing correctly.
function FullScreenReel({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-[110]" style={{ background: "#000" }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 z-[10] grid h-9 w-9 place-items-center rounded-full active:scale-95"
        style={{
          background: "rgba(255,255,255,0.14)",
          // This overlay draws under the status bar/notch (true full-bleed
          // video), so the close button needs its own safe-area offset —
          // `env()` is 0 on devices without a notch, so `calc(0.75rem + 0)`
          // still lands at the original top-3 position there.
          top: "calc(0.75rem + env(safe-area-inset-top))",
        }}
      >
        <X size={18} color="#fff" />
      </button>

      <div
        className="mx-auto w-full max-w-[430px]"
        style={{ height: "100dvh" }}
      >
        {children}
      </div>
    </div>
  );
}

export default FullScreenReel;
