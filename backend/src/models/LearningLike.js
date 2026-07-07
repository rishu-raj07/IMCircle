import mongoose from "mongoose";

const learningLikeSchema = new mongoose.Schema(
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

learningLikeSchema.index({ learning: 1, user: 1 }, { unique: true });

export default mongoose.model("LearningLike", learningLikeSchema);