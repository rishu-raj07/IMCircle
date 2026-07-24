import mongoose from "mongoose";
import NewsItem, { ARTICLE_TYPES } from "../models/NewsItem.js";
import NewsInteraction from "../models/NewsInteraction.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

// Same base64url(JSON) cursor convention as feed.controller.js's
// encode/decodeCursor — keyed on publishedAt since every News query sorts
// by that within its tier (see "tier" below). `tier` distinguishes "still
// paging through this user's matched/personalised items" from "have moved
// on to the general pool" — see getForYouNews.
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null;

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const date = new Date(decoded.publishedAt);
    if (!decoded.id || Number.isNaN(date.getTime()) || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return null;
    }
    return {
      publishedAt: date,
      id: decoded.id,
      tier: decoded.tier === "general" ? "general" : "matched",
    };
  } catch {
    return null;
  }
}

function encodeCursor(item, tier) {
  if (!item?._id || !item?.publishedAt) return null;
  return Buffer.from(
    JSON.stringify({ publishedAt: item.publishedAt, id: String(item._id), tier }),
    "utf8"
  ).toString("base64url");
}

function cursorInequality(parsed) {
  if (!parsed) return {};

  // Latest-first pagination WITHIN a tier: everything strictly older than
  // the cursor item, with the id as a tie-breaker for items sharing the
  // exact same publishedAt timestamp (common with ingested batches).
  return {
    $or: [
      { publishedAt: { $lt: parsed.publishedAt } },
      { publishedAt: parsed.publishedAt, _id: { $lt: parsed.id } },
    ],
  };
}

function cursorQuery(cursor) {
  return cursorInequality(decodeCursor(cursor));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NEWS_PROJECTION = "-normalizedTitle -contentHash -providerId -__v";

// The actual "interest based" signal (Part 17) — everything a user's
// profile already carries that ingestion also tags items with (see
// newsClassifier.js).
//
// Deliberately NOT `user.role` — there is currently no live onboarding step
// or profile screen that lets anyone actually choose it (confirmed: no
// "role" field is ever submitted by ProfileSetup.jsx/BasicInfo.jsx, and the
// one frontend screen with a role picker, EditProfile.jsx, isn't wired to
// any route or API call). Every account is therefore stuck at the schema
// default `"Student"` regardless of what the person actually is, which
// previously caused Student-tagged content to leak into every feed and get
// mislabeled "Relevant because you're a Student" for founders, freelancers,
// everyone. This exact root cause (role default masquerading as a real
// signal) was already diagnosed and fixed once in profile.controller.js's
// `isStudentUser()` — same fix applied here: only `primaryInterest` (the
// actual onboarding chip: Startup/Career/Student/AI & Tech/.../Other) and
// `field` (excluding its own default "Other") count as real signals.
function buildMatchFilter(user) {
  const or = [];

  if (user?.field && user.field !== "Other") or.push({ industries: user.field });

  if (user?.primaryInterest?.trim()) {
    const pattern = new RegExp(escapeRegExp(user.primaryInterest.trim()), "i");
    or.push({ categories: pattern });
    or.push({ keywords: pattern });
  }

  return or.length ? { $or: or } : null;
}

function getLimit(req) {
  const requested = Number(req.query.limit);
  if (!Number.isFinite(requested)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.round(requested), 1), MAX_LIMIT);
}

// Short, human-readable "why this is relevant" line for the card (Part 7)
// — purely explanatory, computed from the same signals buildMatchFilter
// uses (field + primaryInterest — NOT user.role, see that function's
// comment for why). Never reorders anything; recency ordering is untouched.
function buildRelevanceReason(item, user) {
  const matchedIndustry =
    user?.field && user.field !== "Other" && (item.industries || []).includes(user.field);
  const matchedInterest =
    user?.primaryInterest?.trim() &&
    (item.categories || []).some((category) =>
      category.toLowerCase().includes(user.primaryInterest.toLowerCase())
    );

  const reasons = [];
  if (matchedInterest) reasons.push(`your interest in ${user.primaryInterest}`);
  if (matchedIndustry) reasons.push(`${user.field}`);
  if (!reasons.length) {
    // "General" is real and counted internally (see the classifier's
    // default when nothing else matches), but showing "Tagged under
    // General" reads as a non-answer rather than a reason — better to show
    // nothing than a label that means "we don't actually know why."
    const firstRealCategory = (item.categories || []).find(
      (category) => category.toLowerCase() !== "general"
    );
    return firstRealCategory ? `Tagged under ${firstRealCategory}.` : "";
  }

  return `Relevant because of ${reasons.join(" and ")}.`;
}

