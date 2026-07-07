import mongoose from "mongoose";

const circleSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    tags: [String],

    visibility: {
      type: String,
      enum: ["public", "private", "invite-only"],
      default: "public",
    },

    membersCount: {
      type: Number,
      default: 0,
    },

    postsCount: {
      type: Number,
      default: 0,
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

circleSchema.index({ name: "text", description: "text", tags: "text" });
circleSchema.index({ membersCount: -1 });
// Matches getCircles' actual filter+sort shape ({isDeleted:false,
// visibility:"public"} sorted by membersCount) so it can be served from the
// index instead of a collection scan as circles grow.
circleSchema.index({ isDeleted: 1, visibility: 1, membersCount: -1 });

export default mongoose.model("Circle", circleSchema);