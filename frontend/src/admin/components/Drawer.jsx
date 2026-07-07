import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Shared right-side detail drawer (user / content / report). Portaled to
// <body> for the same reason as ConfirmDialog — keeps it a true full-height
// overlay no matter where it's rendered from in the tree.
export default function Drawer({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[190] flex justify-end bg-[#12141C]/40 backdrop-blur-[2px]">
      {/* Click-outside-to-close backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="relative flex h-full w-full max-w-[440px] flex-col bg-white shadow-[-24px_0_60px_rgba(18,20,28,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#EAECF0] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-black text-[#12141C]">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-[12px] font-bold text-[#667085]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F2F4F7] text-[#344054] active:scale-95"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-[#EAECF0] px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