async function attachViewerState(items, userId) {
  if (!items.length) return items;

  const interactions = await NewsInteraction.find({
    user: userId,
    newsItem: { $in: items.map((item) => item._id) },
  }).select("newsItem saved shared notInterested opened");

  const byNewsId = new Map(interactions.map((i) => [String(i.newsItem), i]));

  return items.map((item) => {
    const interaction = byNewsId.get(String(item._id));
    return {
      ...item.toObject(),
      viewerState: {
        saved: Boolean(interaction?.saved),
        shared: Boolean(interaction?.shared),
        notInterested: Boolean(interaction?.notInterested),
        opened: Boolean(interaction?.opened),
      },
    };
  });
}

async function getHiddenNewsIds(userId) {
  const hidden = await NewsInteraction.find({ user: userId, notInterested: true }).select("newsItem");
  return hidden.map((i) => i.newsItem);
}

// Hacker News is off in newsSources.config.js (no longer ingested going
// forward), but that alone doesn't remove rows it already stored before it
// was turned off — those stay in the collection until something deletes
// them. Excluding by providerId here at the query level means old Hacker
// News rows stop appearing immediately, in every environment, without
// depending on anyone remembering to run a cleanup script first (see
// backend/scripts/removeHackerNewsItems.js for that, if you want the rows
// gone from the database entirely rather than just hidden from the feed).
const EXCLUDED_PROVIDER_IDS = ["hackernews"];

// GET /news/articles — long-form/explanatory content only, plain
// latest-first (Articles is filtered by the category chips instead of
// role/interest matching — see News.jsx).
export const getArticles = async (req, res) => {
  try {
    const limit = getLimit(req);
    const category = (req.query.category || "").trim();

    const filter = {
      status: "active",
      type: { $in: ARTICLE_TYPES },
      providerId: { $nin: EXCLUDED_PROVIDER_IDS },
      ...cursorQuery(req.query.cursor),
      _id: { $nin: await getHiddenNewsIds(req.user._id) },
    };

    if (category && category.toLowerCase() !== "all") {
      filter.categories = category;
    }

    const rows = await NewsItem.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .limit(limit + 1)
      .select(NEWS_PROJECTION);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const withViewerState = await attachViewerState(page, req.user._id);
    const items = withViewerState.map((item) => ({
      ...item,
      relevanceReason: buildRelevanceReason(item, req.user),
    }));

    return res.json({
      success: true,
      items,
      hasMore,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1], "general") : null,
    });
  } catch (error) {
    console.error("[news.controller] getArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load articles" });
  }
};

// GET /news/for-you — everything except long-form Articles, genuinely
// filtered by the user's industry/interest (Part 17). Product decision:
// this ONLY shows matched content when the user has a real signal (a
// chosen interest chip and/or a non-default field) — no unrelated
// "General" items mixed in to pad out a page that already has some
// matches. There are two different reasons the general pool still gets
// used, and they're deliberately kept distinct via the `tier`/`personalized`
// signal rather than collapsed into one "fallback" behaviour:
//   1. The profile has zero signal at all (buildMatchFilter returns null) —
//      nothing to be "relevant" against, so general is all there is.
//   2. The profile HAS a signal, but literally nothing currently ingested
//      matches it — checked once per pagination session via a cheap
//      `exists()` before falling back, so a real signal with a couple of
//      matches shows ONLY those (never padded with unrelated items), and
//      only a genuine zero-match signal falls through to general instead of
//      leaving the tab permanently blank.
export const getForYouNews = async (req, res) => {
  try {
    const limit = getLimit(req);
    const category = (req.query.category || "").trim();
    const parsedCursor = decodeCursor(req.query.cursor);

    const baseFilter = {
      status: "active",
      type: { $nin: ARTICLE_TYPES },
      providerId: { $nin: EXCLUDED_PROVIDER_IDS },
      _id: { $nin: await getHiddenNewsIds(req.user._id) },
    };
    if (category && category.toLowerCase() !== "all") {
      baseFilter.categories = category;
    }

    const matchFilter = buildMatchFilter(req.user);
    const matchedFilter = matchFilter ? { ...baseFilter, ...matchFilter } : null;

    // Every later page continues whatever tier the cursor already committed
    // to, so a user's second page of the same scroll session never
    // silently switches strategy mid-way. Only the first page (no cursor
    // yet) has to decide which tier this session even starts in.
    let tier = parsedCursor?.tier || (matchedFilter ? "matched" : "general");

    if (!parsedCursor && matchedFilter) {
      const hasAnyMatch = await NewsItem.exists(matchedFilter);
      if (!hasAnyMatch) tier = "general";
    }

    const filter = tier === "matched" && matchedFilter ? matchedFilter : baseFilter;

    const rows = await NewsItem.find({ ...filter, ...cursorInequality(parsedCursor) })
      .sort({ publishedAt: -1, _id: -1 })
      .limit(limit + 1)
      .select(NEWS_PROJECTION);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const withViewerState = await attachViewerState(items, req.user._id);
    const withReason = withViewerState.map((item) => ({
      ...item,
      relevanceReason: buildRelevanceReason(item, req.user),
    }));

    return res.json({
      success: true,
      items: withReason,
      hasMore,
      nextCursor: hasMore ? encodeCursor(items[items.length - 1], tier) : null,
      // True only when this page is actually the user's matched pool —
      // false both for a signal-less profile and for a real signal that
      // currently has zero matching stories, so the frontend's empty-state
      // copy stays honest either way (see News.jsx).
      personalized: tier === "matched",
    });
  } catch (error) {
    console.error("[news.controller] getForYouNews failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load news" });
  }
};

