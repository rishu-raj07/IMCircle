import mongoose from "mongoose";

// A request from a user to join an "invite-only" circle. Distinct from
// CircleInvite (owner/admin invites a specific person) and from CircleRequest
// (the personal 1:1 "add to my connections" request, unrelated to any
// community) — this one is the user asking to get into a specific community
// that isn't open for anyone to join freely.
const circleJoinRequestSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

circleJoinRequestSchema.index(
  { circle: 1, user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("CircleJoinRequest", circleJoinRequestSchema);
