import { CheckCircle2 } from "lucide-react";

function ProgressHeader({ title, subtitle, progress = 0, onSave, loading }) {
  return (
    <div
      className="sticky top-0 z-30 -mx-5 px-5 pt-4"
      style={{ background: "var(--imc-bg)" }}
    >
      <div
        className="flex h-[58px] items-center justify-between"
        style={{ borderBottom: "1px solid var(--imc-border)" }}
      >
        <div className="w-9" />

        <div className="text-center">
          <h1
            className="text-[23px] font-black leading-tight"
            style={{ color: "var(--imc-text)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-0.5 text-[12px] font-black"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="active:scale-95 disabled:opacity-50"
          style={{ color: "var(--imc-text)" }}
        >
          <CheckCircle2 size={34} />
        </button>
      </div>

      <div
        className="mt-3 h-1.5 w-full rounded-full"
        style={{ background: "var(--imc-border)" }}
      >
        <div
          className="h-1.5 rounded-full bg-[#EC9A1E] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressHeader;