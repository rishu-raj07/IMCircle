import BuilderScore from "../models/BuilderScore.js";
import BuilderActivity from "../models/BuilderActivity.js";

const POINTS = {
  JOURNEY_UPDATE: 10,
  WIN_SHARED: 18,
  FAILURE_SHARED: 25,
  LESSON_SHARED: 15,
  OPPORTUNITY_POSTED: 10,
  OPPORTUNITY_APPLIED: 5,
  LEARNING_SHARED: 5,
};

const getLevel = (score) => {
  if (score >= 850) return "Legend";
  if (score >= 650) return "Elite Builder";
  if (score >= 450) return "Creator";
  if (score >= 250) return "Builder";
  if (score >= 100) return "Learner";
  return "Explorer";
};

const isSameDay = (date1, date2) =>
  date1.toDateString() === date2.toDateString();

const isYesterday = (lastDate, today) => {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return lastDate.toDateString() === yesterday.toDateString();
};

// Only activity that happens *inside* an active journey (a daily update,
// or a win/failure/lesson posted as part of one) should move the streak.
// Generic actions like sharing a "Learning of the Day" or posting/applying
// to an opportunity still earn points, but they don't require you to have
// a journey running, so they shouldn't be able to keep a journey streak
// alive on their own.
const STREAK_ELIGIBLE_TYPES = new Set([
  "JOURNEY_UPDATE",
  "WIN_SHARED",
  "FAILURE_SHARED",
  "LESSON_SHARED",
]);

export const addBuilderScore = async ({
  userId,
  type,
  referenceId = null,
  referenceModel = "",
}) => {
  const points = POINTS[type] || 0;
  if (!points) return null;

  const today = new Date();

  let scoreDoc = await BuilderScore.findOne({ user: userId });

  if (!scoreDoc) {
    scoreDoc = await BuilderScore.create({
      user: userId,
    });
  }

  if (STREAK_ELIGIBLE_TYPES.has(type)) {
    const lastActive = scoreDoc.lastActiveDate;

    if (!lastActive) {
      scoreDoc.currentStreak = 1;
    } else if (isSameDay(lastActive, today)) {
      // same day, streak unchanged
    } else if (isYesterday(lastActive, today)) {
      scoreDoc.currentStreak += 1;
    } else {
      scoreDoc.currentStreak = 1;
    }

    scoreDoc.longestStreak = Math.max(
      scoreDoc.longestStreak,
      scoreDoc.currentStreak
    );

    scoreDoc.lastActiveDate = today;
  }

  scoreDoc.score = Math.min(scoreDoc.score + points, 1000);
  scoreDoc.seasonScore += points;
  scoreDoc.lifetimeScore += points;
  scoreDoc.level = getLevel(scoreDoc.score);

  if (type === "JOURNEY_UPDATE") scoreDoc.journeyUpdates += 1;
  if (type === "WIN_SHARED") scoreDoc.winsShared += 1;
  if (type === "FAILURE_SHARED") scoreDoc.failuresShared += 1;
  if (type === "LESSON_SHARED") scoreDoc.lessonsShared += 1;
  if (type === "OPPORTUNITY_POSTED") scoreDoc.opportunitiesPosted += 1;
  if (type === "OPPORTUNITY_APPLIED") scoreDoc.opportunitiesApplied += 1;
  if (type === "LEARNING_SHARED") scoreDoc.learningsShared += 1;

  await scoreDoc.save();

  await BuilderActivity.create({
    user: userId,
    type,
    points,
    referenceId,
    referenceModel,
  });

  return scoreDoc;
};

export const getOrCreateBuilderScore = async (userId) => {
  let scoreDoc = await BuilderScore.findOne({ user: userId }).populate(
    "user",
    "fullName username avatar headline"
  );

  if (!scoreDoc) {
    scoreDoc = await BuilderScore.create({ user: userId });
    scoreDoc = await BuilderScore.findById(scoreDoc._id).populate(
      "user",
      "fullName username avatar headline"
    );
  }

  return scoreDoc;
};