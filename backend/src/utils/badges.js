import User from "../models/User.js";

// Permanent "early member" badge based purely on signup order (createdAt).
// Computed on demand instead of stored — since createdAt never changes for
// an existing user, this rank is stable forever without needing a migration
// or a counter that could drift/race under concurrent signups.
export async function getSignupRankBadge(createdAt) {
  if (!createdAt) return { signupRank: null, rankBadge: null };

  const usersBefore = await User.countDocuments({
    createdAt: { $lt: createdAt },
    isDeleted: { $ne: true },
  });

  const signupRank = usersBefore + 1;

  let rankBadge = null;
  if (signupRank <= 10) rankBadge = "top10";
  else if (signupRank <= 100) rankBadge = "top100";
  else if (signupRank <= 1000) rankBadge = "top1000";

  return { signupRank, rankBadge };
}

// Permanent streak-milestone badge, based on the longest streak the person
// has ever reached (BuilderScore.longestStreak) — not the current streak,
// so completing a milestone once keeps the card even after a streak breaks.
export function getStreakMilestoneBadge(longestStreak = 0) {
  const streak = Number(longestStreak) || 0;

  if (streak >= 365) return "diamond";
  if (streak >= 182) return "gold";
  if (streak >= 100) return "bronze";
  if (streak >= 50) return "copper";
  return null;
}
