import mongoose from "mongoose";

const journeyMilestoneRepostSchema = new mongoose.Schema(
  {
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JourneyMilestone",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

journeyMilestoneRepostSchema.index(
  { milestone: 1, user: 1 },
  { unique: true }
);

export default mongoose.model(
  "JourneyMilestoneRepost",
  journeyMilestoneRepostSchema
);