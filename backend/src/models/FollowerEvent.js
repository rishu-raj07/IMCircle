import mongoose from "mongoose";

const followerEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["follow", "unfollow"],
      required: true,
    },
  },
  { timestamps: true }
);

followerEventSchema.index({ user: 1, createdAt: -1 });
followerEventSchema.index({ follower: 1, user: 1 });

export default mongoose.model("FollowerEvent", followerEventSchema);