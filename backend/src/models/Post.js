import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional — a post can be just an image or just a voice note. The
    // validator (post.validator.js) enforces that at least one of
    // content/media exists at request time; this schema no longer requires
    // content on its own.
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    purpose: {
      type: String,
      enum: ["general", "achievement", "question", "query", "opportunity"],
      default: "general",
      index: true,
    },

    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "audio", "file"],
        },
        publicId: String,
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
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    replyingToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],

    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
reposts: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],
shares: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],
    visibility: {
      type: String,
      enum: ["public", "followers", "circle"],
      default: "public",
    },
    impressionsCount: {
  type: Number,
  default: 0,
},

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ isDeleted: 1 });

// The single-field indexes above don't help the two hottest queries —
// the main feed (`{isDeleted:false, ...cursor}` sorted by createdAt/_id) and
// a user's own posts (`{author, isDeleted:false}` sorted by createdAt) — both
// of which currently fall back to scanning+sorting in memory as post volume
// grows. These compound indexes let Mongo satisfy filter+sort in one pass.
postSchema.index({ isDeleted: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
