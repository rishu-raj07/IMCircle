import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema(
  {
    profileUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    source: {
      type: String,
      enum: ["profile", "search", "feed", "network", "direct"],
      default: "direct",
    },
  },
  { timestamps: true }
);

profileViewSchema.index({ profileUser: 1, createdAt: -1 });
profileViewSchema.index({ viewer: 1, createdAt: -1 });

export default mongoose.model("ProfileView", profileViewSchema);