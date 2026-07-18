import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Repeat2, Send, X } from "lucide-react";

import { currentUser } from "../../store/authStore";
import { canPublishContent } from "../../utils/sessionUser";
import PublishGateModal from "./PublishGateModal";

function RepostSheet({
  open,
  onClose,
  title = "Repost",
  previewTitle = "Feed update",
  previewText = "",
  onRepost,
  onRepostWithThought,
}) {
  const [thought, setThought] = useState("");
  const [posting, setPosting] = useState(false);
  // Only "Repost with Thought" is a real publish action (new authored text
  // reaching the feed) — a plain "Repost to Feed" is closer to a share/like
  // and is never gated. See canPublishContent() in utils/sessionUser.js.
  const [showPublishGate, setShowPublishGate] = useState(false);

  useEffect(() => {
    if (!open) {
      setThought("");
      setPosting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleDirect = async () => {
    if (posting) return;

    try {
      setPosting(true);

      await onRepost?.({
        text: "",
        repostText: "",
        caption: "",
        quote: "",
        withThought: false,
      });

      setThought("");
      onClose?.();
    } finally {
      setPosting(false);
    }
  };

  const handleWithThought = async () => {
    const cleanThought = thought.trim();

    if (posting || !cleanThought) return;

    if (!canPublishContent(currentUser())) {
      setShowPublishGate(true);
      return;
    }

    try {
      setPosting(true);

      await onRepostWithThought?.({
        text: cleanThought,
        repostText: cleanThought,
        caption: cleanThought,
        quote: cleanThought,
        withThought: true,
      });

      setThought("");
      onClose?.();
    } finally {
      setPosting(false);
    }
  };

  // Portal to <body> so this overlay isn't affected by an ancestor card's
  // transform (active:scale/animation utilities), which would otherwise
  // make "fixed" position relative to that card instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35">
      <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-black text-[var(--imc-text)]">{title}</h3>
            <p className="text-[11px] font-semibold text-[var(--imc-text-faint)]">
              Share this update with your network
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="rounded-3xl border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface-2)] p-3">
          <p className="text-[12px] font-black text-[var(--imc-text)]">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-3 text-[12px] leading-5 text-[var(--imc-text-muted)]">
            {previewText || "Shared on IMCircle"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDirect}
          disabled={posting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4338CA] py-3 text-[13px] font-black text-white disabled:opacity-50"
        >
          <Repeat2 size={17} />
          {posting ? "Reposting..." : "Repost to Feed"}
        </button>

        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Add your thought..."
          maxLength={500}
          className="mt-3 h-24 w-full resize-none rounded-2xl border border-[rgba(18,20,28,0.12)] p-3 text-[13px] font-semibold outline-none focus:border-[#4338CA]"
        />

        <div className="mt-1 text-right text-[10px] font-bold text-[var(--imc-text-faint)]">
          {thought.length}/500
        </div>

        <button
          type="button"
          onClick={handleWithThought}
          disabled={!thought.trim() || posting}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#12141C] py-3 text-[13px] font-black text-white disabled:opacity-40"
        >
          <Send size={17} />
          {posting ? "Reposting..." : "Repost with Thought"}
        </button>
      </div>

      <PublishGateModal
        open={showPublishGate}
        onClose={() => setShowPublishGate(false)}
      />
    </div>,
    document.body
  );
}

export default RepostSheet;