import mongoose from "mongoose";
import Article, { generateUniqueSlug } from "../models/Article.js";
import ArticleInteraction from "../models/ArticleInteraction.js";
import User from "../models/User.js";
import { sanitizeArticleHtml } from "../utils/sanitizeArticleHtml.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

// A "publicly visible" article is anything past the draft stage that
// hasn't been archived/removed — pending_feature_review, changes_requested,
// featured, and feature_not_selected are all layered ON TOP of "published"
// in this model (see Article.js's status enum comment): a community
// article under review, asked for changes, or not selected for the curated
// tab STAYS live on the author's profile/feed/direct-link the whole time
// ("This article remains published on your profile..." — never hidden by
// the review process itself). Only draft/archived/removed are non-public.
const PUBLICLY_VISIBLE_STATUSES = [
  "published",
  "pending_feature_review",
  "changes_requested",
  "featured",
  "feature_not_selected",
];

// Eligible for the main Articles tab: admin-approved (status "featured"),
// an IMCircle-original (isCommunityArticle: false, published directly), or
// any Community Article that's been published by its author. Community
// articles show alongside curated ones here — the ArticleCard badges
// ("Community article" vs "Featured on IMCircle") are what visually tell
// them apart. "featured" status is still the only way to appear in the
// getFeaturedArticles rail and to be exempt from the >30%-edit revert rule.
function curatedTabFilter() {
  return {
    $or: [
      { status: "featured" },
      { isCommunityArticle: false, status: "published" },
      { isCommunityArticle: true, status: "published" },
    ],
  };
}

// Can `viewerId` see this article given its visibility setting? Public is
// open to anyone; followers-only requires viewer to be in the author's
// followers list (or be the author); private is author-only. Used by
// getArticleBySlug/getUserArticles — never by the curated tab or search,
// which only ever deal in `visibility: "public"` articles anyway (private/
// followers content isn't indexed for search or ranked into the tab).
async function canViewArticle(article, viewerId) {
  if (String(article.author) === String(viewerId)) return true;
  if (article.visibility === "public") return true;
  if (article.visibility === "private") return false;
  if (article.visibility === "followers") {
    const author = await User.findById(article.author).select("followers").lean();
    return Boolean(author?.followers?.some((id) => String(id) === String(viewerId)));
  }
  return false;
}

// Same base64url(JSON) cursor convention as news.controller.js/feed.controller.js
// — keeps the Articles tab's frontend pagination logic (News.jsx's load())
// working unchanged against a different backing model.
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const date = new Date(decoded.publishedAt);
    if (!decoded.id || Number.isNaN(date.getTime()) || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return null;
    }
    return { publishedAt: date, id: decoded.id };
  } catch {
    return null;
  }
}

function encodeCursor(item) {
  if (!item?._id || !item?.publishedAt) return null;
  return Buffer.from(
    JSON.stringify({ publishedAt: item.publishedAt, id: String(item._id) }),
    "utf8"
  ).toString("base64url");
}

function cursorQuery(cursor) {
  const parsed = decodeCursor(cursor);
  if (!parsed) return {};
  return {
    $or: [
      { publishedAt: { $lt: parsed.publishedAt } },
      { publishedAt: parsed.publishedAt, _id: { $lt: parsed.id } },
    ],
  };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLimit(req) {
  const requested = Number(req.query.limit);
  if (!Number.isFinite(requested)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.round(requested), 1), MAX_LIMIT);
}

// Card-only projection — list/related/featured endpoints must NEVER return
// full article content (performance + the "list endpoints never leak full
// content" requirement). Full body only ever comes from getArticleBySlug.
const CARD_PROJECTION =
  "title subtitle slug shortSummary coverImage articleType isCommunityArticle author authorName authorType " +
  "sourceName sourceUrl category tags language readingTime isFeatured allowThoughts visibility " +
  "publishedAt lastEditedAt stats status createdBy featureReviewNote featureSubmittedAt";

