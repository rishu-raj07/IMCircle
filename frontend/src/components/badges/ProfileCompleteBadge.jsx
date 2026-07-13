import { useState } from "react";
import { createPortal } from "react-dom";
import { Shield } from "lucide-react";

function ProfileCompleteBadge({ name = "This user", size = "md" }) {
  const [open, setOpen] = useState(false);
  const compact = size === "sm";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${name}'s profile completion badge`}
        title="Profile completed 100%"
        className={`grid shrink-0 place-items-center rounded-full bg-[var(--imc-indigo)] text-white shadow-[0_6px_14px_rgba(67,56,202,0.25)] active:scale-90 ${
          compact ? "h-5 w-5" : "h-6 w-6"
        }`}
      >
        <Shield size={compact ? 11 : 14} strokeWidth={2.5} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 px-4"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]">
              <Shield size={28} />
            </div>
            <h3 className="mt-4 text-center text-[18px] font-black text-[var(--imc-text)]">
              {name}'s profile is completed 100%
            </h3>
            <p className="mx-auto mt-2 max-w-[280px] text-center text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
              This badge appears after basic details, education, experience, and skills are all complete.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 h-12 w-full rounded-2xl bg-[var(--imc-surface-strong)] text-[13px] font-black text-[var(--imc-on-surface-strong)] active:scale-[0.99]"
            >
              Got it
            </button>
          </div>
        </div>
        , document.body
      )}
    </>
  );
}

export default ProfileCompleteBadge;
