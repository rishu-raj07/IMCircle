import NewsItem, { buildContentHash } from "../../models/NewsItem.js";
import { getEnabledProviders } from "../../config/newsSources.config.js";
import { classifyNewsItem, isUrgent } from "./newsClassifier.js";
import { isSafePublicUrl } from "./sanitizeText.js";
import { notifyUsersForNewNews } from "./newsNotification.service.js";

const NOTIFICATION_THRESHOLD =
  Number(process.env.NEWS_IMMEDIATE_NOTIFICATION_THRESHOLD) || 75;

// A publishedAt more than this far in the future is almost certainly a bad
// feed timestamp (bad timezone math, a placeholder date), not a real
// future-dated story — reject rather than store something that would sort
// above genuinely current content indefinitely.
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

function scoreItem({ normalized, classification }) {
  const urgent = isUrgent(normalized);

  // Hacker News items carry their own signal (score/commentCount); other
  // providers don't, so this only ever adds on top of a neutral baseline —
  // never penalizes a source for lacking a field it was never going to
  // have.
  const engagementScore = Math.min(
    Math.round((normalized.score || 0) / 2) + Math.round((normalized.commentCount || 0) / 5),
    40
  );

  const categoryWeight = classification.categories.some((category) =>
    ["Startup", "Government Schemes", "Education", "Career"].includes(category)
  )
    ? 15
    : 0;

  const qualityScore = Math.min(40 + engagementScore, 100);
  const importanceScore = Math.min(
    (urgent ? 35 : 0) + categoryWeight + engagementScore,
    100
  );

  return {
    qualityScore,
    importanceScore,
    isBreaking: urgent && categoryWeight > 0,
    isNotificationEligible: importanceScore >= NOTIFICATION_THRESHOLD,
  };
}

function toNewsItemDoc({ normalized, providerId }) {
  const classification = classifyNewsItem(normalized);
  const scores = scoreItem({ normalized, classification });

  const categories = [
    ...new Set([...(normalized.defaultCategories || []), ...classification.categories]),
  ];
  const roles = [...new Set([...(normalized.defaultRoles || []), ...classification.roles])];
  const industries = [
    ...new Set([...(normalized.defaultIndustries || []), ...classification.industries]),
  ];

  return {
    type: categories.includes("Startup")
      ? "funding"
      : categories.includes("Government Schemes")
      ? "announcement"
      : "news",
    title: normalized.title,
    normalizedTitle: normalized.title.toLowerCase().replace(/\s+/g, " ").trim(),
    summary: normalized.summary,
    sourceName: normalized.sourceName,
    sourceUrl: normalized.sourceUrl,
    providerId,
    externalId: normalized.externalId || "",
    contentHash: buildContentHash({
      sourceName: normalized.sourceName,
      externalId: normalized.externalId,
      sourceUrl: normalized.sourceUrl,
      title: normalized.title,
    }),
    imageUrl: normalized.imageUrl || "",
    publishedAt: normalized.publishedAt,
    categories,
    roles,
    industries,
    locations: normalized.locations || [],
    keywords: classification.keywords,
    ...scores,
    status: "active",
  };
}

function isValidNormalizedItem(normalized) {
  if (!normalized) return false;
  if (!normalized.title || !normalized.title.trim()) return false;
  if (!isSafePublicUrl(normalized.sourceUrl)) return false;
  if (!(normalized.publishedAt instanceof Date) || Number.isNaN(normalized.publishedAt.getTime())) {
    return false;
  }
  if (normalized.publishedAt.getTime() - Date.now() > MAX_FUTURE_SKEW_MS) return false;
  // Every card in the feed shows an image (Inshorts-style — see NewsCard.jsx)
  // — rather than a mix of real photos and a generic placeholder icon for
  // whichever items happen to lack one, items without a resolvable image
  // are skipped at ingestion entirely. This does mean fewer items get
  // stored per run (some publisher entries genuinely have no image), but
  // every item that DOES make it into the feed is guaranteed to look right.
  if (!normalized.imageUrl || !isSafePublicUrl(normalized.imageUrl)) return false;
  return true;
}