const AUTHOR_PROJECTION = "fullName username avatar headline verification";

function isVerifiedAuthor(user) {
  if (!user?.verification) return false;
  return Boolean(
    user.verification.professional || user.verification.business || user.verification.aadhaar
  );
}

function serializeCard(doc, viewerState) {
  const item = doc.toObject ? doc.toObject() : doc;
  const author = item.author && typeof item.author === "object" ? item.author : null;

  return {
    _id: item._id,
    title: item.title,
    subtitle: item.subtitle,
    slug: item.slug,
    shortSummary: item.shortSummary,
    coverImage: item.coverImage,
    articleType: item.articleType,
    isCommunityArticle: item.isCommunityArticle,
    category: item.category,
    tags: item.tags,
    language: item.language,
    readingTime: item.readingTime,
    isFeatured: item.isFeatured,
    allowThoughts: item.allowThoughts,
    visibility: item.visibility,
    status: item.status,
    featureReviewNote: item.featureReviewNote,
    featureSubmittedAt: item.featureSubmittedAt,
    publishedAt: item.publishedAt,
    lastEditedAt: item.lastEditedAt,
    stats: item.stats,
    author: author
      ? {
          _id: author._id,
          fullName: author.fullName,
          username: author.username,
          avatar: author.avatar,
          headline: author.headline,
          isVerified: isVerifiedAuthor(author),
        }
      : null,
    authorName: item.authorName,
    authorType: item.authorType,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    viewerState: viewerState || { saved: false, completed: false, progressPercent: 0 },
  };
}

async function attachViewerState(items, userId) {
  if (!items.length) return [];
  const ids = items.map((item) => item._id);
  const interactions = await ArticleInteraction.find({
    user: userId,
    article: { $in: ids },
  })
    .select("article saved completed progressPercent")
    .lean();

  const byArticle = new Map(interactions.map((row) => [String(row.article), row]));

  return items.map((item) => {
    const row = byArticle.get(String(item._id));
    return serializeCard(item, {
      saved: Boolean(row?.saved),
      completed: Boolean(row?.completed),
      progressPercent: row?.progressPercent || 0,
    });
  });
}

// GET /api/articles — the main Articles tab. Default mode shows featured
// articles, IMCircle originals, and any published Community Article,
// sorted together by recency — badges on each card distinguish "Featured
// on IMCircle" from "Community article". `feed=following` switches to the
// separate
// "From people you follow" section instead — still never mixed into the
// curated ranking, just a distinct query the frontend renders as its own
// section. Supports category/tag/author/search/language filters either way.
export const listArticles = async (req, res) => {
  try {
    const limit = getLimit(req);
    const { category, tag, author, search, language, feed } = req.query;

    // Both branches (curated tab and "from people you follow") only ever
    // surface public-visibility content — followers-only/private articles
    // are reachable by direct link and on the author's profile (to
    // followers), never injected into a generic list feed.
    const clauses = [cursorQuery(req.query.cursor), { visibility: "public" }];

    if (feed === "following") {
      const me = await User.findById(req.user._id).select("following").lean();
      const followingIds = me?.following || [];
      clauses.push({
        isCommunityArticle: true,
        status: { $in: ["published", "featured"] },
        author: { $in: followingIds },
      });
    } else {
      clauses.push(curatedTabFilter());
    }

    if (category && category.toLowerCase() !== "all") clauses.push({ category });
    if (tag) clauses.push({ tags: String(tag).toLowerCase().trim() });
    if (language) clauses.push({ language });
    if (author && mongoose.Types.ObjectId.isValid(author)) clauses.push({ author });

    if (search?.trim()) {
      const pattern = new RegExp(escapeRegExp(search.trim()), "i");
      clauses.push({
        $or: [
          { title: pattern },
          { shortSummary: pattern },
          { tags: pattern },
          { authorName: pattern },
          { sourceName: pattern },
          { category: pattern },
        ],
      });
    }

    const filter = { $and: clauses };

    const rows = await Article.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .limit(limit + 1)
      .select(CARD_PROJECTION)
      .populate("author", AUTHOR_PROJECTION);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await attachViewerState(page, req.user._id);

    return res.json({
      success: true,
      items,
      hasMore,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    });
  } catch (error) {
    console.error("[article.controller] listArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load articles" });
  }
};

