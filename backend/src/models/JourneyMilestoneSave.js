import mongoose from "mongoose";

const journeyMilestoneSaveSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

journeyMilestoneSaveSchema.index(
  { milestone: 1, user: 1 },
  { unique: true }
);

export default mongoose.model(
  "JourneyMilestoneSave",
  journeyMilestoneSaveSchema
);