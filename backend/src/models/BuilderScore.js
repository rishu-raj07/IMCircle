import mongoose from "mongoose";

const builderScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },

    level: {
      type: String,
      default: "Explorer",
    },

    currentStreak: {
      type: Number,
      default: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
    },

    lastActiveDate: {
      type: Date,
      default: null,
    },

    journeyUpdates: {
      type: Number,
      default: 0,
    },

    winsShared: {
      type: Number,
      default: 0,
    },

    failuresShared: {
      type: Number,
      default: 0,
    },

    lessonsShared: {
      type: Number,
      default: 0,
    },

    opportunitiesPosted: {
      type: Number,
      default: 0,
    },

    opportunitiesApplied: {
      type: Number,
      default: 0,
    },

    seasonScore: {
      type: Number,
      default: 0,
    },

    lifetimeScore: {
      type: Number,
      default: 0,
    },
    learningsShared: {
  type: Number,
  default: 0,
},
  },
  { timestamps: true }
);

export default mongoose.model("BuilderScore", builderScoreSchema);