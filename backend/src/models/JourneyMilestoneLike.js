import mongoose from "mongoose";
import JourneyMilestone from "./JourneyMilestone.js";
import User from "./User.js";
import notificationService from "../services/notification.service.js";

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

    // See JourneyFollower.js for the same fix and full explanation — this
    // hook had the identical bug (message with no actor name at all), PLUS
    // a second one: it called Notification.create() directly instead of
    // going through notificationService.create(), which is the one place
    // that also fires the socket "new_notification" event (live badge +
    // sound while the app is open) and the actual phone push (see
    // push.service.js). Bypassing it meant a journey like only ever showed
    // up if you happened to manually open the Notifications page — no
    // push, no sound, no live badge, unlike every other notification type.
    const actor = await User.findById(actorId).select("fullName").lean();
    const actorName = actor?.fullName || "Someone";

    await notificationService.create({
      recipientId: ownerId,
      actorId,
      type: "journey_like",
      entityType: "journey_milestone",
      entityId: milestone._id,
      title: "New journey like",
      message: `${actorName} liked your journey`,
      metadata: {
        journeyId: journey?._id,
        journey: journey?._id,
        milestone: milestone?._id,
      },
      dedupe: true,
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
