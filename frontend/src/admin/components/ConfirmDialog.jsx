import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

// Shared confirmation modal for destructive/irreversible-feeling admin
// actions (suspend, delete, hide content, resolve/dismiss a report, etc).
// Portaled to <body> so it always renders full-screen regardless of any
// ancestor layout — same reasoning as the user-facing sheets elsewhere in
// the app (an ancestor with a CSS transform would otherwise become the
// containing block for a `position: fixed` overlay).
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#12141C]/45 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[380px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(18,20,28,0.25)]">
        <div
          className={`grid h-11 w-11 place-items-center rounded-2xl ${
            danger ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[#EEF2FF] text-[#4338CA]"
          }`}
        >
          <AlertTriangle size={20} />
        </div>

        <h2 className="mt-4 text-[17px] font-black text-[#12141C]">{title}</h2>
        {description && (
          <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[#667085]">
            {description}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl bg-[#F2F4F7] px-4 py-3 text-[13px] font-black text-[#344054] active:scale-[0.98] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-3 text-[13px] font-black text-white active:scale-[0.98] disabled:opacity-60 ${
              danger ? "bg-[#D92D20]" : "bg-[#12141C]"
            }`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
