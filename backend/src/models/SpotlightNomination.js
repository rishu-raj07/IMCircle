import mongoose from "mongoose";

// A member-submitted nomination for something to be considered for a
// future Spotlight week (Part 25 — "Users can nominate a Post / Journey /
// Learning / Milestone / Startup for Spotlight. Admin dashboard approves.").
// Approving a nomination does NOT automatically create a SpotlightWinner —
// it just surfaces the nomination to whoever runs the next generation pass
// as a signal; the actual winner pick still goes through
// generateWeeklySpotlight() or a manual admin editWinner call.
const spotlightNominationSchema = new mongoose.Schema(
  {
    nominator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
    },

    targetType: {
      type: String,
      enum: ["post", "journey", "learning", "milestone", "user", "startup"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Resolved at submission time so the admin list/detail views never
    // need to guess which collection targetId lives in.
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    note: {
      type: String,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

spotlightNominationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("SpotlightNomination", spotlightNominationSchema);
