import mongoose from "mongoose";

const journeyDayEditSchema = new mongoose.Schema(
  {
    oldDays: Number,
    newDays: Number,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const journeySchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    coverImagePublicId: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    targetDays: {
      type: Number,
      default: 100,
      min: 1,
      max: 3650,
    },

    totalDays: {
      type: Number,
      default: 100,
      min: 1,
      max: 3650,
    },

    deadline: {
      type: Date,
      default: null,
    },

    dayEditHistory: {
      type: [journeyDayEditSchema],
      default: [],
    },

    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    updatesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "completed", "uncompleted"],
      default: "active",
      index: true,
    },

    lastMilestoneAt: {
      type: Date,
      default: null,
    },

    missedDaysCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    uncompletedAt: {
      type: Date,
      default: null,
    },

    uncompletedReason: {
      type: String,
      default: "",
    },

    finalNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    finalNoteAt: {
      type: Date,
      default: null,
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

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
  },
  {
    timestamps: true,
  }
);

journeySchema.index({ creator: 1, createdAt: -1 });
journeySchema.index({
  isDeleted: 1,
  isPublic: 1,
  status: 1,
  createdAt: -1,
});

export default mongoose.model("Journey", journeySchema);
