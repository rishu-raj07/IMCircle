import { Fragment } from "react";
import { Link } from "react-router-dom";

// One combined regex with capture groups so String.split() keeps the
// matched delimiters in the result array, in order — @mention, #hashtag,
// and bare URLs all render as tappable inline elements, everything else
// stays as plain text. Deliberately does NOT touch existing markdown
// rendering elsewhere in the app; this only affects plain post/learning/
// journey/circle-post text, which was always rendered as a flat string.
const TOKEN_REGEX =
  /(@[a-z0-9_]{3,30}|#[a-z0-9_]{2,50}|https?:\/\/[^\s<]+[^\s<.,:;!?'")\]])/gi;

function shortenUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const display = `${parsed.hostname}${path}`;
    return display.length > 34 ? `${display.slice(0, 33)}…` : display;
  } catch {
    return url.length > 34 ? `${url.slice(0, 33)}…` : url;
  }
}

/**
 * Renders plain text with @mentions, #hashtags, and bare URLs as tappable
 * inline links — a drop-in replacement for rendering `{text}` directly
 * inside any existing container (preserves whitespace-pre-line / line-clamp
 * behavior on the parent since everything here stays inline).
 */
function RichText({ text = "", className = "" }) {
  if (!text) return null;

  const parts = String(text).split(TOKEN_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (/^@[a-z0-9_]{3,30}$/i.test(part)) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              to={`/profile/${encodeURIComponent(username)}`}
              onClick={(event) => event.stopPropagation()}
              className="font-black"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {part}
            </Link>
          );
        }

        if (/^#[a-z0-9_]{2,50}$/i.test(part)) {
          const tag = part.slice(1);
          return (
            <Link
              key={index}
              to={`/hashtag/${encodeURIComponent(tag.toLowerCase())}`}
              onClick={(event) => event.stopPropagation()}
              className="font-black"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {part}
            </Link>
          );
        }

        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {shortenUrl(part)}
            </a>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
}

export default RichText;
