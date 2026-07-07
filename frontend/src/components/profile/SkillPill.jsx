function SkillPill({ skill }) {
  return (
    <span className="rounded-full bg-[var(--imc-surface-2)] px-3 py-1.5 text-[10px] font-bold text-[var(--imc-indigo-text)]">
      {skill}
    </span>
  );
}

export default SkillPill;