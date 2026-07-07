import BuilderScore from "../models/BuilderScore.js";
import BuilderActivity from "../models/BuilderActivity.js";
import Journey from "../models/Journey.js";
import { getOrCreateBuilderScore } from "../services/builderScore.service.js";

// A streak is only meaningful while a journey is actually running. If the
// user has no active journey right now, the streak they see should read 0
// (even though the underlying record may still hold a past value) — that
// value only comes back to life once they start/resume updating a journey.
// `longestStreak` is a lifetime best, so it's left untouched.
const withDisplayStreak = async (builderScore, userId) => {
  const doc = builderScore?.toObject ? builderScore.toObject() : builderScore;
  if (!doc) return doc;

  const hasActiveJourney = await Journey.exists({
    creator: userId,
    isDeleted: false,
    status: { $nin: ["completed", "uncompleted"] },
  });

  return {
    ...doc,
    currentStreak: hasActiveJourney ? doc.currentStreak : 0,
  };
};

export const getMyBuilderScore = async (req, res) => {
  try {
    const builderScore = await getOrCreateBuilderScore(req.user._id);

    const recentActivities = await BuilderActivity.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      builderScore: await withDisplayStreak(builderScore, req.user._id),
      recentActivities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getUserBuilderScore = async (req, res) => {
  try {
    const builderScore = await getOrCreateBuilderScore(req.params.userId);

    res.status(200).json({
      success: true,
      builderScore: await withDisplayStreak(builderScore, req.params.userId),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getBuilderLeaderboard = async (req, res) => {
  try {
    const leaderboard = await BuilderScore.find({})
      .populate("user", "fullName username avatar headline location role")
      .sort({ score: -1, currentStreak: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};