// GET /news/categories — distinct categories actually present among active
// items, most-common first, so the chip row always reflects real content
// instead of a static list that might be entirely empty.
export const getNewsCategories = async (req, res) => {
  try {
    const results = await NewsItem.aggregate([
      { $match: { status: "active", providerId: { $nin: EXCLUDED_PROVIDER_IDS } } },
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return res.json({
      success: true,
      categories: results.map((r) => ({ name: r._id, count: r.count })),
    });
  } catch (error) {
    console.error("[news.controller] getNewsCategories failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};

// GET /news/:newsId
export const getNewsById = async (req, res) => {
  try {
    const item = await NewsItem.findOne({ _id: req.params.newsId, status: "active" }).select(
      NEWS_PROJECTION
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "This update is no longer available" });
    }

    const [withViewerState] = await attachViewerState([item], req.user._id);

    return res.json({
      success: true,
      item: { ...withViewerState, relevanceReason: buildRelevanceReason(item, req.user) },
    });
  } catch (error) {
    console.error("[news.controller] getNewsById failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load this update" });
  }
};

async function upsertInteraction(userId, newsId, update) {
  try {
    return await NewsInteraction.findOneAndUpdate(
      { user: userId, newsItem: newsId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // A duplicate-key race (two near-simultaneous requests both trying to
    // insert the same user+newsItem pair — e.g. a rapid double-tap on
    // Save) is expected and harmless, same as notification.service.js's
    // dedupe upsert — the doc already exists by the time this retries, so
    // a plain update (no upsert) against the now-existing row succeeds.
    if (error?.code === 11000) {
      return NewsInteraction.findOneAndUpdate({ user: userId, newsItem: newsId }, update, { new: true });
    }
    throw error;
  }
}

// POST /news/:newsId/open — best-effort read tracking, called once per
// meaningful open from the frontend (not on every render — see News detail
// page). Never blocks or fails the actual navigation if this errors.
export const openNews = async (req, res) => {
  try {
    await upsertInteraction(req.user._id, req.params.newsId, {
      $set: { opened: true },
      $setOnInsert: { openedAt: new Date() },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("[news.controller] openNews failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to record open" });
  }
};

export const saveNews = async (req, res) => {
  try {
    await upsertInteraction(req.user._id, req.params.newsId, {
      $set: { saved: true, savedAt: new Date() },
    });
    return res.json({ success: true, saved: true });
  } catch (error) {
    console.error("[news.controller] saveNews failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to save" });
  }
};

export const unsaveNews = async (req, res) => {
  try {
    await NewsInteraction.updateOne(
      { user: req.user._id, newsItem: req.params.newsId },
      { $set: { saved: false } }
    );
    return res.json({ success: true, saved: false });
  } catch (error) {
    console.error("[news.controller] unsaveNews failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to unsave" });
  }
};

// POST /news/:newsId/share — records the share; the actual share sheet
// (native share / copy link) is handled entirely on the frontend using the
// deepLink this returns, same pattern as journey/post sharing elsewhere.
export const shareNews = async (req, res) => {
  try {
    const item = await NewsItem.findById(req.params.newsId).select("title sourceName");
    if (!item) return res.status(404).json({ success: false, message: "This update is no longer available" });

    await upsertInteraction(req.user._id, req.params.newsId, {
      $set: { shared: true, sharedAt: new Date() },
    });

    return res.json({
      success: true,
      deepLink: `/news/${item._id}`,
      title: item.title,
      sourceName: item.sourceName,
    });
  } catch (error) {
    console.error("[news.controller] shareNews failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to share" });
  }
};

export const markNotInterested = async (req, res) => {
  try {
    await upsertInteraction(req.user._id, req.params.newsId, {
      $set: { notInterested: true },
    });
    return res.json({ success: true, notInterested: true });
  } catch (error) {
    console.error("[news.controller] markNotInterested failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to update" });
  }
};

export const removeNotInterested = async (req, res) => {
  try {
    await NewsInteraction.updateOne(
      { user: req.user._id, newsItem: req.params.newsId },
      { $set: { notInterested: false } }
    );
    return res.json({ success: true, notInterested: false });
  } catch (error) {
    console.error("[news.controller] removeNotInterested failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to update" });
  }
};
