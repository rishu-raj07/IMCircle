import mongoose from "mongoose";

// One row per (user, newsItem) pair — mirrors the like/save/repost pattern
// already used for journeys/learning (JourneyMilestoneLike etc.), just
// collapsed into a single doc per pair instead of one doc per action type,
// since a user only ever has one relationship to a given news item.
const newsInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    newsItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewsItem",
      required: true,
      index: true,
    },

    opened: {
      type: Boolean,
      default: false,
    },

    saved: {
      type: Boolean,
      default: false,
    },

    shared: {
      type: Boolean,
      default: false,
    },

    notInterested: {
      type: Boolean,
      default: false,
    },

    openedAt: Date,
    savedAt: Date,
    sharedAt: Date,

    notificationSentAt: Date,
    notificationOpenedAt: Date,
  },
  {
    timestamps: true,
  }
);

newsInteractionSchema.index({ user: 1, newsItem: 1 }, { unique: true });
// Powers "exclude items I've already opened/dismissed" in the ranking query
// and the Saved list — without this it'd be a full collection scan per user
// on every feed request.
newsInteractionSchema.index({ user: 1, saved: 1, updatedAt: -1 });
newsInteractionSchema.index({ user: 1, notInterested: 1 });

const NewsInteraction = mongoose.model("NewsInteraction", newsInteractionSchema);

export default NewsInteraction;
