import api from "../api/axios";

// Matches the URL portion of RichText.jsx's TOKEN_REGEX — kept identical on
// purpose so "the link that renders clickable in the text" and "the link a
// preview card gets generated for" are always the exact same match, never
// two regexes silently drifting apart.
const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,:;!?'")\]]/i;

export function extractFirstUrl(text = "") {
  const match = String(text || "").match(URL_REGEX);
  return match ? match[0] : "";
}

// Backed by GET /api/link-preview (backend/src/controllers/linkPreview.controller.js)
// — server-side OG/Twitter-card scrape with an SSRF guard and a 1hr
// in-memory cache, already used for nothing until now. Also benefits from
// axios.js's own 5-minute client-side GET cache, so re-rendering the same
// post/message (e.g. re-mounting on scroll) doesn't refetch either.
export async function fetchLinkPreview(url) {
  if (!url) return null;
  try {
    const res = await api.get("/link-preview", { params: { url } });
    return res.data?.success ? res.data.preview : null;
  } catch {
    return null;
  }
}
