import mongoose from "mongoose";
import JourneyMilestone from "./JourneyMilestone.js";
import Notification from "./Notification.js";

const journeyMilestoneLikeSchema = new mongoose.Schema(
  {
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JourneyMilestone",
    },
    journeyMilestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JourneyMilestone",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

journeyMilestoneLikeSchema.index(
  { milestone: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      milestone: { $exists: true },
      user: { $exists: true },
    },
  }
);

journeyMilestoneLikeSchema.pre("validate", function normalizeLikeFields() {
  if (!this.milestone && this.journeyMilestone) {
    this.milestone = this.journeyMilestone;
  }

  if (!this.journeyMilestone && this.milestone) {
    this.journeyMilestone = this.milestone;
  }
});

async function createJourneyLikeNotification(doc) {
  try {
    const milestoneId = doc.milestone || doc.journeyMilestone;
    const actorId = doc.user;

    if (!milestoneId || !actorId) return;

    const milestone = await JourneyMilestone.findById(milestoneId).populate("journey");
    const journey = milestone?.journey;
    const ownerId =
      milestone?.owner ||
      milestone?.creator ||
      milestone?.author ||
      milestone?.user ||
      milestone?.createdBy ||
      journey?.owner ||
      journey?.creator ||
      journey?.author ||
      journey?.user ||
      journey?.createdBy;

    if (!ownerId || String(ownerId) === String(actorId)) return;

    const existing = await Notification.findOne({
      recipient: ownerId,
      sender: actorId,
      type: "journey_like",
      "data.milestone": milestone._id,
    });

    if (existing) return;

    await Notification.create({
      recipient: ownerId,
      receiver: ownerId,
      user: ownerId,
      sender: actorId,
      actor: actorId,
      type: "journey_like",
      title: "New journey like",
      message: "liked your journey",
      link: journey?._id ? `/journey/${journey._id}` : "",
      data: {
        journey: journey?._id,
        milestone: milestone?._id,
      },
    });
  } catch (error) {
    console.error("Journey like notification failed:", error.message);
  }
}

journeyMilestoneLikeSchema.post("save", async function notifyJourneyOwner(doc) {
  await createJourneyLikeNotification(doc);
});

journeyMilestoneLikeSchema.post("findOneAndUpdate", async function notifyJourneyOwner(doc) {
  if (doc) {
    await createJourneyLikeNotification(doc);
  }
});

const JourneyMilestoneLike =
  mongoose.models.JourneyMilestoneLike ||
  mongoose.model("JourneyMilestoneLike", journeyMilestoneLikeSchema);

export default JourneyMilestoneLike;