// GET /api/articles/featured — small, unpaginated rail (top N by recency).
// isFeatured is only ever true when status is "featured" going forward, so
// this is already curated-only without needing the full $or.
export const getFeaturedArticles = async (req, res) => {
  try {
    const rows = await Article.find({ status: "featured", isFeatured: true })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select(CARD_PROJECTION)
      .populate("author", AUTHOR_PROJECTION);

    const items = await attachViewerState(rows, req.user._id);
    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getFeaturedArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load featured articles" });
  }
};

// GET /api/articles/:slug — the only endpoint that returns full content.
// External articles never carry a populated `content` field to begin with
// (see admin controller), so there's nothing to accidentally leak either
// way; this just returns whatever the document actually has. Any publicly-
// visible status is fetchable (see PUBLICLY_VISIBLE_STATUSES) — a review-
// in-progress or not-selected Community Article stays reachable by direct
// link/profile exactly like a plain published one — gated by the
// visibility (public/followers/private) check against the viewer.
export const getArticleBySlug = async (req, res) => {
  try {
    const article = await Article.findOne({
      slug: req.params.slug,
      status: { $in: PUBLICLY_VISIBLE_STATUSES },
    }).populate("author", AUTHOR_PROJECTION);

    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found." });
    }

    const allowed = await canViewArticle(article, req.user._id);
    if (!allowed) {
      return res.status(404).json({ success: false, message: "Article not found." });
    }

    const [interaction] = await attachViewerStateFull(article, req.user._id);

    return res.json({ success: true, item: interaction });
  } catch (error) {
    console.error("[article.controller] getArticleBySlug failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load article" });
  }
};

async function attachViewerStateFull(article, userId) {
  const row = await ArticleInteraction.findOne({ user: userId, article: article._id })
    .select("saved completed progressPercent")
    .lean();

  const item = article.toObject();
  const author = item.author || null;

  // Only fetched on the detail page (not list/related cards) — that's the
  // one place the Follow button actually renders, so no point paying for
  // this check on every card in a feed.
  const isFollowingAuthor = author
    ? Boolean(await User.exists({ _id: author._id, followers: userId }))
    : false;

  return [
    {
      ...item,
      isOwner: author ? String(author._id) === String(userId) : false,
      author: author
        ? {
            _id: author._id,
            fullName: author.fullName,
            username: author.username,
            avatar: author.avatar,
            headline: author.headline,
            isVerified: isVerifiedAuthor(author),
            isFollowing: isFollowingAuthor,
          }
        : null,
      viewerState: {
        saved: Boolean(row?.saved),
        completed: Boolean(row?.completed),
        progressPercent: row?.progressPercent || 0,
      },
    },
  ];
}

// GET /api/articles/:id/related — same category first, excluding itself,
// most recent. Simple and deterministic for Phase 1; the weighted ranking
// formula (recency/interest/role/engagement/editorial) is a later-phase
// upgrade to this same endpoint, not a separate one.
export const getRelatedArticles = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const article = await Article.findById(id).select("category _id").lean();
    if (!article) return res.status(404).json({ success: false, message: "Article not found." });

    const rows = await Article.find({
      status: { $in: PUBLICLY_VISIBLE_STATUSES },
      visibility: "public",
      category: article.category,
      _id: { $ne: article._id },
    })
      .sort({ publishedAt: -1 })
      .limit(6)
      .select(CARD_PROJECTION)
      .populate("author", AUTHOR_PROJECTION);

    const items = await attachViewerState(rows, req.user._id);
    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getRelatedArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to load related articles" });
  }
};

