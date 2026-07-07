import mongoose from "mongoose";

const builderActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "JOURNEY_UPDATE",
        "WIN_SHARED",
        "FAILURE_SHARED",
        "LESSON_SHARED",
        "OPPORTUNITY_POSTED",
        "OPPORTUNITY_APPLIED",
        "LEARNING_SHARED", // ⭐ Added
      ],
      required: true,
    },

    points: {
      type: Number,
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceModel: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

builderActivitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("BuilderActivity", builderActivitySchema);