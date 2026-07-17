function ProgressHeader({ title, subtitle, progress = 0, step = 1, totalSteps = 3 }) {
  return (
    <div className="sticky top-0 z-30 -mx-5 bg-[color:var(--imc-bg)] px-5 pt-[14px]">
      <div
        className="flex min-h-[58px] items-center justify-between"
        style={{ borderBottom: "1px solid var(--imc-border)" }}
      >
        <div className="w-9" />

        <div className="text-center">
          <h1
            className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]"
            style={{ color: "var(--imc-text)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-1 text-[11px] font-bold"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid h-9 min-w-9 place-items-center rounded-full border border-[rgba(67,56,202,0.18)] bg-[rgba(67,56,202,0.08)] px-2 text-[11px] font-black text-[var(--imc-indigo-text)]">
          {step}/{totalSteps}
        </div>
      </div>

      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--imc-surface-2)]"
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #2563EB 0%, var(--imc-indigo) 100%)",
          }}
        />
      </div>
    </div>
  );
}

export default ProgressHeader;
