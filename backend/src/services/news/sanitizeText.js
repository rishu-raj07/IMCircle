// Ingested RSS/API summaries routinely contain raw HTML (publishers embed
// <p>, <a>, <img>, entities, etc. in feed descriptions) — this app only
// ever displays a short plain-text excerpt, never renders it as HTML, so
// this strips tags rather than sanitizing-for-safe-rendering. No dependency
// needed for that; a full HTML sanitizer would be overkill for text that's
// never dangerouslySetInnerHTML'd on the frontend.
export function stripHtml(value = "") {
  if (typeof value !== "string") return "";

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    // Numeric HTML entities — hex (&#x2F;) and decimal (&#8217;) — are what
    // most real publisher feeds actually use for punctuation (curly
    // quotes, em-dashes) and even plain slashes inside URLs shown as text.
    // Without this, a feed's raw "&#x2F;" showed up literally instead of
    // "/" (exactly what happened with the Hacker News "text" field before
    // that source was disabled) — decoded before the named-entity table
    // below since the two don't overlap.
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    // Second tag-strip pass: an entity-encoded tag (&lt;b&gt;) only becomes
    // a literal <b> after the decoding above runs, i.e. AFTER the first
    // strip already happened — without this second pass those would slip
    // through as visible "<b>...</b>" text instead of being removed.
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value = "", maxLength = 400) {
  const text = value || "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

// Basic SSRF/scheme guard for anything ingestion is about to store as a
// clickable sourceUrl — only plain http(s) is ever accepted, and obvious
// internal/loopback hosts are rejected so a malicious or misconfigured feed
// can't get this backend (or a user's browser, via the stored link) to hit
// an internal address.
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isSafePublicUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) return false;
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("169.254.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return false;

  return true;
}