// POST /api/articles/:id/save, DELETE .../save — upserts the interaction
// row rather than creating duplicates (unique {user,article} index on
// ArticleInteraction makes this safe under concurrent taps).
export const saveArticle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const article = await Article.findOne({
      _id: id,
      status: { $in: PUBLICLY_VISIBLE_STATUSES },
    }).select("_id author visibility stats");
    if (!article || !(await canViewArticle(article, req.user._id))) {
      return res.status(404).json({ success: false, message: "Article not found." });
    }

    await ArticleInteraction.findOneAndUpdate(
      { user: req.user._id, article: id },
      { $set: { saved: true } },
      { upsert: true }
    );

    // Recomputed directly rather than $inc'd — toggling save on/off
    // repeatedly must never drift the counter, and this is cheap at any
    // realistic per-article interaction-row count.
    const savedCount = await ArticleInteraction.countDocuments({ article: id, saved: true });
    await Article.updateOne({ _id: id }, { $set: { "stats.saves": savedCount } });

    return res.json({ success: true, saved: true });
  } catch (error) {
    console.error("[article.controller] saveArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to save article" });
  }
};

export const unsaveArticle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    await ArticleInteraction.findOneAndUpdate(
      { user: req.user._id, article: id },
      { $set: { saved: false } }
    );

    const savedCount = await ArticleInteraction.countDocuments({ article: id, saved: true });
    await Article.updateOne({ _id: id }, { $set: { "stats.saves": savedCount } });

    return res.json({ success: true, saved: false });
  } catch (error) {
    console.error("[article.controller] unsaveArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to unsave article" });
  }
};

// POST /api/articles/:id/share — increments the share counter and returns a
// deep link, same contract shape as shareNews so the frontend's share
// handler pattern (NewsCard.jsx) can be mirrored directly in ArticleCard.
export const shareArticle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const article = await Article.findOneAndUpdate(
      { _id: id, status: { $in: PUBLICLY_VISIBLE_STATUSES } },
      { $inc: { "stats.shares": 1 } },
      { new: true }
    ).select("slug");

    if (!article) return res.status(404).json({ success: false, message: "Article not found." });

    return res.json({ success: true, deepLink: `/articles/${article.slug}` });
  } catch (error) {
    console.error("[article.controller] shareArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to share article" });
  }
};

// POST /api/articles/:id/view — unique-view mechanism: `views` increments
// every call (raw impression count), `uniqueViews` only increments the
// first time this user has ever opened it (tracked via `openedAt` on the
// interaction row, set exactly once).
export const recordArticleView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const existing = await ArticleInteraction.findOne({ user: req.user._id, article: id }).select(
      "openedAt"
    );

    const isFirstOpen = !existing?.openedAt;

    await ArticleInteraction.findOneAndUpdate(
      { user: req.user._id, article: id },
      { $set: { openedAt: existing?.openedAt || new Date(), lastReadAt: new Date() } },
      { upsert: true }
    );

    const inc = isFirstOpen ? { "stats.views": 1, "stats.uniqueViews": 1 } : { "stats.views": 1 };
    await Article.updateOne({ _id: id, status: { $in: PUBLICLY_VISIBLE_STATUSES } }, { $inc: inc });

    return res.json({ success: true });
  } catch (error) {
    console.error("[article.controller] recordArticleView failed:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to record view" });
  }
};

// ---------------------------------------------------------------------
// Community Article authoring: create/edit/publish/archive/delete, all
// author-owned. Reactions/save-analytics/submit-for-feature/report are a
// later phase (see this feature's own phase breakdown) — these five cover
// exactly Phase 1's "Write Article page, Draft autosave, Publish" scope.
// ---------------------------------------------------------------------

const MIN_PUBLISH_CONTENT_LENGTH = 300;

