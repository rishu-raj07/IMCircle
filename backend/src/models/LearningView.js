import mongoose from "mongoose";

const learningViewSchema = new mongoose.Schema(
  {
    learning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Learning",
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

learningViewSchema.index(
  { learning: 1, user: 1 },
  { unique: true }
);

export default mongoose.model("LearningView", learningViewSchema);