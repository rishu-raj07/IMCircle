import User from "../models/User.js";
import UserBadge from "../models/UserBadge.js";
import BuilderScore from "../models/BuilderScore.js";
import { getSignupRankBadge } from "../utils/badges.js";
import { BADGE_CATALOG, isValidBadgeKey } from "../constants/badgeCatalog.js";
import notificationService from "./notification.service.js";

// Idempotent — awarding a badge a user already has is a no-op, not an
// error, so callers (auto-evaluation, Spotlight generation, admin actions)
// never need to check "do they already have this?" first.
export async function awardBadge(userId, badgeKey, opts = {}) {
  if (!userId || !isValidBadgeKey(badgeKey)) return null;

  const { source = "auto", weekKey = "", awardedBy = null, note = "" } = opts;

  try {
    // rawResult so we can tell "just inserted" apart from "already had it" —
    // the notification below must only fire on a genuinely new award, not
    // every time evaluateAutoBadges() re-checks an already-earned badge.
    const result = await UserBadge.findOneAndUpdate(
      { user: userId, badgeKey },
      {
        $setOnInsert: {
          user: userId,
          badgeKey,
          source,
          weekKey,
          awardedBy,
          note,
          awardedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
    );

    const badge = result?.value;
    const wasNewlyAwarded = Boolean(result?.lastErrorObject?.upserted);

    if (wasNewlyAwarded && badge) {
      const catalogEntry = BADGE_CATALOG.find((item) => item.key === badgeKey);
      const badgeName = catalogEntry?.name || catalogEntry?.label || "a new badge";

      // The actor here IS the recipient (badges are awarded to you, not by
      // another user acting on you) — notificationService's self-action
      // guard would normally block that, so awardedBy (an admin) is used as
      // the actor when present, otherwise the system itself.
      notificationService
        .create({
          recipientId: userId,
          actorId: awardedBy || userId,
          type: "badge",
          entityType: "badge",
          entityId: badge._id,
          metadata: { badgeKey },
          message: `You earned the "${badgeName}" badge`,
          allowSelf: true,
        })
        .catch(() => {});
    }

    return badge;
  } catch (error) {
    // Duplicate-key race under concurrent evaluation — the badge exists
    // either way, so this is safe to swallow.
    if (error?.code === 11000) return null;
    throw error;
  }
}

export async function revokeBadge(userId, badgeKey) {
  if (!userId || !badgeKey) return false;
  const result = await UserBadge.deleteOne({ user: userId, badgeKey });
  return result.deletedCount > 0;
}

export async function getUserBadgeKeys(userId) {
  const rows = await UserBadge.find({ user: userId }).select("badgeKey").lean();
  return rows.map((row) => row.badgeKey);
}

// Runs the "auto" half of the catalog against a user's current stats and
// awards anything newly earned. Cheap enough (a handful of indexed
// lookups) to call on demand — profile views and badge-list reads both
// call this before reading UserBadge, so badges never go stale waiting on
// a background job.
export async function evaluateAutoBadges(userId) {
  const user = await User.findById(userId).select(
    "createdAt role field experience verification primaryInterest isDeleted"
  );
  if (!user || user.isDeleted) return [];

  const [builderScore, { signupRank }] = await Promise.all([
    BuilderScore.findOne({ user: userId }).select("longestStreak"),
    getSignupRankBadge(user.createdAt),
  ]);

  const earned = [];

  if (signupRank) {
    if (signupRank <= 10) earned.push("early_builder");
    if (signupRank <= 50) earned.push("top_50_member");
    if (signupRank <= 100) earned.push("top_100_member");
  }

  const longestStreak = builderScore?.longestStreak || 0;
  if (longestStreak >= 100) earned.push("day_100_journey");
  if (longestStreak >= 365) earned.push("day_365_journey");

  const verification = user.verification || {};
  if (
    verification.email ||
    verification.mobile ||
    verification.aadhaar ||
    verification.business ||
    verification.professional
  ) {
    earned.push("verified_builder");
  }

  const isFounderRole =
    user.role === "Founder" ||
    (user.experience || []).some((item) => item.employmentType === "Founder");
  if (isFounderRole) earned.push("founder");

  if (user.role === "Creator") earned.push("creator");
  if (user.field === "Tech") earned.push("developer");
  if (user.field === "Design") earned.push("designer");

  if (earned.length === 0) return [];

  await Promise.all(earned.map((badgeKey) => awardBadge(userId, badgeKey, { source: "auto" })));

  return earned;
}

// Combines the auto-evaluated set with whatever is already persisted
// (spotlight + manual awards), returning the full catalog annotated with
// `earned` so the frontend can render both held and locked badges in one
// pass without a second request.
export async function getUserBadgeProfile(userId) {
  await evaluateAutoBadges(userId).catch(() => []);

  const rows = await UserBadge.find({ user: userId }).sort({ awardedAt: -1 }).lean();
  const earnedByKey = new Map(rows.map((row) => [row.badgeKey, row]));

  const badges = BADGE_CATALOG.map((badge) => ({
    ...badge,
    earned: earnedByKey.has(badge.key),
    awardedAt: earnedByKey.get(badge.key)?.awardedAt || null,
    weekKey: earnedByKey.get(badge.key)?.weekKey || "",
  }));

  return {
    badges,
    earnedCount: rows.length,
  };
}
