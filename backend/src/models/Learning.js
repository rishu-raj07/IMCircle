import mongoose from "mongoose";

const learningSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    topic: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },

    type: {
      type: String,
      enum: ["learning", "resource", "tool", "tip", "mistake"],
      default: "learning",
    },

    media: [
      {
        url: {
          type: String,
          default: "",
        },
        type: {
          type: String,
          enum: ["image", "video", "file"],
          default: "image",
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    savesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    repostsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    impressionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

learningSchema.index({ title: "text", content: "text", tags: "text", topic: "text" });
learningSchema.index({ createdAt: -1 });

export default mongoose.model("Learning", learningSchema);