import mongoose from "mongoose";

// Long-form content (Articles tab) — distinct from NewsItem (News tab's
// fast-moving For You stream). Deliberately a separate model rather than
// extending NewsItem: articles have full content bodies, an authoring/
// review workflow, reading-progress tracking, and evergreen ranking, none
// of which NewsItem's ingestion-pipeline shape was built for. Keeping them
// separate means nothing about the existing News feature changes.
const articleSchema = new mongoose.Schema(
  {
    title: {
      // Not schema-required: a fresh "Write an article" draft is created
      // server-side before the user has typed anything (see
      // article.controller.js's createDraft) — title/summary/content
      // presence is only enforced at publish time (see publishArticle),
      // per the spec's "validate before publishing" requirement.
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    subtitle: {
      type: String,
      default: "",
      maxlength: 300,
    },

    shortSummary: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Full body — internal articles only. External articles leave this
    // empty; the app never stores/republishes a full external article (see
    // articleType below and the admin controller's validation).
    content: {
      type: String,
      default: "",
    },

    contentFormat: {
      type: String,
      enum: ["html", "markdown", "plain"],
      default: "html",
    },

    whyItMatters: {
      type: String,
      default: "",
      maxlength: 600,
    },

    keyTakeaways: [
      {
        type: String,
        maxlength: 300,
      },
    ],

    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      altText: { type: String, default: "" },
    },

    articleType: {
      type: String,
      enum: ["internal", "external"],
      default: "internal",
      index: true,
    },

    // Orthogonal to articleType: articleType is "does this have IMCircle-
    // hosted full content or just a link" (admin tool's axis);
    // isCommunityArticle is "did a regular user write this, or did
    // IMCircle/an admin" (the new axis this feature adds). A community
    // article is always articleType "internal" — there's no such thing as
    // a user-submitted external-link article.
    isCommunityArticle: {
      type: Boolean,
      default: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    authorName: {
      type: String,
      trim: true,
      default: "",
    },

    authorType: {
      type: String,
      enum: ["admin", "editorial", "community", "external"],
      default: "community",
    },

    // External-article-only. sourceUrl is where "Read original" points.
    sourceName: {
      type: String,
      trim: true,
      default: "",
    },

    sourceUrl: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "Startup",
        "Founder Stories",
        "Funding",
        "Education",
        "Career",
        "AI",
        "Technology",
        "Government",
        "Opportunities",
        "Productivity",
        "Creator Economy",
        "Business",
        "Personal Growth",
        "Other",
      ],
      required: true,
      index: true,
    },

    industries: [{ type: String, trim: true }],

    tags: [{ type: String, lowercase: true, trim: true }],

    targetRoles: [
      {
        type: String,
        enum: ["student", "founder", "creator", "freelancer", "professional", "all"],
      },
    ],

    targetInterests: [{ type: String, trim: true, lowercase: true }],

    language: {
      type: String,
      enum: ["English", "Hindi", "Hinglish"],
      default: "English",
    },

    readingTime: {
      type: Number,
      default: 1,
    },

    // Status enum replaced wholesale for the Community Articles feature
    // (was: draft/pending_review/changes_requested/approved/rejected/
    // published/archived, built for the admin-only News-style Articles tool
    // and never used by real data — safe to swap with zero migration since
    // nothing has shipped against the old values yet). New flow:
    //   draft -> published -> pending_feature_review -> featured
    //   pending_feature_review -> changes_requested -> (edit) -> pending_feature_review
    //   pending_feature_review -> feature_not_selected
    //   published|featured -> archived | removed
    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "pending_feature_review",
        "changes_requested",
        "featured",
        "feature_not_selected",
        "archived",
        "removed",
      ],
      default: "draft",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },

    // Editorial feature-review note — replaces the old generic `reviewNote`
    // field (unused by any real data). Required by the admin controller
    // when requesting changes; optional/constructive for "not selected".
    featureReviewNote: { type: String, default: "" },
    featureSubmittedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },

    isFeatured: { type: Boolean, default: false },
    allowThoughts: { type: Boolean, default: true },

    publishedAt: { type: Date, default: null, index: true },
    scheduledAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    lastEditedAt: { type: Date, default: null },

    stats: {
      views: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      thoughts: { type: Number, default: 0 },
      reactions: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      averageCompletionPercent: { type: Number, default: 0 },
    },

    // Mirrors Post.reports[]'s embedded-array convention (see Post.js) —
    // this app has no shared Report model, each content type keeps its own
    // small reports array. Richer than Post's (enum'd reason + admin note +
    // resolution) since Article moderation needs distinct admin actions
    // (dismiss/warn/remove/suspend) rather than Post's binary hide/restore.
    moderation: {
      isReported: { type: Boolean, default: false },
      reportCount: { type: Number, default: 0 },
      removedReason: { type: String, default: "" },
      reports: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          reason: {
            type: String,
            enum: [
              "copied_content",
              "copyright_violation",
              "misleading_information",
              "spam_or_promotion",
              "scam",
              "hate_or_harassment",
              "adult_content",
              "dangerous_content",
              "fake_opportunity",
              "other",
            ],
          },
          note: { type: String, default: "" },
          status: { type: String, enum: ["open", "dismissed", "actioned"], default: "open" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Every list query filters by status (published-only for normal users) and
// sorts by publishedAt — these compound indexes cover that plus the other
// documented filter combinations (category chips, role-targeting, tag
// lookup, an author's own article list, and the featured rail).
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, publishedAt: -1 });
articleSchema.index({ targetRoles: 1, publishedAt: -1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ author: 1, status: 1, createdAt: -1 });
articleSchema.index({ isFeatured: 1, publishedAt: -1 });
articleSchema.index({ isCommunityArticle: 1, status: 1, publishedAt: -1 });

