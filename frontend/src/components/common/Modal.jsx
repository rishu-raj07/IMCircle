import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

function Modal({ open, onClose, title, children }) {
  // Keyboard users had no way to dismiss this modal — clicking the backdrop
  // or the X button were the only exits. Escape is the standard convention
  // for closing an overlay; hook must run unconditionally (before the
  // `!open` early return below) since hooks can't be called conditionally.
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Rendered via a portal straight into <body> — cards further up the tree
  // use active:scale/animation utilities that apply a CSS transform, and
  // ANY ancestor with a transform makes itself the containing block for
  // `position: fixed` descendants. Nested inside one, this modal would be
  // fixed relative to that card instead of the viewport (rendering inline
  // and clipped instead of as a full-screen overlay). A portal sidesteps
  // that entirely.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#12141C]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-[var(--imc-surface-2)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[19px] font-semibold text-[var(--imc-text)]">{title}</h2>

          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--imc-surface)] ring-1 ring-[rgba(18,20,28,0.08)] active:scale-95"
          >
            <X size={18} className="text-[var(--imc-text)]" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
