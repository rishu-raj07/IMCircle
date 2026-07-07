import mongoose from "mongoose";

const feedViewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: [
        "post",
        "learning",
        "journey_milestone",
        "repost",
        "opportunity",
        "project",
        "job",
      ],
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    visibleMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    position: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

feedViewSchema.index(
  { user: 1, itemId: 1, itemType: 1, sessionId: 1 },
  { unique: true }
);
feedViewSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("FeedView", feedViewSchema);
