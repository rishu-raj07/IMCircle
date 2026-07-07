import mongoose from "mongoose";

const searchEventSchema = new mongoose.Schema(
  {
    searcher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    query: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    resultType: {
      type: String,
      enum: ["user", "post", "learning", "opportunity", "journey", "circle", "project"],
      default: "user",
    },

    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    action: {
      type: String,
      enum: ["appeared", "clicked"],
      required: true,
    },
  },
  { timestamps: true }
);

searchEventSchema.index({ owner: 1, action: 1, createdAt: -1 });
searchEventSchema.index({ query: 1, createdAt: -1 });

export default mongoose.model("SearchEvent", searchEventSchema);