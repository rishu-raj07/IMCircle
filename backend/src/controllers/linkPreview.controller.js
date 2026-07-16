import axios from "axios";
import dns from "dns/promises";
import net from "net";

// In-process cache only (no DB model) — link previews are cheap to
// regenerate and don't need to survive a restart; this just avoids
// re-fetching the same URL for every viewer of the same post within a
// server's lifetime.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

function getFromCache(url) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.data;
}

function setCache(url, data) {
  cache.set(url, { data, at: Date.now() });
  // Simple unbounded-growth guard — this is a preview cache, not a store
  // of record, so dropping the oldest half under pressure is fine.
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

// SSRF guard: a pasted link is fetched server-side, so without this check
// a user could point the composer at http://169.254.169.254/... (cloud
// metadata endpoints) or an internal service and have this backend fetch
// it on their behalf. Only http(s) with a publicly-resolvable host is
// allowed.
async function assertSafeUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https links are supported.");
  }

  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (addresses.length === 0) {
    throw new Error("Could not resolve that link.");
  }
  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("That link isn't allowed.");
  }
}

function extractMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return "";
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function resolveUrl(base, maybeRelative) {
  if (!maybeRelative) return "";
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return "";
  }
}

// Paste-a-link -> LinkedIn-style unfurl card (title/description/image/site).
// Works for any page that sets standard OG/Twitter meta tags, which covers
// YouTube, GitHub, Product Hunt, most blogs, and IMCircle's own pages.
export const unfurlUrl = async (req, res) => {
  try {
    const rawUrl = String(req.query.url || req.body?.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, message: "A url is required." });
    }

    const cached = getFromCache(rawUrl);
    if (cached) {
      return res.status(200).json({ success: true, preview: cached, cached: true });
    }

    await assertSafeUrl(rawUrl);

    const response = await axios.get(rawUrl, {
      timeout: 6000,
      maxContentLength: 2 * 1024 * 1024,
      maxRedirects: 3,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IMCircleLinkPreview/1.0; +https://imcircle.com)",
        Accept: "text/html",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = String(response.data || "");
    const finalUrl = response.request?.res?.responseUrl || rawUrl;

    const preview = {
      url: rawUrl,
      title: extractMeta(html, "og:title") || extractTitleTag(html) || finalUrl,
      description: extractMeta(html, "og:description") || extractMeta(html, "description"),
      image: resolveUrl(finalUrl, extractMeta(html, "og:image") || extractMeta(html, "twitter:image")),
      siteName: extractMeta(html, "og:site_name") || new URL(finalUrl).hostname.replace(/^www\./, ""),
    };

    setCache(rawUrl, preview);

    res.status(200).json({ success: true, preview, cached: false });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: "Couldn't generate a preview for that link.",
      preview: null,
    });
  }
};
