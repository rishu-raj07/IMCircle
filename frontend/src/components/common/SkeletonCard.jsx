function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[28px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-2xl bg-[var(--imc-surface-2)]" />
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-[var(--imc-surface-2)]" />
          <div className="mt-2 h-3 w-20 rounded bg-[var(--imc-surface-2)]" />
        </div>
      </div>

      <div className="mt-4 h-3 w-full rounded bg-[var(--imc-surface-2)]" />
      <div className="mt-2 h-3 w-2/3 rounded bg-[var(--imc-surface-2)]" />
    </div>
  );
}

export default SkeletonCard;
