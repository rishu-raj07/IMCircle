import LessonHighlight from "./LessonHighlight";
import ExpandableText from "./ExpandableText";
import { extractLessonHighlight } from "./lessonHighlight";

// The floating "glass" reading card that sits over the bottom edge of the
// hero image — the centerpiece of the Learning View redesign. Replaces the
// old approach of stamping the full caption directly over the photo.
function LearningReaderCard({ title, text, tags = [] }) {
  const { highlight, body } = extractLessonHighlight(text);

  return (
    <div
      className="relative z-10 -mt-9 rounded-[20px] border border-[var(--imc-border)] p-5 shadow-[0_18px_44px_rgba(18,20,28,0.10)] backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--imc-surface) 86%, transparent)" }}
    >
      {tags.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--imc-surface-2)] px-2.5 py-1 text-[10px] font-black text-[var(--imc-text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {title ? (
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.8px] text-[var(--imc-text-faint)]">
          {title}
        </p>
      ) : null}

      {highlight ? (
        <div className={body ? "mb-3.5" : ""}>
          <LessonHighlight label={highlight.label} text={highlight.text} />
        </div>
      ) : null}

      {body || !highlight ? (
        <ExpandableText
          text={body || text}
          maxLines={7}
          className="text-[16px] font-medium leading-[1.55] text-[var(--imc-text)]"
        />
      ) : null}
    </div>
  );
}

export default LearningReaderCard;
