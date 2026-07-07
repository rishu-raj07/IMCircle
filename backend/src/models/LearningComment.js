import mongoose from "mongoose";

const learningCommentSchema = new mongoose.Schema(
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

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

learningCommentSchema.index({ learning: 1, createdAt: -1 });

export default mongoose.model("LearningComment", learningCommentSchema);