function plainTextLength(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

// "Genuine early users shouldn't hit unnecessary barriers" — only the hard
// gate (permission not blocked, account not blocked, at least one contact
// verified) is enforced. Profile-completion/account-age minimums are
// intentionally NOT enforced by default, per the spec's own guidance.
async function assertCanWriteArticles(userId) {
  const user = await User.findById(userId).select(
    "isBlocked isDeleted verification articlePublishingPermission articleAuthorStatus"
  );

  if (!user || user.isDeleted || user.isBlocked) {
    return "Your account can't publish articles right now.";
  }
  if (user.articleAuthorStatus === "suspended" || user.articlePublishingPermission === "blocked") {
    return "Article publishing is currently disabled for your account.";
  }
  if (!user.verification?.email && !user.verification?.mobile) {
    return "Verify your email or phone number before writing an article.";
  }
  return null;
}

// POST /api/articles — creates ONE draft immediately (before the user has
// typed anything) so the editor always has an _id to autosave against from
// the very first keystroke — never creates a second document later at
// publish time.
export const createDraft = async (req, res) => {
  try {
    const denyReason = await assertCanWriteArticles(req.user._id);
    if (denyReason) return res.status(403).json({ success: false, message: denyReason });

    const slug = await generateUniqueSlug("", Article);

    const draft = await Article.create({
      title: "",
      slug,
      category: "Other",
      articleType: "internal",
      isCommunityArticle: true,
      authorType: "community",
      author: req.user._id,
      authorName: req.user.fullName || "",
      status: "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, item: draft });
  } catch (error) {
    console.error("[article.controller] createDraft failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not start a new draft." });
  }
};

async function loadOwnedArticle(id, userId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: [400, "Invalid article id."] };
  const article = await Article.findById(id);
  if (!article) return { error: [404, "Article not found."] };
  // Ownership is always derived from the authenticated session — the
  // frontend never gets to assert whose article this is.
  if (String(article.author) !== String(userId)) {
    return { error: [403, "You can only edit your own articles."] };
  }
  return { article };
}

// GET /api/articles/:id/edit — the editor's "load an existing draft/
// published article to keep editing" fetch. Separate from getArticleBySlug
// on purpose: that route only ever serves publicly-visible statuses (a
// draft has to stay invisible to everyone but its author), so overloading
// it with an ownership bypass risked accidentally widening what it returns
// for other callers. This one always returns the full document, regardless
// of status, but only ever to its author.
export const getArticleForEdit = async (req, res) => {
  try {
    const { article, error } = await loadOwnedArticle(req.params.id, req.user._id);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });
    return res.json({ success: true, item: article });
  } catch (err) {
    console.error("[article.controller] getArticleForEdit failed:", err?.message);
    return res.status(500).json({ success: false, message: "Could not load this article." });
  }
};

const EDITABLE_FIELDS = [
  "title", "subtitle", "shortSummary", "content", "contentFormat",
  "category", "tags", "industries", "language", "visibility", "allowThoughts",
];

