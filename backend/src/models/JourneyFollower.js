import mongoose from "mongoose";
import Journey from "./Journey.js";
import Notification from "./Notification.js";

const journeyFollowerSchema = new mongoose.Schema(
  {
    journey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Journey",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

journeyFollowerSchema.index(
  { journey: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      journey: { $exists: true },
      user: { $exists: true },
    },
  }
);

journeyFollowerSchema.pre("validate", function normalizeFollowerFields() {
  if (!this.user && this.follower) {
    this.user = this.follower;
  }

  if (!this.follower && this.user) {
    this.follower = this.user;
  }
});

async function createJourneyFollowNotification(doc) {
  try {
    const actorId = doc.user || doc.follower;
    const journeyId = doc.journey;

    if (!actorId || !journeyId) return;

    const journey = await Journey.findById(journeyId);
    const ownerId =
      journey?.owner ||
      journey?.creator ||
      journey?.author ||
      journey?.user ||
      journey?.createdBy;

    if (!ownerId || String(ownerId) === String(actorId)) return;

    const existing = await Notification.findOne({
      recipient: ownerId,
      sender: actorId,
      type: "journey_follow",
      "data.journey": journey._id,
    });

    if (existing) return;

    await Notification.create({
      recipient: ownerId,
      receiver: ownerId,
      user: ownerId,
      sender: actorId,
      actor: actorId,
      type: "journey_follow",
      title: "New journey follower",
      message: "started following your journey",
      link: `/journey/${journey._id}`,
      data: {
        journey: journey._id,
      },
    });
  } catch (error) {
    console.error("Journey follow notification failed:", error.message);
  }
}

journeyFollowerSchema.post("save", async function notifyJourneyOwner(doc) {
  await createJourneyFollowNotification(doc);
});

journeyFollowerSchema.post("findOneAndUpdate", async function notifyJourneyOwner(doc) {
  if (doc) {
    await createJourneyFollowNotification(doc);
  }
});

const JourneyFollower =
  mongoose.models.JourneyFollower ||
  mongoose.model("JourneyFollower", journeyFollowerSchema);

export default JourneyFollower;
