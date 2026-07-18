import { useNavigate } from "react-router-dom";

// Shared "finish your profile before publishing" gate — used by every
// publish action (posts, journey updates, learning posts, reposts with a
// thought). Deliberately NOT used to gate browsing, liking, replying,
// following, circle requests, search, or messages — those all stay fully
// open the instant a person finishes the mandatory name+username step. See
// canPublishContent() in utils/sessionUser.js for the actual check this
// modal responds to.
export default function PublishGateModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-t-[24px] bg-[var(--imc-surface)] p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:rounded-[24px]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-[var(--imc-text)]">
          Complete your profile before publishing
        </h2>
        <p className="mt-2 text-[13px] font-medium leading-5 text-[var(--imc-text-muted)]">
          Add your tagline, interests and location so people can understand
          your journey and discover your content.
        </p>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[13.5px] font-black text-[var(--imc-text)] active:scale-[0.98]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile-setup")}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[rgba(67,56,202,0.24)] bg-[var(--imc-indigo)] text-[13.5px] font-black text-white active:scale-[0.98]"
          >
            Complete profile
          </button>
        </div>
      </div>
    </div>
  );
}