// PATCH /api/articles/:id — both the debounced autosave call AND a manual
// "edit published article" save use this same endpoint; the only
// difference is which fields the frontend happens to send.
export const updateArticle = async (req, res) => {
  try {
    const { article, error } = await loadOwnedArticle(req.params.id, req.user._id);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    if (["archived", "removed"].includes(article.status)) {
      return res.status(400).json({ success: false, message: "This article can no longer be edited." });
    }

    const wasFeatured = article.status === "featured";
    const originalTitle = article.title;
    const originalCategory = article.category;
    const originalContentLength = plainTextLength(article.content);

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      if (field === "content") {
        article.content = sanitizeArticleHtml(req.body.content);
      } else {
        article[field] = req.body[field];
      }
    }

    if (req.body.coverImage !== undefined) {
      article.coverImage = req.body.coverImage
        ? {
            url: String(req.body.coverImage.url || ""),
            publicId: String(req.body.coverImage.publicId || ""),
            altText: String(req.body.coverImage.altText || ""),
          }
        : { url: "", publicId: "", altText: "" };
    }

    // Draft slugs are cosmetic placeholders until the first publish — keep
    // refreshing them to match the title so an early direct-link (e.g. a
    // preview URL) reads sensibly. Frozen forever once publishedAt is set,
    // so a live article's URL never moves under a reader/search engine.
    if (!article.publishedAt && req.body.title !== undefined) {
      article.slug = await generateUniqueSlug(article.title, Article, article._id);
    }

    // Featured articles get a simple, safe "major edit" check: title,
    // category, or >30% body-length change knocks it back to review rather
    // than silently letting an edited-after-approval article stay featured
    // with content nobody actually reviewed. The article stays visible on
    // the profile as a Community Article throughout — only isFeatured/the
    // curated-tab eligibility changes.
    if (wasFeatured) {
      const newContentLength = plainTextLength(article.content);
      const lengthDelta = originalContentLength
        ? Math.abs(newContentLength - originalContentLength) / originalContentLength
        : 0;
      const majorEdit =
        article.title !== originalTitle || article.category !== originalCategory || lengthDelta > 0.3;

      if (majorEdit) {
        article.status = "pending_feature_review";
        article.isFeatured = false;
      }
    }

    if (article.publishedAt) {
      article.lastEditedAt = new Date();
    }

    await article.save();
    return res.json({ success: true, item: article });
  } catch (error) {
    console.error("[article.controller] updateArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not save changes." });
  }
};

