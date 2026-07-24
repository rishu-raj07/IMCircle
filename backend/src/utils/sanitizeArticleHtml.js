import sanitizeHtml from "sanitize-html";

// Single shared allowlist for anything stored as article HTML (community
// article bodies today; nothing else yet) — matches the frontend's
// DOMPurify allowlist in ArticleDetail.jsx so what gets sanitized on the
// way in is the same shape rendered on the way out. Deliberately excludes
// script/iframe/on* handlers/javascript: URLs by simply never allowing them
// — sanitize-html strips anything not explicitly listed.
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "blockquote", "hr", "img", "code", "pre", "span",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  img: ["src", "alt"],
};

// Only http(s)/mailto — blocks javascript:, data:, and any other scheme a
// pasted <a href> could smuggle in.
const ALLOWED_SCHEMES = ["http", "https", "mailto"];

export function sanitizeArticleHtml(html) {
  if (!html || typeof html !== "string") return "";

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: { img: ["http", "https"] },
    // Cloudinary image URLs only, in practice (the editor's own image
    // insert flow uploads there first) — but this isn't schema-enforced,
    // just sanitized for safety; any http(s) image URL is allowed through.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    disallowedTagsMode: "discard",
  });
}

export default sanitizeArticleHtml;
