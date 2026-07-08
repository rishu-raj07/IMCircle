// Presentational-only callout used inside the Learning reader card whenever
// extractLessonHighlight() finds a "Lesson / Key takeaway / Today's
// learning" opener in the body text. Kept as its own component so it can be
// reused anywhere a learning preview renders (feed cards, share previews)
// without pulling in the rest of LearningView.

function LessonHighlight({ label, text }) {
  if (!text) return null;

  return (
    <div
      className="rounded-2xl bg-[var(--imc-marigold-tint)] px-4 py-3.5"
      style={{ border: "1px solid color-mix(in srgb, var(--imc-marigold) 35%, transparent)" }}
    >
      <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.6px] text-[var(--imc-marigold-dark)]">
        <span aria-hidden="true">💡</span>
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[16px] font-medium leading-[1.4] text-[var(--imc-ink)]">
        {text}
      </p>
    </div>
  );
}

export default LessonHighlight;
