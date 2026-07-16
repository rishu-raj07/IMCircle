import mongoose from "mongoose";

// A lightweight registry, not a full-text index — content itself still
// stores the raw text with "#tag" inline; this collection only exists so
// trending/search over hashtags doesn't require scanning every Post/
// Learning/JourneyMilestone document. `usageCount` is all-time,
// `lastUsedAt` is what trending sorts on (recently-active tags first).
const hashtagSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

hashtagSchema.index({ lastUsedAt: -1 });
hashtagSchema.index({ usageCount: -1 });

export default mongoose.model("Hashtag", hashtagSchema);
