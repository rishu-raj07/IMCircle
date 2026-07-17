import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { searchHashtags } from "../../api/hashtagApi";

// Detects a trailing "#partialtag" at the end of `value` — same
// trailing-only approach as MentionSuggestions.jsx (the composer is always
// appended-to while typing, so no caret-position tracking is needed).
function getTrailingHashtagQuery(value) {
  const match = /(?:^|\s)#([a-z0-9_]{1,50})$/i.exec(value || "");
  return match ? match[1] : null;
}

function formatUsage(count) {
  const n = Number(count) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n;
}

/**
 * Renders a compact "#hashtag" suggestion list under a composer textarea —
 * as soon as the person types "#", shows tags they (or anyone) have used
 * before that match what's typed so far, each with how many times it's
 * been used. Same drop-in shape as MentionSuggestions: pass the textarea's
 * current value + a setter, this handles its own debounced search and
 * calls `onInsert(nextValue)` when a suggestion is picked.
 */
function HashtagSuggestions({ value, onInsert }) {
  const query = getTrailingHashtagQuery(value);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await searchHashtags(query);
        const hashtags = res?.hashtags || res?.data?.hashtags || [];
        setResults(hashtags.slice(0, 6));
      } catch {
        setResults([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  if (!query || results.length === 0) return null;

  const pick = (tag) => {
    const next = value.replace(/(?:^|\s)#([a-z0-9_]{1,50})$/i, (whole) =>
      whole.startsWith(" ") ? ` #${tag} ` : `#${tag} `
    );
    onInsert(next);
    setResults([]);
  };

  return (
    <div
      className="mt-1 overflow-hidden rounded-2xl"
      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
    >
      {results.map((item) => (
        <button
          key={item._id || item.tag}
          type="button"
          onClick={() => pick(item.tag)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left active:scale-[0.99]"
        >
          <div
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}
          >
            <Hash size={14} />
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-black" style={{ color: "var(--imc-text)" }}>
              #{item.tag}
            </span>
          </span>
          <span className="shrink-0 text-[10.5px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
            {formatUsage(item.usageCount)} used
          </span>
        </button>
      ))}
    </div>
  );
}

export default HashtagSuggestions;
