import mongoose from "mongoose";

const journeyMilestoneCommentSchema = new mongoose.Schema(
  {
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JourneyMilestone",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

journeyMilestoneCommentSchema.index({
  milestone: 1,
  createdAt: -1,
});

export default mongoose.model(
  "JourneyMilestoneComment",
  journeyMilestoneCommentSchema
);