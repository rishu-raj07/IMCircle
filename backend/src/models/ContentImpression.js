import mongoose from "mongoose";

const contentImpressionSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: [
        "post",
        "learning",
        "journey",
        "journey_milestone",
        "project",
        "project_update",
        "circle",
        "circle_post",
        "opportunity",
      ],
      required: true,
      index: true,
    },

    contentId: {
      type: mongoose.Schema.Types.ObjectId,
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
      enum: ["feed", "profile", "search", "circle", "project", "direct"],
      default: "direct",
    },
  },
  { timestamps: true }
);

contentImpressionSchema.index({ contentType: 1, contentId: 1 });
contentImpressionSchema.index({ viewer: 1, createdAt: -1 });
contentImpressionSchema.index({ createdAt: -1 });

const ContentImpression = mongoose.model(
  "ContentImpression",
  contentImpressionSchema
);

export default ContentImpression;