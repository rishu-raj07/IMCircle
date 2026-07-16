import { useEffect, useState } from "react";
import { searchUsers } from "../../api/userApi";
import { getGenderAvatarIcon } from "../../utils/avatar";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getAvatarUrl(user) {
  const url = user?.avatar?.url || user?.avatar;
  if (typeof url !== "string" || !url) return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

// Detects a trailing "@partialname" at the end of `value` (the composer is
// always appended-to while typing a mention, so trailing-only is enough —
// no caret-position tracking needed, which keeps this safe to drop into
// any existing plain <textarea> without rewiring its selection handling).
function getTrailingMentionQuery(value) {
  const match = /(?:^|\s)@([a-z0-9_]{2,30})$/i.exec(value || "");
  return match ? match[1] : null;
}

/**
 * Renders a compact "@mention" suggestion list under a composer textarea.
 * Pass the textarea's current value + a setter; this component handles its
 * own debounced search and calls `onInsert(nextValue)` when a suggestion is
 * picked (replacing the trailing "@partial" with "@username ").
 */
function MentionSuggestions({ value, onInsert }) {
  const query = getTrailingMentionQuery(value);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await searchUsers(query);
        const users = res?.users || res?.data?.users || [];
        setResults(users.slice(0, 6));
      } catch {
        setResults([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  if (!query || results.length === 0) return null;

  const pick = (user) => {
    const username = user?.username;
    if (!username) return;
    const next = value.replace(/(?:^|\s)@([a-z0-9_]{2,30})$/i, (whole) =>
      whole.startsWith(" ") ? ` @${username} ` : `@${username} `
    );
    onInsert(next);
    setResults([]);
  };

  return (
    <div
      className="mt-1 overflow-hidden rounded-2xl"
      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
    >
      {results.map((user) => (
        <button
          key={user._id}
          type="button"
          onClick={() => pick(user)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left active:scale-[0.99]"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: "var(--imc-surface)" }}>
            <img
              src={getAvatarUrl(user) || getGenderAvatarIcon(user)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-black" style={{ color: "var(--imc-text)" }}>
              {user.fullName || user.username}
            </span>
            <span className="block truncate text-[10.5px] font-bold" style={{ color: "var(--imc-indigo-text)" }}>
              @{user.username}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default MentionSuggestions;
