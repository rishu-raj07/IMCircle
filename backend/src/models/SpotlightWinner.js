import mongoose from "mongoose";

// One row per (weekKey, category) — the winner of that category that week.
// `reason` is a short list of bullet points ("Completed 18 Journey Days",
// "Reached 5,000 Followers", ...) rendered verbatim on the weekly
// recognition card and permanently on the winner's profile Spotlight
// Archive. `user` can be reassigned by an admin (editWinner) without
// touching the underlying metric snapshot, which is kept in `metric` for
// audit/debugging.
const spotlightWinnerSchema = new mongoose.Schema(
  {
    week: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpotlightWeek",
      required: true,
      index: true,
    },

    weekKey: {
      type: String,
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
    },

    // Only meaningful for the "Top Active" leaderboard rows, whose
    // `category` is "activity_rank_<N>" (see generateWeeklyActivityBoard in
    // spotlight.service.js) — this is just that same N as a real number,
    // so the frontend/admin UI can sort/label rows without parsing the
    // category string. Left null for every ordinary category.
    position: {
      type: Number,
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: [
      {
        type: String,
        trim: true,
        maxlength: 200,
      },
    ],

    metricLabel: {
      type: String,
      default: "",
    },

    metricValue: {
      type: Number,
      default: 0,
    },

    // "algorithm" = picked automatically by generateWeeklySpotlight().
    // "admin" = admin created it directly or overrode the algorithmic pick
    // via editWinner — kept so the admin UI can show which winners were
    // hand-picked vs. computed.
    setBy: {
      type: String,
      enum: ["algorithm", "admin"],
      default: "algorithm",
    },

    // Product-Hunt/Peerlist-style community upvotes on this week's pick —
    // separate from the algorithmic ranking signal (metricValue), this is
    // pure crowd approval. Stored as user IDs (not just a count) so we can
    // toggle per-user and show "upvoted by me" state.
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Unchanged from before — still just (weekKey, category). The "Top Active"
// leaderboard positions each get their own category string
// ("activity_rank_1", "activity_rank_2", ...) instead of sharing one
// category value + a position field in this index, specifically so this
// existing unique index never has to change (no index migration needed on
// an already-deployed collection).
spotlightWinnerSchema.index({ weekKey: 1, category: 1 }, { unique: true });
spotlightWinnerSchema.index({ user: 1, weekKey: -1 });

export default mongoose.model("SpotlightWinner", spotlightWinnerSchema);
