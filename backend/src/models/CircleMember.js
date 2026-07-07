import mongoose from "mongoose";

const circleMemberSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "moderator", "member"],
      default: "member",
    },

    status: {
      type: String,
      enum: ["active", "restricted"],
      default: "active",
    },
  },
  { timestamps: true }
);

circleMemberSchema.index({ circle: 1, user: 1 }, { unique: true });

export default mongoose.model("CircleMember", circleMemberSchema);