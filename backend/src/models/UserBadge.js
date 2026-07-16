import mongoose from "mongoose";

// One document per (user, badgeKey) — badge metadata (label/icon/description)
// lives in constants/badgeCatalog.js, not here, so this stays a thin
// "who has earned what, and when" ledger. The unique compound index makes
// awarding idempotent: re-running badge.service.js's evaluateAutoBadges()
// or re-generating a Spotlight week never creates duplicate rows.
const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    badgeKey: {
      type: String,
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["auto", "spotlight", "manual"],
      default: "auto",
    },

    // Only set when source === "spotlight" — which week win triggered this
    // badge, so the profile's Spotlight Archive section and this badge stay
    // traceable back to the same event.
    weekKey: {
      type: String,
      default: "",
    },

    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    note: {
      type: String,
      maxlength: 300,
      default: "",
    },

    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userBadgeSchema.index({ user: 1, badgeKey: 1 }, { unique: true });

export default mongoose.model("UserBadge", userBadgeSchema);
