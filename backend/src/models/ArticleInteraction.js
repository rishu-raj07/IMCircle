import mongoose from "mongoose";

// One row per (user, article) — mirrors NewsInteraction's shape/purpose for
// News (saved/opened/notInterested) but adds the reading-progress fields
// Articles specifically need (progressPercent, completed, readingSeconds).
const articleInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
    },

    saved: { type: Boolean, default: false },

    // A user can hold exactly one reaction at a time — changing it updates
    // this same field/document rather than creating a second interaction
    // row (the unique {user,article} index below guarantees that either
    // way, but this is also just the correct modeling: "reaction" is a
    // single current-state field, not a log of reaction events).
    reaction: {
      type: String,
      enum: ["like", "insightful", "inspiring", "support", null],
      default: null,
    },

    openedAt: { type: Date, default: null },
    lastReadAt: { type: Date, default: null },

    progressPercent: { type: Number, min: 0, max: 100, default: 0 },

    // Set once progressPercent first reaches the 80% completion threshold
    // (see markProgress() below) — never unset afterward, even if the user
    // later re-reads and their live percent dips (e.g. re-opening from the
    // top), since "did they ever finish this" is what Completed Articles
    // should reflect.
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },

    readingSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One interaction row per user per article — this is what makes "save",
// "open", and "progress" all safely upsert-able without ever creating
// duplicate rows for the same person/article pair.
articleInteractionSchema.index({ user: 1, article: 1 }, { unique: true });
// Reverse lookup for an article's aggregate stats (e.g. recomputing
// averageCompletionPercent) without a full collection scan.
articleInteractionSchema.index({ article: 1, completed: 1 });

export const COMPLETION_THRESHOLD_PERCENT = 80;

const ArticleInteraction = mongoose.model("ArticleInteraction", articleInteractionSchema);

export default ArticleInteraction;
