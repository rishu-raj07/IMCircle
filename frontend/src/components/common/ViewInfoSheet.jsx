import { Eye, X } from "lucide-react";
import { createPortal } from "react-dom";

function ViewInfoSheet({ open, onClose, title = "Post Views" }) {
  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  // Portal to <body> so this overlay isn't affected by an ancestor card's
  // transform (active:scale/animation utilities), which would otherwise
  // make "fixed" position relative to that card instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35">
      <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
              <Eye size={19} />
            </div>

            <div>
              <h3 className="text-[17px] font-black text-[var(--imc-text)]">
                {title}
              </h3>
              <p className="text-[11px] font-semibold text-[var(--imc-text-faint)]">
                What impressions mean
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
          >
            <X size={17} />
          </button>
        </div>

        <p className="text-[14px] leading-6 text-[var(--imc-text-muted)]">
          Impressions show how many times this update appeared on someone’s
          screen in the feed.
        </p>

        <div className="mt-4 rounded-2xl bg-[var(--imc-surface-2)] p-3">
          <p className="text-[12px] font-black text-[var(--imc-text)]">
            Important
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[var(--imc-text-muted)]">
            This is not unique people yet. A refresh or repeated feed load can
            increase the number.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ViewInfoSheet;
