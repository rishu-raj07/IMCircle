import mongoose from "mongoose";

// Distinct from CircleRequest (which is the personal "add to my circle"
// connection request between two users). This tracks invites to join a
// specific community/Circle, so the invited person sees exactly which
// community they were invited to instead of a generic connection request.
const circleInviteSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
      index: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "joined", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

circleInviteSchema.index(
  { circle: 1, invitedUser: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("CircleInvite", circleInviteSchema);