// POST /api/articles/:id/publish — draft -> published only (Phase 1 scope;
// re-publishing from archived isn't offered yet). Validates everything the
// spec requires before flipping status, auto-fills shortSummary if the
// author left it blank, and freezes the final slug.
export const publishArticle = async (req, res) => {
  try {
    const { article, error } = await loadOwnedArticle(req.params.id, req.user._id);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    if (article.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only a draft can be published." });
    }

    if (!article.title?.trim()) {
      return res.status(400).json({ success: false, message: "Add a title before publishing." });
    }
    if (!article.category) {
      return res.status(400).json({ success: false, message: "Choose a category before publishing." });
    }
    if (!req.body?.confirmOriginal) {
      return res.status(400).json({
        success: false,
        message: "Confirm this is your original work (or you have permission to publish it) before publishing.",
      });
    }

    const contentLength = plainTextLength(article.content);
    if (contentLength < MIN_PUBLISH_CONTENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Your article needs at least ${MIN_PUBLISH_CONTENT_LENGTH} characters of content before publishing.`,
      });
    }

    // Re-sanitize on the way to published too — belt-and-braces in case an
    // autosave call somehow stored something before this endpoint existed.
    article.content = sanitizeArticleHtml(article.content);

    if (!article.shortSummary?.trim()) {
      const plain = String(article.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      article.shortSummary = plain.slice(0, 280);
    }

    article.slug = await generateUniqueSlug(article.title, Article, article._id);
    article.status = "published";
    article.publishedAt = new Date();

    await article.save();

    // Feed-entry creation + selective follower notification is Phase 2
    // (feed article card) work — publishing already works end-to-end
    // (profile/detail-page/search/direct-link) without it; it's additive
    // distribution, not a dependency of publish itself.

    return res.json({ success: true, item: article });
  } catch (error) {
    console.error("[article.controller] publishArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not publish this article." });
  }
};

// POST /api/articles/:id/archive — soft delete. Removed from public
// feeds/search/curated tab, stays visible to the author under
// My Articles -> Archived, analytics preserved untouched.
export const archiveArticle = async (req, res) => {
  try {
    const { article, error } = await loadOwnedArticle(req.params.id, req.user._id);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    if (article.status === "draft") {
      return res.status(400).json({
        success: false,
        message: "A draft that was never published can be deleted instead of archived.",
      });
    }
    if (["archived", "removed"].includes(article.status)) {
      return res.status(400).json({ success: false, message: "This article is already archived." });
    }

    article.status = "archived";
    article.isFeatured = false;
    await article.save();

    return res.json({ success: true, item: article });
  } catch (error) {
    console.error("[article.controller] archiveArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not archive this article." });
  }
};

// DELETE /api/articles/:id — permanent, draft-only (per spec: "Provide
// permanent deletion only for drafts that were never published"). Anything
// ever published must be archived instead, never hard-deleted.
export const deleteArticle = async (req, res) => {
  try {
    const { article, error } = await loadOwnedArticle(req.params.id, req.user._id);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    if (article.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only a draft that was never published can be permanently deleted. Archive it instead.",
      });
    }

    await Article.deleteOne({ _id: article._id });
    return res.json({ success: true });
  } catch (error) {
    console.error("[article.controller] deleteArticle failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not delete this draft." });
  }
};

const DASHBOARD_PROJECTION =
  "title subtitle slug shortSummary coverImage category tags language readingTime " +
  "status isFeatured visibility publishedAt lastEditedAt createdAt updatedAt " +
  "featureReviewNote featureSubmittedAt stats";

// GET /api/articles/me — the full My Articles dashboard: every one of the
// author's own articles except permanently-removed ones, optionally
// filtered to one status (the dashboard's own section tabs). Never
// paginated by cursor here — this is a personal dashboard, not a feed.
export const getMyArticles = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = { author: req.user._id };
    if (status && status !== "all") filter.status = status;

    const items = await Article.find(filter)
      .sort({ updatedAt: -1 })
      .limit(200)
      .select(DASHBOARD_PROJECTION)
      .lean();

    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getMyArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not load your articles." });
  }
};

export const getMyDrafts = async (req, res) => {
  try {
    const items = await Article.find({ author: req.user._id, status: "draft" })
      .sort({ updatedAt: -1 })
      .limit(200)
      .select(DASHBOARD_PROJECTION)
      .lean();
    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getMyDrafts failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not load your drafts." });
  }
};

export const getMyPublished = async (req, res) => {
  try {
    const items = await Article.find({ author: req.user._id, status: "published" })
      .sort({ publishedAt: -1 })
      .limit(200)
      .select(DASHBOARD_PROJECTION)
      .lean();
    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getMyPublished failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not load your published articles." });
  }
};

// GET /api/users/:userId/articles — profile Articles section. The owner
// sees every status (drafts/archived included, for their own My Articles-
// style view of their own profile); anyone else only sees publicly-visible
// statuses filtered further by the article's own visibility setting, with
// review-only fields (featureReviewNote/featureSubmittedAt) stripped since
// those are author-facing moderation details, not public information.
export const getUserArticles = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const isOwner = String(userId) === String(req.user._id);
    const filter = { author: userId };

    if (isOwner) {
      if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    } else {
      filter.status = { $in: PUBLICLY_VISIBLE_STATUSES };
      const allowedVisibility = ["public"];
      const isFollower = await User.exists({ _id: userId, followers: req.user._id });
      if (isFollower) allowedVisibility.push("followers");
      filter.visibility = { $in: allowedVisibility };
    }

    const rows = await Article.find(filter)
      .sort({ [isOwner ? "updatedAt" : "publishedAt"]: -1 })
      .limit(100)
      .select(CARD_PROJECTION)
      .populate("author", AUTHOR_PROJECTION)
      .lean();

    const items = await attachViewerState(rows, req.user._id);
    if (!isOwner) {
      items.forEach((item) => {
        delete item.featureReviewNote;
        delete item.featureSubmittedAt;
      });
    }

    return res.json({ success: true, items });
  } catch (error) {
    console.error("[article.controller] getUserArticles failed:", error?.message);
    return res.status(500).json({ success: false, message: "Could not load this profile's articles." });
  }
};
