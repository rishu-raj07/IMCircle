import User from "../models/User.js";

const SITE_NAME = "IMCircle";
const PUBLIC_APP_URL = (process.env.CLIENT_URL || "https://imcircle.com").replace(/\/$/, "");
const DEFAULT_IMAGE = `${PUBLIC_APP_URL}/og-image.png`;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Server-rendered, crawler-friendly preview page for a profile — social
// unfurl bots (WhatsApp, LinkedIn, X, Slack, iMessage) read raw HTML
// without executing JS, so the client-side useSEO() hook (see
// frontend/src/hooks/useSEO.js) can't reach them; this endpoint is the
// "lightweight backend unfurl endpoint" that hook's own comment calls out
// as the fix. Real humans who land here get an instant JS + meta-refresh
// redirect to the actual SPA profile — this page is never meant to be
// read by a person.
//
// Wiring note: this only takes effect once whatever serves the frontend
// (CDN/edge) routes known bot user-agents for /profile/:username (or
// /@:username) to GET /api/og/profile/:username instead of the SPA shell.
// That edge rule is outside this repo — see launch/docs for the existing
// infra-follow-up pattern this project uses for that kind of gap.
export const getProfileOgPage = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: String(username || "").toLowerCase(),
      isDeleted: { $ne: true },
    }).select("fullName username avatar headline field role primaryInterest location");

    const spaUrl = `${PUBLIC_APP_URL}/profile/${encodeURIComponent(username || "")}`;

    if (!user) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(
        `<!doctype html><html><head><meta charset="utf-8"><title>${SITE_NAME}</title><meta http-equiv="refresh" content="0;url=${escapeHtml(PUBLIC_APP_URL)}"></head><body></body></html>`
      );
    }

    const name = user.fullName || user.username || "IMCircle Builder";
    const title = `${name} (@${user.username}) | ${SITE_NAME}`;
    const description =
      user.headline ||
      `${user.primaryInterest || user.field || user.role || "Building"} on IMCircle — join my Growth Circle.`;
    const image = user.avatar || DEFAULT_IMAGE;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(spaUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">
<script>window.location.replace(${JSON.stringify(spaUrl)});</script>
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(spaUrl)}">${escapeHtml(name)}'s IMCircle profile</a>&hellip;</p>
</body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    return res.status(200).send(html);
  } catch (error) {
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(
      `<!doctype html><html><head><meta charset="utf-8"><title>${SITE_NAME}</title></head><body></body></html>`
    );
  }
};
