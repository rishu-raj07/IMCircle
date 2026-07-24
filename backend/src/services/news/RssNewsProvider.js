import axios from "axios";
import Parser from "rss-parser";
import { BaseNewsProvider } from "./BaseNewsProvider.js";
import { stripHtml, truncate, isSafePublicUrl } from "./sanitizeText.js";

const REQUEST_TIMEOUT_MS = Number(process.env.NEWS_REQUEST_TIMEOUT_MS) || 10000;
const ITEMS_PER_SOURCE_LIMIT = Number(process.env.NEWS_ITEMS_PER_SOURCE_LIMIT) || 50;

// Every item without a resolvable image gets dropped entirely at ingestion
// (see isValidNormalizedItem in newsIngestion.service.js — a deliberate
// "every card has a real photo" product decision). That's fine for
// well-structured feeds (Times of India, NDTV, etc. all carry a proper
// <media:content>), but several of the smaller dedicated startup blogs
// (Trak.in, OfficeChai, StartupTalky) often don't embed an image in the RSS
// item at all, meaning otherwise-perfectly-good, on-topic startup stories
// were silently thrown away — the real reason "Startup Funding" kept
// coming up thin even once those feeds were fixed and returning content.
// This is a bounded last-resort: only fetches the article's og:image when
// every RSS-native method above already failed, and only up to
// MAX_OG_IMAGE_FETCHES_PER_RUN times per provider per run, so one flaky
// site can't blow up ingestion time.
const OG_IMAGE_TIMEOUT_MS = Number(process.env.NEWS_OG_IMAGE_TIMEOUT_MS) || 4000;
const MAX_OG_IMAGE_FETCHES_PER_RUN = Number(process.env.NEWS_OG_IMAGE_FETCH_LIMIT) || 15;

async function fetchOgImage(articleUrl) {
  try {
    const { data } = await axios.get(articleUrl, {
      timeout: OG_IMAGE_TIMEOUT_MS,
      responseType: "text",
      maxContentLength: 2_000_000, // don't pull down a huge page just for one <meta> tag
      headers: { "User-Agent": "IMCircleNewsBot/1.0 (+https://imcircle.com)" },
    });

    if (typeof data !== "string") return "";

    // og:image's attribute order varies by publisher (property/content can
    // appear in either order) — two patterns rather than one fragile regex.
    const match =
      data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return match?.[1] || "";
  } catch {
    // Any failure (timeout, 404, non-HTML response, blocked by the target
    // site) just means no image — never worth surfacing as an ingestion
    // error over a single story.
    return "";
  }
}

// rss-parser only auto-exposes the plain RSS 2.0 `<enclosure>` tag as
// `item.enclosure` — most Indian publisher feeds (Times of India, NDTV,
// Hindustan Times, LiveMint, etc.) actually carry their thumbnail in the
// Media RSS namespace (`<media:content>` / `<media:thumbnail>`) instead,
// which rss-parser silently drops unless explicitly told to keep it via
// `customFields`. Without this, every image comes back empty even though
// the feed genuinely has one — which is exactly what was happening before
// this was added.
const parser = new Parser({
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "User-Agent": "IMCircleNewsBot/1.0 (+https://imcircle.com)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

// Pulls a usable image URL out of whatever shape rss-parser handed back for
// a custom Media-RSS field — these come through as either a single object
// or an array of objects (because of keepArray above), each shaped like
// `{ $: { url: "...", medium: "image", width: "...", ... } }` per the
// Yahoo Media RSS spec every one of these publishers follows.
function extractMediaUrl(field) {
  const entries = Array.isArray(field) ? field : field ? [field] : [];
  for (const entry of entries) {
    const url = entry?.$?.url || entry?.url;
    if (url) return url;
  }
  return "";
}

// Last-resort fallback for feeds that embed the image directly inside the
// HTML description/content instead of a dedicated media tag — grabs the
// first <img src="..."> before stripHtml() throws all markup away.
function extractFirstImgSrc(html) {
  if (typeof html !== "string") return "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

// One instance per configured feed URL — see newsSources.config.js for the
// list this actually gets constructed with. Any standard RSS 2.0 or Atom
// feed works; nothing publisher-specific is hardcoded here.
export class RssNewsProvider extends BaseNewsProvider {
  constructor({ id, name, feedUrl, defaultCategories = [], defaultRoles = [], defaultIndustries = [] }) {
    // NOT `name || feedUrl` — a raw feed URL is a bad display name, and
    // normalizeItem()'s own `this.name || rawItem.__feedTitle || "RSS"`
    // fallback only kicks in if this.name is genuinely falsy. Leaving it
    // "" here (instead of the URL) is what lets feeds added without an
    // explicit name (e.g. via NEWS_RSS_FEEDS) correctly fall back to the
    // feed's own <title> instead of showing its URL as the source name.
    super({ id: id || `rss:${feedUrl}`, name: name || "" });
    this.feedUrl = feedUrl;
    this.defaultCategories = defaultCategories;
    this.defaultRoles = defaultRoles;
    this.defaultIndustries = defaultIndustries;
    // A fresh provider instance is constructed per ingestion run (see
    // getEnabledProviders(), called once per ingestAllNewsSources() call),
    // so this naturally resets every run rather than needing manual
    // resetting.
    this.ogImageFetchCount = 0;
  }

  async fetchLatest() {
    if (!isSafePublicUrl(this.feedUrl)) {
      throw new Error(`Refusing to fetch unsafe/invalid feed URL: ${this.feedUrl}`);
    }

    const feed = await parser.parseURL(this.feedUrl);
    return (feed?.items || []).slice(0, ITEMS_PER_SOURCE_LIMIT).map((item) => ({
      ...item,
      __feedTitle: feed?.title || this.name,
    }));
  }

  async normalizeItem(rawItem) {
    if (!rawItem?.title) return null;

    const sourceUrl = rawItem.link || rawItem.guid;
    if (!sourceUrl || !isSafePublicUrl(sourceUrl)) return null;

    const publishedRaw = rawItem.isoDate || rawItem.pubDate;
    const publishedAt = publishedRaw ? new Date(publishedRaw) : new Date();
    if (Number.isNaN(publishedAt.getTime())) return null;

    const rawSummary =
      rawItem.contentSnippet || rawItem.summary || rawItem.content || rawItem["content:encoded"] || "";

    // Tried in order of how likely each is to actually be a real photo
    // rather than a tracking pixel/icon: standard <enclosure>, then Media
    // RSS <media:content>/<media:thumbnail>, then whatever <img> the raw
    // HTML description embeds.
    let imageUrl =
      rawItem.enclosure?.url ||
      extractMediaUrl(rawItem.mediaContent) ||
      extractMediaUrl(rawItem.mediaThumbnail) ||
      extractFirstImgSrc(rawItem.content || rawItem["content:encoded"] || "");

    if (!isSafePublicUrl(imageUrl) && this.ogImageFetchCount < MAX_OG_IMAGE_FETCHES_PER_RUN) {
      this.ogImageFetchCount += 1;
      imageUrl = await fetchOgImage(sourceUrl);
    }

    return {
      title: truncate(stripHtml(rawItem.title), 300),
      summary: truncate(stripHtml(rawSummary), 500),
      sourceName: this.name || rawItem.__feedTitle || "RSS",
      sourceUrl,
      externalId: rawItem.guid || sourceUrl,
      imageUrl: isSafePublicUrl(imageUrl) ? imageUrl : "",
      publishedAt,
      defaultCategories: this.defaultCategories,
      defaultRoles: this.defaultRoles,
      defaultIndustries: this.defaultIndustries,
    };
  }
}

export default RssNewsProvider;
