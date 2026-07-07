function ProfileStrength({ percentage = 85 }) {
  const steps = [
    "Basic Info",
    "Skills",
    "Portfolio",
    "Verification",
    "References",
  ];

  return (
    <section className="rounded-3xl border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-black text-[var(--imc-text)]">
          Profile Strength
        </h2>

        <p className="text-[11px] font-bold text-[var(--imc-indigo-text)]">
          {percentage}% Complete
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-[var(--imc-surface-2)]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#4338CA] to-[#2E2A8F]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 text-center">
        {steps.map((item, index) => (
          <div key={item}>
            <span
              className={`mx-auto block h-2 w-2 rounded-full ${
                index < 3
                  ? "bg-[#059669]"
                  : index === 3
                  ? "bg-[#F59E0B]"
                  : "bg-[rgba(18,20,28,0.14)]"
              }`}
            />

            <p className="mt-1 text-[7.5px] font-bold text-[var(--imc-text-muted)]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProfileStrength;