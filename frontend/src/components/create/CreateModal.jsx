import {
  BriefcaseBusiness,
  FolderKanban,
  PenLine,
  Rocket,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function CreateModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  const goTo = (path) => {
    onClose?.();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-[var(--imc-surface)] px-5 pb-7 pt-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[19px] font-black text-[var(--imc-text)]">Create</h2>
            <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
              Share, build or find opportunities
            </p>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <Option icon={<PenLine />} title="Create Post" onClick={() => goTo("/create-post")} />
          <Option icon={<Rocket />} title="Journey Update" onClick={() => goTo("/create-journey")} />
          <Option icon={<BriefcaseBusiness />} title="Create Opportunity" onClick={() => goTo("/create-opportunity")} />
          <Option icon={<FolderKanban />} title="Create Project" onClick={() => goTo("/create-project")} />
        </div>
      </div>
    </div>
  );
}

function Option({ icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] p-4 text-left"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <span className="text-[14px] font-black text-[var(--imc-text)]">{title}</span>
    </button>
  );
}

export default CreateModal;