import mongoose from "mongoose";
import crypto from "crypto";

// One row per ingested news/article/announcement. Deliberately stores only
// headline + short summary + source link — never the full article body (see
// ingestion providers' normalizeItem(), which strips anything beyond a
// short excerpt). "Read more" always sends the user to the original
// publisher; this app is a personalised pointer to that content, not a
// republisher of it.
const newsItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "news",
        "announcement",
        "opportunity",
        "event",
        "article",
        "exam",
        "scholarship",
        "internship",
        "funding",
      ],
      required: true,
      default: "news",
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    // Lowercased/whitespace-collapsed title, used only for duplicate
    // detection (see contentHash below) and as a cheap secondary lookup —
    // never shown to users.
    normalizedTitle: {
      type: String,
      index: true,
    },

    summary: {
      type: String,
      maxlength: 600,
      default: "",
    },

    sourceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    sourceUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Which provider produced this row (e.g. "hackernews", "rss:<feed host>")
    // — kept for ingestion debugging/monitoring, not shown to users.
    providerId: {
      type: String,
      default: "",
    },

    externalId: {
      type: String,
      default: "",
    },

    // Deterministic dedupe key — sourceName+externalId when the provider
    // has a stable id (Hacker News item id, an RSS <guid>), otherwise a hash
    // of normalized sourceUrl+title. A unique index on this is what actually
    // makes re-ingestion (a scheduler retry, or the same story appearing in
    // two providers) a harmless no-op instead of a duplicate row — matching
    // headlines alone isn't reliable since publishers sometimes tweak them.
    contentHash: {
      type: String,
      required: true,
      unique: true,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },

    categories: {
      type: [String],
      default: [],
      index: true,
    },

    roles: {
      type: [String],
      default: [],
      index: true,
    },

    industries: {
      type: [String],
      default: [],
    },

    locations: {
      type: [String],
      default: [],
    },

    keywords: {
      type: [String],
      default: [],
    },

    qualityScore: {
      type: Number,
      default: 0,
    },

    importanceScore: {
      type: Number,
      default: 0,
    },

    isBreaking: {
      type: Boolean,
      default: false,
    },

    isNotificationEligible: {
      type: Boolean,
      default: false,
    },

    // "active" news/articles are what the feed/ranking queries filter on;
    // "hidden" is for an admin-hidden incorrect item; "rejected" is for
    // anything ingestion itself flagged as unsafe/invalid before it could
    // ever reach a real user.
    status: {
      type: String,
      enum: ["active", "hidden", "rejected"],
      default: "active",
      index: true,
    },

    // Set true for IMCircle-admin-authored announcements (Part 29) — these
    // have no external provider/sourceUrl in the usual sense, so this flag
    // (rather than providerId alone) is what the admin routes check/set.
    isAdminAuthored: {
      type: Boolean,
      default: false,
    },

    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Latest-first is the primary read pattern for every feed query this app
// makes (For You, Articles, admin review) — see news.controller.js, which
// always sorts by publishedAt desc. Compound with status/type since those
// are the standard filters alongside the sort.
newsItemSchema.index({ status: 1, type: 1, publishedAt: -1 });
newsItemSchema.index({ status: 1, roles: 1, publishedAt: -1 });
newsItemSchema.index({ status: 1, categories: 1, publishedAt: -1 });

export function buildContentHash({ sourceName, externalId, sourceUrl, title }) {
  if (externalId) {
    return crypto
      .createHash("sha256")
      .update(`${sourceName}::${externalId}`)
      .digest("hex");
  }

  const normalizedUrl = (sourceUrl || "").trim().toLowerCase().replace(/[#?].*$/, "").replace(/\/$/, "");
  const normalizedTitle = (title || "").trim().toLowerCase().replace(/\s+/g, " ");
  return crypto
    .createHash("sha256")
    .update(`${normalizedUrl}::${normalizedTitle}`)
    .digest("hex");
}

// "Articles" (News → Articles tab) are the longer-form / more evergreen
// entries; everything else is the fast-moving "For You" stream. Kept here
// (not duplicated in the controller) since it's a fact about the schema's
// `type` enum, not a query-time decision.
export const ARTICLE_TYPES = ["article"];

const NewsItem = mongoose.model("NewsItem", newsItemSchema);

export default NewsItem;