async function runProvider(provider) {
  const summary = { providerId: provider.id, fetched: 0, stored: 0, skipped: 0, error: null };
  // Only items genuinely new this run (not a re-ingested dupe of something
  // already stored) — this is what notifyUsersForNewNews gets fed, so a
  // routine re-sync of unchanged sources never re-notifies anyone.
  const newlyStored = [];

  try {
    const rawItems = await provider.fetchLatest();
    summary.fetched = Array.isArray(rawItems) ? rawItems.length : 0;

    for (const rawItem of rawItems || []) {
      let normalized;
      try {
        // await works fine whether a given provider's normalizeItem is
        // sync (HackerNewsProvider) or async (RssNewsProvider, which may
        // fall back to fetching the article page for its og:image) — no
        // need to special-case either.
        normalized = await provider.normalizeItem(rawItem);
      } catch {
        summary.skipped += 1;
        continue;
      }

      if (!isValidNormalizedItem(normalized)) {
        summary.skipped += 1;
        continue;
      }

      const doc = toNewsItemDoc({ normalized, providerId: provider.id });

      try {
        // Upsert on the dedupe hash, never overwriting an existing row —
        // re-ingesting the same story (scheduler retry, or two providers
        // surfacing the same link) is a no-op, and this never clobbers
        // fields an admin or a later notification pass may have changed
        // (isNotificationEligible, status, etc).
        const result = await NewsItem.updateOne(
          { contentHash: doc.contentHash },
          { $setOnInsert: doc },
          { upsert: true }
        );
        if (result.upsertedCount > 0 || result.upsertedId) {
          summary.stored += 1;
          newlyStored.push({ ...doc, _id: result.upsertedId });
        }
      } catch (error) {
        // Duplicate-key race under concurrent ingestion runs is expected
        // and harmless (see contentHash's unique index) — only genuinely
        // unexpected errors are worth logging.
        if (error?.code !== 11000) {
          console.error(`[newsIngestion] Failed to store item from ${provider.id}:`, error?.message);
        }
        summary.skipped += 1;
      }
    }
  } catch (error) {
    summary.error = error?.message || "Unknown error";
  }

  return { summary, newlyStored };
}

/**
 * Runs every enabled provider independently (Promise.allSettled — one dead
 * source never blocks the others) and stores validated, deduped, classified
 * items. Safe to call repeatedly (e.g. from the cron scheduler and once
 * eagerly on server boot) — re-ingesting already-seen items is a no-op.
 */
export async function ingestAllNewsSources() {
  const providers = getEnabledProviders();
  const runs = await Promise.all(providers.map((provider) => runProvider(provider)));

  const results = runs.map((r) => r.summary);
  const allNewlyStored = runs.flatMap((r) => r.newlyStored);

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      stored: acc.stored + r.stored,
      skipped: acc.skipped + r.skipped,
    }),
    { fetched: 0, stored: 0, skipped: 0 }
  );

  console.log(
    `[newsIngestion] Run complete — ${totals.stored} new / ${totals.fetched} fetched across ${providers.length} source(s).`
  );
  results.forEach((r) => {
    if (r.error) console.warn(`[newsIngestion] Source "${r.providerId}" failed: ${r.error}`);
  });

  // Fire-and-forget from the caller's perspective — a notification failure
  // must never make the ingestion run itself look failed, so errors are
  // caught and logged here rather than propagated.
  try {
    const { notified } = await notifyUsersForNewNews(allNewlyStored);
    if (notified > 0) {
      console.log(`[newsIngestion] Sent ${notified} personalised news notification(s).`);
    }
  } catch (error) {
    console.error("[newsIngestion] notifyUsersForNewNews failed:", error?.message);
  }

  return { totals, sources: results };
}
