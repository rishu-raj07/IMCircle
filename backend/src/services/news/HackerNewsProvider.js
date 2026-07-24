import axios from "axios";
import { BaseNewsProvider } from "./BaseNewsProvider.js";
import { stripHtml, truncate } from "./sanitizeText.js";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";
const REQUEST_TIMEOUT_MS = Number(process.env.NEWS_REQUEST_TIMEOUT_MS) || 10000;
const ITEMS_PER_SOURCE_LIMIT = Number(process.env.NEWS_ITEMS_PER_SOURCE_LIMIT) || 50;

// Official, free, no-API-key Hacker News API — good real-world source for
// startup/tech/AI stories (Founder/Creator personas). No article scraping:
// only the story's own title + outbound link are used, same as HN's own
// front page does.
export class HackerNewsProvider extends BaseNewsProvider {
  constructor() {
    super({ id: "hackernews", name: "Hacker News" });
  }

  async fetchLatest() {
    const { data: topIds } = await axios.get(`${HN_BASE}/topstories.json`, {
      timeout: REQUEST_TIMEOUT_MS,
    });

    const ids = (Array.isArray(topIds) ? topIds : []).slice(0, ITEMS_PER_SOURCE_LIMIT);

    // Fetched with limited concurrency (5 at a time) rather than
    // Promise.all on all 50 at once — friendlier to HN's shared public
    // Firebase-backed API, and one slow/failed item fetch doesn't need to
    // block the rest.
    const items = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((id) =>
          axios.get(`${HN_BASE}/item/${id}.json`, { timeout: REQUEST_TIMEOUT_MS })
        )
      );

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.data) {
          items.push(result.value.data);
        }
      });
    }

    return items;
  }

  normalizeItem(rawItem) {
    if (!rawItem || rawItem.type !== "story" || rawItem.dead || rawItem.deleted) return null;
    if (!rawItem.title) return null;

    // "Ask HN" / "Show HN" posts have no external url — point at the HN
    // discussion itself instead of dropping them.
    const sourceUrl = rawItem.url || `https://news.ycombinator.com/item?id=${rawItem.id}`;

    return {
      title: truncate(stripHtml(rawItem.title), 300),
      summary: truncate(
        stripHtml(rawItem.text || "") ||
          `${rawItem.score || 0} points · ${rawItem.descendants || 0} comments on Hacker News`,
        500
      ),
      sourceName: "Hacker News",
      sourceUrl,
      externalId: String(rawItem.id),
      imageUrl: "",
      publishedAt: rawItem.time ? new Date(rawItem.time * 1000) : new Date(),
      score: rawItem.score || 0,
      commentCount: rawItem.descendants || 0,
    };
  }
}

export default HackerNewsProvider;