// Plain regex-based search is the established pattern in this codebase
// (see search.controller.js's globalSearch) rather than MongoDB $text —
// matching that convention here too. This index still helps title-prefix
// lookups and keeps the door open for a real $text query later without a
// migration.
articleSchema.index({ title: "text", shortSummary: "text", tags: "text" });

function slugifyTitle(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}

// Guarantees a unique, URL-safe slug even when two articles share a title
// ("how-i-raised-my-seed-round", then "...-2", "...-3", ...) — checked
// against the DB rather than relying on the unique index to reject a
// collision, since a create request should never fail outright over a
// cosmetic duplicate title.
export async function generateUniqueSlug(title, ArticleModel, excludeId = null) {
  // Empty-title drafts (created the moment "Write an article" is opened,
  // before the user has typed anything) still need a valid unique slug
  // immediately — falls back to a short random-ish base rather than the
  // literal word "article" colliding constantly.
  const base = slugifyTitle(title) || `untitled-${Date.now().toString(36)}`;
  let candidate = base;
  let suffix = 1;

  // Bounded loop — a runaway title collision chain (thousands of identical
  // titles) is not a real scenario this needs to handle gracefully forever;
  // falling back to a timestamp suffix after a reasonable number of tries
  // guarantees termination either way.
  while (suffix < 50) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const existing = await ArticleModel.findOne(query).select("_id").lean();
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now()}`;
}

const WORDS_PER_MINUTE = 220;

export function calculateReadingTime(content = "") {
  const plainText = String(content || "").replace(/<[^>]*>/g, " ");
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

// No `next` parameter — matches every other pre-hook in this codebase
// (see College.js/Company.js/User.js etc.). This project's Mongoose
// version doesn't pass a callback to synchronous-style middleware; the
// earlier callback-style version of this hook (`function(next) {...
// next(); }`) threw "next is not a function" on every single Article
// create/save, which is why article creation was failing outright.
articleSchema.pre("validate", function computeReadingTime() {
  if (this.isModified("content")) {
    this.readingTime = calculateReadingTime(this.content);
  }
});

const Article = mongoose.model("Article", articleSchema);

export default Article;
