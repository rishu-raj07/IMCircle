function Pagination({ page = 1, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={onPrev}
        className="h-11 flex-1 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-indigo-text)]"
      >
        Previous
      </button>

      <span className="text-[13px] font-black text-[var(--imc-text-muted)]">
        Page {page}
      </span>

      <button
        onClick={onNext}
        className="h-11 flex-1 rounded-2xl bg-[#12141C] text-[13px] font-black text-white"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
