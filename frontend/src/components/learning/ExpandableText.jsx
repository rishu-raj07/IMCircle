import { useLayoutEffect, useRef, useState } from "react";

// Clamps body text to `maxLines` and animates open/closed on Read
// More/Collapse. Height (not `line-clamp` alone) is what's animated, since
// -webkit-line-clamp can't be transitioned — this measures the collapsed
// pixel height once via line-height * maxLines, and the full height via
// scrollHeight, then animates between the two with the .imc-expand CSS
// transition (index.css), which already respects prefers-reduced-motion.
function ExpandableText({ text, maxLines = 7, className = "" }) {
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [heights, setHeights] = useState({ collapsed: null, full: null });

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const collapsed = Math.ceil(lineHeight * maxLines);
    const full = el.scrollHeight;

    setHeights({ collapsed, full });
    setClamped(full > collapsed + 2);
    setExpanded(false);
  }, [text, maxLines]);

  if (!text) return null;

  const maxHeight =
    heights.collapsed == null
      ? undefined
      : expanded
      ? heights.full
      : Math.min(heights.collapsed, heights.full ?? heights.collapsed);

  return (
    <div>
      <div
        className="imc-expand overflow-hidden"
        style={maxHeight != null ? { maxHeight } : undefined}
      >
        <p
          ref={textRef}
          className={`whitespace-pre-wrap break-words ${className}`}
        >
          {text}
        </p>
      </div>

      {clamped ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-[12.5px] font-black text-[var(--imc-indigo-text)] active:opacity-70"
        >
          {expanded ? "Collapse" : "Read More"}
        </button>
      ) : null}
    </div>
  );
}

export default ExpandableText;
