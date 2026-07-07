import mongoose from "mongoose";

const learningRepostSchema = new mongoose.Schema(
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

    caption: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

learningRepostSchema.index({ learning: 1, user: 1 }, { unique: true });

export default mongoose.model("LearningRepost", learningRepostSchema);