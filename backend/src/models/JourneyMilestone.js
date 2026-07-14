import mongoose from "mongoose";

const journeyMilestoneSchema = new mongoose.Schema(
  {
    journey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Journey",
      required: true,
      index: true,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    day: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    type: {
      type: String,
      enum: ["update", "win", "failure", "lesson"],
      default: "update",
    },

    images: [
      {
        url: String,
        publicId: String,
        type: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
      },
    ],

    achievement: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    capturedAt: {
      type: Date,
      default: null,
    },

    captureSource: {
      type: String,
      // "gallery" = picked from the device's photo library, but only ever
      // accepted by the frontend when the file's own date metadata puts it
      // on the same calendar day it's being posted — see isFromToday() in
      // UpdateJourney.jsx. Still distinct from "camera" so it stays
      // auditable which milestones came from a live capture vs a same-day
      // gallery pick.
      enum: ["camera", "gallery", "unknown"],
      default: "unknown",
    },

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

    repostsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    savesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sharesCount: {
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
  {
    timestamps: true,
  }
);

journeyMilestoneSchema.index({ journey: 1, day: 1 }, { unique: true });
journeyMilestoneSchema.index({ journey: 1, createdAt: -1 });
journeyMilestoneSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.model("JourneyMilestone", journeyMilestoneSchema);