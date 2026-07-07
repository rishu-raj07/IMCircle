import mongoose from "mongoose";

const circlePostSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    content: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "announcement",
        "learning",
        "resource",
        "opportunity",
        "event",
        "poll",
        "update",
      ],
      default: "announcement",
    },

    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file"],
        },
        publicId: String,
      },
    ],

    image: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CirclePost",
      default: null,
    },

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    saves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isPinned: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    impressionsCount: {
  type: Number,
  default: 0,
},
  },
  { timestamps: true }
);

circlePostSchema.index({ circle: 1, createdAt: -1 });
// getCirclePosts filters out isDeleted:false within a circle before sorting
// by createdAt — this compound index matches that shape directly.
circlePostSchema.index({ circle: 1, isDeleted: 1, createdAt: -1 });


export default mongoose.model("CirclePost", circlePostSchema);