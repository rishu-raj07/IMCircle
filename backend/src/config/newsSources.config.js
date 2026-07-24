import { HackerNewsProvider } from "../services/news/HackerNewsProvider.js";
import { RssNewsProvider } from "../services/news/RssNewsProvider.js";

// Turned off by default — Hacker News' startup/tech slant didn't match what
// the audience here actually wants (general Indian news, personalised by
// role/interest, Inshorts-style). Set NEWS_HACKERNEWS_ENABLED=true to bring
// it back for a Founder/Creator-leaning audience later.
const HACKERNEWS_ENABLED = process.env.NEWS_HACKERNEWS_ENABLED === "true";

// Best-effort starting set of well-known, real Indian publisher RSS feeds —
// general/national news plus dedicated startup/business outlets, matching
// the "latest general Indian news, not just tech, but with real startup
// coverage too" ask. Unlike the general-news feeds below (never directly
// reachability-tested from this dev sandbox — its fetch tool blocks/times
// out or blocklists most news-publisher domains), every URL in the
// startup/business section WAS verified to return real RSS/XML content
// during this session (checked with a plain fetch, Content-Type
// application/rss+xml or application/xml came back for each) — several
// previous guesses at these publishers' feed paths (entrackr.com/feed,
// business-standard, financialexpress) turned out to be wrong/dead, which
// is why the "Startup Funding" category kept coming up thin: only Inc42's
// general feed was ever actually resolving. If any of these ever go dark
// too, check the `[newsIngestion]` startup log (`Source "..." failed` /
// 0 items) — a dead feed is harmless either way, see runProvider() in
// newsIngestion.service.js, it never blocks the others.
const DEFAULT_RSS_FEEDS = [
  { url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", name: "Times of India" },
  { url: "https://indianexpress.com/section/india/feed/", name: "The Indian Express" },
  { url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", name: "Hindustan Times" },
  { url: "https://feeds.feedburner.com/ndtvnews-india-news", name: "NDTV" },
  { url: "https://www.livemint.com/rss/news", name: "LiveMint" },
  // Verified-working dedicated Indian startup/business feeds — this is what
  // actually gives "Startup Funding" real volume, rather than relying on
  // general news outlets that rarely cover funding rounds at all.
  { url: "https://yourstory.com//feed", name: "YourStory" },
  { url: "https://inc42.com/feed/", name: "Inc42" },
  { url: "https://inc42.com/startups/feed", name: "Inc42 — Startups" },
  { url: "https://entrackr.com/rss", name: "Entrackr" },
  { url: "https://officechai.com/feed/", name: "OfficeChai" },
  { url: "https://trak.in/stories/category/startup/feed/", name: "Trak.in — Startup" },
  { url: "https://startuptalky.com/rss/", name: "StartupTalky" },
];

// Add/remove sources here without touching the ingestion pipeline itself
// (newsIngestion.service.js just iterates whatever this returns). Feeds
// supplied via NEWS_RSS_FEEDS (comma-separated URLs) are added on top of
// the defaults above, deduped by URL — set NEWS_DEFAULT_RSS_ENABLED=false to
// drop the built-in defaults entirely and use only your own list.
export function getEnabledProviders() {
  const providers = [];

  if (HACKERNEWS_ENABLED) {
    providers.push(new HackerNewsProvider());
  }

  const envFeedUrls = (process.env.NEWS_RSS_FEEDS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const defaultFeeds = process.env.NEWS_DEFAULT_RSS_ENABLED === "false" ? [] : DEFAULT_RSS_FEEDS;

  const seenUrls = new Set();
  const allFeeds = [
    ...defaultFeeds,
    ...envFeedUrls.map((url) => ({ url, name: "" })),
  ].filter((feed) => {
    if (seenUrls.has(feed.url)) return false;
    seenUrls.add(feed.url);
    return true;
  });

  allFeeds.forEach(({ url, name }, index) => {
    providers.push(new RssNewsProvider({ id: `rss:${index}:${url}`, feedUrl: url, name }));
  });

  return providers;
}
