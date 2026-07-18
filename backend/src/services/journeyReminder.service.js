import cron from "node-cron";

import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import notificationService from "./notification.service.js";

function getJourneyDay(createdAt) {
  const startDate = new Date(createdAt);
  const today = new Date();

  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return (
    Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );
}

async function createJourneyReminder(label) {
  try {
    const journeys = await Journey.find({
      isDeleted: false,
      isActive: true,
      isPublic: true,
      status: "active",
    }).select("_id creator title createdAt targetDays totalDays");

    // Temporary visibility, same pattern as push.service.js — this cron
    // firing correctly and finding zero eligible journeys (e.g. everyone's
    // journey is private, or already posted today, or past its target day
    // count) looks IDENTICAL from a user's perspective to the cron never
    // running at all: no notification either way. This makes the two
    // distinguishable in `pm2 logs` instead of only ever seeing silence.
    console.log(
      `[journeyReminder] "${label}" run: ${journeys.length} active/public journey(s) found.`
    );

    let sent = 0;
    let skippedAlreadyPosted = 0;
    let skippedPastTarget = 0;

    for (const journey of journeys) {
      const dayNumber = getJourneyDay(journey.createdAt);
      const maxDays = journey.targetDays || journey.totalDays || 100;

      if (dayNumber > maxDays) {
        skippedPastTarget += 1;
        continue;
      }

      const alreadyPosted = await JourneyMilestone.findOne({
        journey: journey._id,
        creator: journey.creator,
        day: dayNumber,
        isDeleted: false,
      }).select("_id");

      if (alreadyPosted) {
        skippedAlreadyPosted += 1;
        continue;
      }

      const title = `Update your Day ${dayNumber} journey`;

      let message = `Don't break your journey. Post your Day ${dayNumber} progress update.`;

      if (label === "evening") {
        message = `Evening reminder: your Day ${dayNumber} journey update is still pending.`;
      }

      if (label === "final") {
        message = `Final reminder: post your Day ${dayNumber} journey update before the day ends.`;
      }

      // This is a self-reminder — the "actor" is the system, not another
      // user, so allowSelf bypasses the self-notification guard. The
      // dedupe key is built from (type, entityType, entityId, actor,
      // recipient) — entityId is the journey, which stays the same across
      // days, so `label` is folded into `type` (journey_reminder_morning,
      // _evening, _final) to keep the three daily slots distinct from each
      // other. A new day's reminder resurfaces (and re-marks unread) the
      // same slot from the previous day rather than piling up a fresh row
      // per day forever, which is the desired behavior for a recurring
      // nudge like this.
      await notificationService.create({
        recipientId: journey.creator,
        actorId: journey.creator,
        type: `journey_reminder_${label}`,
        entityType: "journey",
        entityId: journey._id,
        title,
        message,
        metadata: { journey: journey._id, day: dayNumber, reminderType: label },
        dedupe: true,
        allowSelf: true,
      });

      sent += 1;
    }

    console.log(
      `[journeyReminder] "${label}" done: ${sent} sent, ${skippedAlreadyPosted} already posted today, ${skippedPastTarget} past their target day count.`
    );
  } catch (error) {
    console.error("Journey reminder error:", error);
  }
}

async function markMissedJourneysUncompleted() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const journeys = await Journey.find({
      isDeleted: false,
      isActive: true,
      isPublic: true,
      status: "active",
    }).select("_id creator createdAt targetDays totalDays");

    for (const journey of journeys) {
      const startDate = new Date(journey.createdAt);
      startDate.setHours(0, 0, 0, 0);

      const currentDay =
        Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      const maxDays = Number(journey.targetDays || journey.totalDays || 100);

      if (currentDay > maxDays) {
        journey.status = "completed";
        journey.isActive = false;
        await journey.save();
        continue;
      }

      if (currentDay <= 1) continue;

      const yesterdayDay = currentDay - 1;

      const yesterdayPost = await JourneyMilestone.findOne({
        journey: journey._id,
        creator: journey.creator,
        day: yesterdayDay,
        isDeleted: false,
      }).select("_id");

      if (!yesterdayPost) {
        journey.status = "uncompleted";
        journey.isActive = false;
        journey.uncompletedAt = new Date();
        journey.uncompletedReason = `Missed Day ${yesterdayDay} update`;
        journey.missedDaysCount = (journey.missedDaysCount || 0) + 1;

        await journey.save();
      }
    }
  } catch (error) {
    console.error("Mark missed journey error:", error);
  }
}

export function startJourneyReminderJobs() {
  cron.schedule("5 0 * * *", markMissedJourneysUncompleted, {
    timezone: "Asia/Kolkata",
  });

  cron.schedule("0 8 * * *", () => createJourneyReminder("morning"), {
    timezone: "Asia/Kolkata",
  });

  cron.schedule("0 17 * * *", () => createJourneyReminder("evening"), {
    timezone: "Asia/Kolkata",
  });

  cron.schedule("0 20 * * *", () => createJourneyReminder("final"), {
    timezone: "Asia/Kolkata",
  });

  console.log("Journey reminder jobs started");
}