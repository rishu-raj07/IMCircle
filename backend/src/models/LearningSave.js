import mongoose from "mongoose";

const learningSaveSchema = new mongoose.Schema(
  {
    learning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Learning",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

learningSaveSchema.index({ learning: 1, user: 1 }, { unique: true });

export default mongoose.model("LearningSave", learningSaveSchema);