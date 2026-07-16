import User from "../models/User.js";
import BuilderActivity from "../models/BuilderActivity.js";
import BuilderScore from "../models/BuilderScore.js";
import Learning from "../models/Learning.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import LearningComment from "../models/LearningComment.js";
import JourneyMilestoneComment from "../models/JourneyMilestoneComment.js";
import FollowerEvent from "../models/FollowerEvent.js";
import Post from "../models/Post.js";
import SpotlightWeek from "../models/SpotlightWeek.js";
import SpotlightWinner from "../models/SpotlightWinner.js";
import { SPOTLIGHT_CATEGORIES, isValidSpotlightCategory } from "../constants/spotlightCategories.js";
import { awardBadge } from "./badge.service.js";

const PUBLIC_FIELDS = "fullName username avatar headline field role primaryInterest gender";

// --- Year-week helpers --------------------------------------------------
// Deliberately NOT strict ISO-8601 (which can push early-January or
// late-December dates into the adjacent year's week 1 / week 52). Product
// wants a simpler, calendar-year-relative scheme instead:
//   - Week 1 of a year = Jan 1 through the first Sunday on/after Jan 1
//     (a short, partial week whenever Jan 1 isn't itself a Monday).
//   - Week 2 starts the following Monday, and every week after that is a
//     full Monday-Sunday block, all the way to the end of the year (the
//     final week of the year is clamped to Dec 31, so it may also be
//     partial).
//   - The count resets to Week 1 again on the next Jan 1, every year,
//     forever — there's no cross-year week numbering.
// This is what makes "Week 29" land on Jul 13–19, 2026: Jan 1, 2026 is a
// Thursday, so Week 1 is Jan 1–4, Week 2 starts Monday Jan 5, and 27 more
// full weeks after that lands on Jul 13.
function getFirstSundayOfYear(year) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Day = jan1.getUTCDay() || 7; // Mon=1 .. Sun=7
  const firstSunday = new Date(jan1);
  firstSunday.setUTCDate(jan1.getUTCDate() + (7 - jan1Day));
  return firstSunday;
}

export function getYearWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const year = d.getUTCFullYear();
  const firstSunday = getFirstSundayOfYear(year);

  let weekNumber;
  if (d <= firstSunday) {
    weekNumber = 1;
  } else {
    const daysSinceFirstSunday = Math.round((d - firstSunday) / 86400000);
    weekNumber = 2 + Math.floor((daysSinceFirstSunday - 1) / 7);
  }

  return {
    weekKey: `${year}-W${String(weekNumber).padStart(2, "0")}`,
    weekNumber,
    year,
  };
}

// Back-compat alias — same behavior as before under the old name, kept so
// nothing importing this by its previous name breaks.
export const getISOWeekKey = getYearWeekKey;

export function getCurrentWeekKey() {
  return getYearWeekKey(new Date());
}

export function getWeekRange(weekKey) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey || "");
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!year || !week || week < 1) return null;

  const firstSunday = getFirstSundayOfYear(year);

  let startDate;
  let endDate;

  if (week === 1) {
    startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    endDate = new Date(firstSunday);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    const monday = new Date(firstSunday);
    monday.setUTCDate(monday.getUTCDate() + 1 + (week - 2) * 7);
    monday.setUTCHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    startDate = monday;
    endDate = sunday;
  }

  // Clamp the last week of the year so it never spills into January of
  // the next year — that week is simply shorter than 7 days instead.
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  if (startDate > yearEnd) return null;
  if (endDate > yearEnd) endDate = yearEnd;

  return { startDate, endDate };
}

// Returns the last `count` weeks (oldest to newest, current week last) as
// plain metadata — no DB lookups, pure date math — for a week-picker strip
// that should always be scrollable/browsable even for weeks nobody has
// generated Spotlight data for yet.
export function listRecentWeekMetas(count = 12, fromDate = new Date()) {
  const { weekKey: currentKey } = getYearWeekKey(fromDate);
  const [currentYear, currentWeekNum] = (() => {
    const match = /^(\d{4})-W(\d{2})$/.exec(currentKey);
    return [Number(match[1]), Number(match[2])];
  })();

  const metas = [];
  let year = currentYear;
  let week = currentWeekNum;

  while (metas.length < count) {
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    const range = getWeekRange(weekKey);
    if (range) {
      metas.push({ weekKey, weekNumber: week, year, startDate: range.startDate, endDate: range.endDate });
    }

    if (week > 1) {
      week -= 1;
    } else {
      year -= 1;
      if (year < 2000) break; // sanity guard against runaway loops
      const decWeek = getYearWeekKey(new Date(Date.UTC(year, 11, 31)));
      week = decWeek.weekNumber;
    }
  }

  return metas.reverse();
}

// --- category scorers ---------------------------------------------------
// Each scorer returns { userId, reason: string[], metricLabel, metricValue }
// for the strongest candidate in [startDate, endDate], or null if nobody
// qualifies that week. All of these lean on signals that already exist in
// the app (BuilderActivity points, likes, comments, follower events) so a
// generated week always reflects real activity, never a synthetic score.

async function scoreByBuilderActivity({ startDate, endDate, roleFilter, fieldFilter }) {
  const userMatch = {};
  if (roleFilter) userMatch.role = roleFilter;
  if (fieldFilter) userMatch.field = fieldFilter;

  let eligibleUserIds = null;
  if (Object.keys(userMatch).length > 0) {
    eligibleUserIds = await User.find({ ...userMatch, isDeleted: { $ne: true } }).distinct("_id");
    if (eligibleUserIds.length === 0) return null;
  }

  const match = { createdAt: { $gte: startDate, $lte: endDate } };
  if (eligibleUserIds) match.user = { $in: eligibleUserIds };

  const [top] = await BuilderActivity.aggregate([
    { $match: match },
    { $group: { _id: "$user", totalPoints: { $sum: "$points" }, activityCount: { $sum: 1 } } },
    { $sort: { totalPoints: -1 } },
    { $limit: 1 },
  ]);

  if (!top || top.totalPoints <= 0) return null;

  return {
    userId: top._id,
    reason: [`Earned ${top.totalPoints} Builder points this week`, `${top.activityCount} activities logged`],
    metricLabel: "Builder points this week",
    metricValue: top.totalPoints,
  };
}

async function scoreFounderOfWeek({ startDate, endDate }) {
  const founderIds = await User.find({
    isDeleted: { $ne: true },
    $or: [{ role: "Founder" }, { "experience.employmentType": "Founder" }],
  }).distinct("_id");

  if (founderIds.length === 0) return null;

  const [top] = await BuilderActivity.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, user: { $in: founderIds } } },
    { $group: { _id: "$user", totalPoints: { $sum: "$points" } } },
    { $sort: { totalPoints: -1 } },
    { $limit: 1 },
  ]);

  if (!top || top.totalPoints <= 0) return null;

  return {
    userId: top._id,
    reason: [`Most active founder this week`, `${top.totalPoints} Builder points earned`],
    metricLabel: "Builder points this week",
    metricValue: top.totalPoints,
  };
}

async function scoreLearningOfWeek({ startDate, endDate }) {
  const [top] = await Learning.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } } },
    { $sort: { likesCount: -1 } },
    { $limit: 1 },
  ]);

  if (!top || (top.likesCount || 0) <= 0) return null;

  return {
    userId: top.creator,
    reason: [`Shared "${top.title || top.topic || "a learning"}"`, `${top.likesCount} likes this week`],
    metricLabel: "Likes on this week's learning",
    metricValue: top.likesCount || 0,
  };
}

async function scoreBiggestMilestone({ startDate, endDate }) {
  const [top] = await JourneyMilestone.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } } },
    { $sort: { likesCount: -1 } },
    { $limit: 1 },
  ]);

  if (!top || (top.likesCount || 0) <= 0) return null;

  return {
    userId: top.creator,
    reason: [`Day ${top.day}: "${top.title}"`, `${top.likesCount} likes this week`],
    metricLabel: "Likes on this week's milestone",
    metricValue: top.likesCount || 0,
  };
}

async function scoreRisingBuilder({ startDate, endDate }) {
  const [top] = await FollowerEvent.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, action: "follow" } },
    { $group: { _id: "$user", newFollowers: { $sum: 1 } } },
    { $sort: { newFollowers: -1 } },
    { $limit: 1 },
  ]);

  if (!top || top.newFollowers <= 0) return null;

  return {
    userId: top._id,
    reason: [`Gained ${top.newFollowers} new followers this week`],
    metricLabel: "New followers this week",
    metricValue: top.newFollowers,
  };
}

async function scoreMostHelpfulMember({ startDate, endDate }) {
  const match = { createdAt: { $gte: startDate, $lte: endDate } };

  const [learningCounts, milestoneCounts] = await Promise.all([
    LearningComment.aggregate([{ $match: match }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
    JourneyMilestoneComment.aggregate([{ $match: match }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
  ]);

  const totals = new Map();
  [...learningCounts, ...milestoneCounts].forEach(({ _id, count }) => {
    const key = String(_id);
    totals.set(key, (totals.get(key) || 0) + count);
  });

  let bestUserId = null;
  let bestCount = 0;
  for (const [userId, count] of totals.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestUserId = userId;
    }
  }

  if (!bestUserId || bestCount <= 0) return null;

  return {
    userId: bestUserId,
    reason: [`Left ${bestCount} helpful replies this week`],
    metricLabel: "Replies this week",
    metricValue: bestCount,
  };
}

// Rewards sustained, long-running journeys rather than a single popular
// post — the "still building, day after day" story (e.g. someone 50 days
// into a journey). Restricted to people who actually posted a journey
// update THIS week, so an old streak from months ago can't coast to a win
// in a week they weren't even active in.
async function scoreConsistencyStreak({ startDate, endDate }) {
  const activeUserIds = await JourneyMilestone.distinct("creator", {
    createdAt: { $gte: startDate, $lte: endDate },
    isDeleted: { $ne: true },
  });

  if (activeUserIds.length === 0) return null;

  const top = await BuilderScore.findOne({
    user: { $in: activeUserIds },
    currentStreak: { $gt: 0 },
  })
    .sort({ currentStreak: -1 })
    .lean();

  if (!top || !top.currentStreak) return null;

  return {
    userId: top.user,
    reason: [`${top.currentStreak}-day active streak`, "Still building, day after day"],
    metricLabel: "Current streak (days)",
    metricValue: top.currentStreak,
  };
}

const CATEGORY_SCORERS = {
  builder_of_week: (range) => scoreByBuilderActivity(range),
  student_of_week: (range) => scoreByBuilderActivity({ ...range, roleFilter: "Student" }),
  founder_of_week: (range) => scoreFounderOfWeek(range),
  creator_of_week: (range) => scoreByBuilderActivity({ ...range, roleFilter: "Creator" }),
  developer_of_week: (range) => scoreByBuilderActivity({ ...range, fieldFilter: "Tech" }),
  designer_of_week: (range) => scoreByBuilderActivity({ ...range, fieldFilter: "Design" }),
  learning_of_week: (range) => scoreLearningOfWeek(range),
  biggest_milestone: (range) => scoreBiggestMilestone(range),
  rising_builder: (range) => scoreRisingBuilder(range),
  most_helpful_member: (range) => scoreMostHelpfulMember(range),
  consistency_streak: (range) => scoreConsistencyStreak(range),
};

// Generates (or regenerates) a week's Spotlight. Always leaves the week in
// "draft" so an admin reviews before it goes live — call publishWeek()
// separately. Safe to re-run: each category upserts by (weekKey, category),
// so regenerating just refreshes the algorithmic pick, and any category an
// admin already hand-set via editWinner keeps its `setBy: "admin"` value
// unless `force` is passed.
export async function generateWeeklySpotlight(weekKey, { force = false } = {}) {
  const range = getWeekRange(weekKey);
  if (!range) throw new Error(`Invalid weekKey: ${weekKey}`);

  const { weekNumber, year } = (() => {
    const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    return { year: Number(match[1]), weekNumber: Number(match[2]) };
  })();

  const week = await SpotlightWeek.findOneAndUpdate(
    { weekKey },
    {
      $setOnInsert: { weekKey, weekNumber, year, startDate: range.startDate, endDate: range.endDate },
      $set: { generatedAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const results = [];

  for (const category of SPOTLIGHT_CATEGORIES) {
    const scorer = CATEGORY_SCORERS[category.key];
    if (!scorer) continue;

    const existing = await SpotlightWinner.findOne({ weekKey, category: category.key });
    if (existing && existing.setBy === "admin" && !force) {
      results.push(existing);
      continue;
    }

    const winner = await scorer(range).catch(() => null);
    if (!winner) continue;

    const doc = await SpotlightWinner.findOneAndUpdate(
      { weekKey, category: category.key },
      {
        week: week._id,
        weekKey,
        category: category.key,
        user: winner.userId,
        reason: winner.reason,
        metricLabel: winner.metricLabel,
        metricValue: winner.metricValue,
        setBy: "algorithm",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    results.push(doc);

    await awardBadge(winner.userId, "spotlight_winner", { source: "spotlight", weekKey });
    if (category.badgeKey) {
      await awardBadge(winner.userId, category.badgeKey, { source: "spotlight", weekKey });
    }
  }

  // One "Generate" (admin click or Monday cron) covers both leaderboards —
  // the Activity board has its own admin-lock/force semantics (see
  // generateWeeklyActivityBoard) so this never clobbers admin edits there.
  await generateWeeklyActivityBoard(weekKey, { force }).catch(() => null);

  return { week, winners: results };
}

export async function publishWeek(weekKey) {
  return SpotlightWeek.findOneAndUpdate(
    { weekKey },
    { status: "published", publishedAt: new Date() },
    { new: true }
  );
}

export async function unpublishWeek(weekKey) {
  return SpotlightWeek.findOneAndUpdate({ weekKey }, { status: "draft" }, { new: true });
}

// Shapes a raw SpotlightWinner doc for the client: swaps the raw `upvotes`
// user-ID array for a count plus "did the current viewer already upvote
// this" flag, so the frontend never has to know the array shape (or see
// other people's user IDs).
function shapeWinner(winnerDoc, viewerId) {
  if (!winnerDoc) return null;
  const raw = winnerDoc.toObject ? winnerDoc.toObject() : winnerDoc;
  const { upvotes = [], ...rest } = raw;

  return {
    ...rest,
    upvoteCount: upvotes.length,
    upvotedByMe: viewerId ? upvotes.some((id) => String(id) === String(viewerId)) : false,
  };
}

// Real, non-fabricated stats for a leaderboard row — every number here
// comes from a field that already exists elsewhere in the app, never a
// made-up value:
//   streak      -> BuilderScore.currentStreak (the same streak shown on
//                  their profile / streak card)
//   updates     -> BuilderScore.journeyUpdates (lifetime count of journey
//                  updates they've posted)
//   likes       -> sum of likesCount across their Learnings + JourneyMilestones,
//                  plus the size of each Post's `likes` array (Post doesn't
//                  denormalize a count the way the other two models do)
//   views       -> User.stats.profileViews (tracked by the existing
//                  ProfileView system)
//   referrals   -> User.countDocuments({ referredBy: userId }) — how many
//                  people they've brought into the app (Growth OS referral
//                  engine, see User.js's `referredBy` field)
//   consistency -> journey updates + posts made THIS WEEK (range) — "are
//                  they actually showing up and maintaining their journey
//                  right now", not just historically
//   activityScore -> the real ranking signal product asked for: rank
//                  people by streak first, referral count second, and
//                  this week's consistency (journey + post activity) third.
//                  Weighted so a longer streak always outweighs referrals,
//                  and referrals always outweigh a single week's activity
//                  count — never a flat/static number, it moves every time
//                  any of the three inputs change.
async function getUserStatsSnapshot(userId, range = null) {
  const weekMatch = range ? { $gte: range.startDate, $lte: range.endDate } : null;

  const [
    builderScore,
    learningLikes,
    milestoneLikes,
    postLikes,
    user,
    referralCount,
    journeyUpdatesThisWeek,
    postsThisWeek,
  ] = await Promise.all([
    BuilderScore.findOne({ user: userId }).select("currentStreak journeyUpdates").lean(),
    Learning.aggregate([
      { $match: { creator: userId, isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$likesCount" } } },
    ]),
    JourneyMilestone.aggregate([
      { $match: { creator: userId, isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$likesCount" } } },
    ]),
    Post.aggregate([
      { $match: { author: userId, isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$likes", []] } } } } },
    ]),
    User.findById(userId).select("stats.profileViews").lean(),
    User.countDocuments({ referredBy: userId }),
    weekMatch
      ? JourneyMilestone.countDocuments({ creator: userId, isDeleted: { $ne: true }, createdAt: weekMatch })
      : Promise.resolve(0),
    weekMatch
      ? Post.countDocuments({ author: userId, isDeleted: { $ne: true }, createdAt: weekMatch })
      : Promise.resolve(0),
  ]);

  const streak = builderScore?.currentStreak || 0;
  const consistency = journeyUpdatesThisWeek + postsThisWeek;

  // Weights encode the exact priority order requested: streak (x5) beats
  // referrals (x3) beats this week's consistency (x1) — a big streak can
  // never be dethroned by referrals alone, and referrals can never be
  // dethroned by a single active week alone.
  const activityScore = streak * 5 + referralCount * 3 + consistency * 1;

  return {
    streak,
    updates: builderScore?.journeyUpdates || 0,
    likes: (learningLikes[0]?.total || 0) + (milestoneLikes[0]?.total || 0) + (postLikes[0]?.total || 0),
    views: user?.stats?.profileViews || 0,
    referrals: referralCount,
    consistency,
    activityScore,
  };
}

async function attachWinners(week, viewerId) {
  if (!week) return null;
  const winners = await SpotlightWinner.find({ weekKey: week.weekKey })
    .populate("user", PUBLIC_FIELDS)
    .lean();

  const categories = await Promise.all(
    SPOTLIGHT_CATEGORIES.map(async (category) => {
      const winner = shapeWinner(winners.find((w) => w.category === category.key) || null, viewerId);
      if (!winner) return { ...category, winner: null };

      const stats = await getUserStatsSnapshot(winner.user._id, { startDate: week.startDate, endDate: week.endDate }).catch(() => null);
      return { ...category, winner: { ...winner, stats } };
    })
  );

  return {
    ...(week.toObject ? week.toObject() : week),
    categories,
  };
}

// Computes standings for a week that hasn't been generated/published yet —
// i.e. the current, still-in-progress week. This is read-only: it runs the
// same scorers generateWeeklySpotlight uses, but never writes a
// SpotlightWinner doc and never awards a badge, because the week isn't over
// yet and its "winner" can still change day to day. Once the week actually
// ends, the Monday scheduler (spotlightScheduler.service.js) generates and
// publishes it for real, and getWeekView below will start returning that
// persisted, permanent result instead of a freshly-recomputed live one.
async function computeLiveWeek(weekKey, viewerId) {
  const range = getWeekRange(weekKey);
  if (!range) return null;

  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  const year = Number(match[1]);
  const weekNumber = Number(match[2]);

  // A category may already have a persisted doc for this in-progress week
  // — that happens the moment someone upvotes it (see toggleUpvote, which
  // lazily creates one). That persisted pick + its upvotes is the source of
  // truth from then on, not a fresh recompute every page load, so an
  // upvote never silently detaches from a later recompute picking someone
  // else.
  const existingDocs = await SpotlightWinner.find({ weekKey }).populate("user", PUBLIC_FIELDS).lean();
  const existingByCategory = new Map(existingDocs.map((doc) => [doc.category, doc]));

  const categories = await Promise.all(
    SPOTLIGHT_CATEGORIES.map(async (category) => {
      if (existingByCategory.has(category.key)) {
        const winner = shapeWinner(existingByCategory.get(category.key), viewerId);
        const stats = await getUserStatsSnapshot(winner.user._id, range).catch(() => null);
        return { ...category, winner: { ...winner, stats } };
      }

      const scorer = CATEGORY_SCORERS[category.key];
      if (!scorer) return { ...category, winner: null };

      const picked = await scorer(range).catch(() => null);
      if (!picked) return { ...category, winner: null };

      const user = await User.findById(picked.userId).select(PUBLIC_FIELDS).lean();
      if (!user) return { ...category, winner: null };

      const stats = await getUserStatsSnapshot(user._id, range).catch(() => null);

      return {
        ...category,
        winner: {
          user,
          reason: picked.reason,
          metricLabel: picked.metricLabel,
          metricValue: picked.metricValue,
          setBy: "algorithm",
          upvoteCount: 0,
          upvotedByMe: false,
          stats,
        },
      };
    })
  );

  return {
    weekKey,
    weekNumber,
    year,
    startDate: range.startDate,
    endDate: range.endDate,
    status: "live",
    categories,
  };
}

// Single entry point the API should use to resolve "what does week X look
// like right now": a permanently-published past week if one exists, a
// freshly-computed live view if X is the current in-progress week, or null
// if X is neither (e.g. a future week, or a past week nobody ever
// generated).
export async function getWeekView(weekKey, viewerId) {
  const published = await getSpotlightWeekByKey(weekKey, { includeUnpublished: false, viewerId });
  if (published) return published;

  const { weekKey: currentKey } = getCurrentWeekKey();
  if (weekKey !== currentKey) return null;

  return computeLiveWeek(weekKey, viewerId);
}

export async function getCurrentSpotlight(viewerId) {
  const { weekKey } = getCurrentWeekKey();
  const view = await getWeekView(weekKey, viewerId);
  if (view) return view;

  // Fallback for the rare case nothing computes for the current week (e.g.
  // right at a year boundary) — show the most recent published week rather
  // than a hard empty state.
  const week = await SpotlightWeek.findOne({ status: "published" }).sort({ startDate: -1 });
  return attachWinners(week, viewerId);
}

export async function getSpotlightWeekByKey(weekKey, { includeUnpublished = false, viewerId } = {}) {
  const query = { weekKey };
  if (!includeUnpublished) query.status = "published";
  const week = await SpotlightWeek.findOne(query);
  return attachWinners(week, viewerId);
}

// Toggles the current user's upvote on a week's category winner. If that
// category doesn't have a persisted winner yet — which is the normal case
// for the current, still-in-progress week (see computeLiveWeek) — this
// lazily runs that one category's scorer and persists the pick first, so
// there's something to attach the upvote to. A past week that genuinely
// never had a winner for this category stays un-upvotable (returns null):
// there's nobody to upvote.
export async function toggleUpvote({ weekKey, category, userId }) {
  if (!isValidSpotlightCategory(category)) {
    throw new Error("Invalid Spotlight category.");
  }

  const range = getWeekRange(weekKey);
  if (!range) throw new Error("Invalid weekKey.");

  let doc = await SpotlightWinner.findOne({ weekKey, category });

  if (!doc) {
    const { weekKey: currentKey } = getCurrentWeekKey();
    if (weekKey !== currentKey) return null;

    const scorer = CATEGORY_SCORERS[category];
    const picked = scorer ? await scorer(range).catch(() => null) : null;
    if (!picked) return null;

    let week = await SpotlightWeek.findOne({ weekKey });
    if (!week) {
      const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
      week = await SpotlightWeek.create({
        weekKey,
        weekNumber: Number(match[2]),
        year: Number(match[1]),
        startDate: range.startDate,
        endDate: range.endDate,
      });
    }

    doc = await SpotlightWinner.create({
      week: week._id,
      weekKey,
      category,
      user: picked.userId,
      reason: picked.reason,
      metricLabel: picked.metricLabel,
      metricValue: picked.metricValue,
      setBy: "algorithm",
      upvotes: [],
    });
  }

  const already = doc.upvotes.some((id) => String(id) === String(userId));
  doc.upvotes = already
    ? doc.upvotes.filter((id) => String(id) !== String(userId))
    : [...doc.upvotes, userId];

  await doc.save();
  await doc.populate("user", PUBLIC_FIELDS);

  const winner = shapeWinner(doc, userId);
  const stats = await getUserStatsSnapshot(winner.user._id, range).catch(() => null);
  return { ...winner, stats };
}

// How many rows the "Top Active" leaderboard shows. Each position is its
// own SpotlightWinner doc under category `activity_rank_<N>` — see
// generateWeeklyActivityBoard below for why it's encoded in the category
// string instead of a compound index.
const ACTIVITY_BOARD_SIZE = 12;
const activityRankCategory = (position) => `activity_rank_${position}`;
const ACTIVITY_RANK_PATTERN = /^activity_rank_(\d+)$/;

function buildActivityReason(stats) {
  const reasonParts = [];
  if (stats.streak > 0) reasonParts.push(`${stats.streak}-day streak`);
  if (stats.referrals > 0) reasonParts.push(`${stats.referrals} people invited`);
  if (stats.consistency > 0) reasonParts.push(`${stats.consistency} updates this week`);
  return reasonParts.length ? reasonParts : ["Active this week"];
}

// The actual ranking computation, shared by the live view (getTopActiveUsers)
// and the persisted weekly generation (generateWeeklyActivityBoard) below —
// ranks every genuinely active PERSON (not one winner per category) by the
// composite activityScore getUserStatsSnapshot computes: streak x5,
// referrals x3, this week's journey/post consistency x1.
async function computeRankedActiveUsers(range, limit) {
  // Candidate pool = anyone who could possibly score > 0: a live streak, a
  // journey update or post made this week, or having referred someone
  // (ever). Covers every input the score is built from, so nobody who'd
  // actually rank gets left out.
  const [streakUserIds, milestoneUserIds, postUserIds, referrerIds] = await Promise.all([
    BuilderScore.find({ currentStreak: { $gt: 0 } }).distinct("user"),
    JourneyMilestone.distinct("creator", {
      createdAt: { $gte: range.startDate, $lte: range.endDate },
      isDeleted: { $ne: true },
    }),
    Post.distinct("author", {
      createdAt: { $gte: range.startDate, $lte: range.endDate },
      isDeleted: { $ne: true },
    }),
    User.distinct("referredBy", { referredBy: { $ne: null } }),
  ]);

  const candidateIds = [
    ...new Set(
      [...streakUserIds, ...milestoneUserIds, ...postUserIds, ...referrerIds]
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (candidateIds.length === 0) return [];

  return (
    await Promise.all(
      candidateIds.map(async (userId) => {
        const stats = await getUserStatsSnapshot(userId, range).catch(() => null);
        if (!stats || stats.activityScore <= 0) return null;
        return { userId, stats };
      })
    )
  )
    .filter(Boolean)
    .sort((a, b) => b.stats.activityScore - a.stats.activityScore)
    .slice(0, Math.min(limit, 50));
}

// Read-only LIVE view for a week that hasn't been generated/published yet —
// same idea as computeLiveWeek for ordinary categories. Never writes
// anything, always computed fresh from live data, so nothing can go stale.
export async function getTopActiveUsers({ weekKey, viewerId, limit = ACTIVITY_BOARD_SIZE } = {}) {
  const range = getWeekRange(weekKey);
  if (!range) return [];

  const scored = await computeRankedActiveUsers(range, limit);
  if (scored.length === 0) return [];

  const users = await User.find({ _id: { $in: scored.map((s) => s.userId) } })
    .select(PUBLIC_FIELDS)
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return scored
    .map((entry, index) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;

      return {
        key: `active_${index + 1}`,
        label: "Most Active",
        emoji: "⚡",
        winner: {
          user,
          reason: buildActivityReason(entry.stats),
          metricLabel: "Activity score",
          metricValue: entry.stats.activityScore,
          upvoteCount: 0,
          upvotedByMe: false,
          stats: entry.stats,
        },
      };
    })
    .filter(Boolean);
}

// Persists this week's "Top Active" leaderboard as one SpotlightWinner doc
// per position — the admin-editable, publishable counterpart to the live
// view above. Same "never overwrite an admin's pick" rule
// generateWeeklySpotlight uses for ordinary categories: a position an admin
// already hand-set (setBy: "admin") is left alone unless `force` is passed,
// AND that person is excluded from the algorithm's pool for the OTHER
// positions this run, so they can't also show up at their "natural" rank
// somewhere else on the same board.
export async function generateWeeklyActivityBoard(weekKey, { force = false, limit = ACTIVITY_BOARD_SIZE } = {}) {
  const range = getWeekRange(weekKey);
  if (!range) throw new Error(`Invalid weekKey: ${weekKey}`);

  const { weekNumber, year } = (() => {
    const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    return { year: Number(match[1]), weekNumber: Number(match[2]) };
  })();

  const week = await SpotlightWeek.findOneAndUpdate(
    { weekKey },
    {
      $setOnInsert: { weekKey, weekNumber, year, startDate: range.startDate, endDate: range.endDate },
      $set: { generatedAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const existingDocs = await SpotlightWinner.find({ weekKey, category: { $regex: ACTIVITY_RANK_PATTERN } });
  const existingByPosition = new Map(existingDocs.map((doc) => [doc.position, doc]));
  const lockedUserIds = new Set(
    existingDocs.filter((doc) => doc.setBy === "admin" && !force).map((doc) => String(doc.user))
  );

  const ranked = await computeRankedActiveUsers(range, limit + lockedUserIds.size);
  const candidates = ranked.filter((entry) => !lockedUserIds.has(entry.userId));

  const results = [];
  let candidateIndex = 0;

  for (let position = 1; position <= limit; position += 1) {
    const category = activityRankCategory(position);
    const existing = existingByPosition.get(position);

    if (existing && existing.setBy === "admin" && !force) {
      results.push(existing);
      continue;
    }

    const entry = candidates[candidateIndex];
    candidateIndex += 1;

    if (!entry) {
      // Nobody left to fill this position — clear out a stale algorithmic
      // pick rather than leaving outdated data sitting there.
      if (existing) await SpotlightWinner.deleteOne({ _id: existing._id });
      continue;
    }

    const doc = await SpotlightWinner.findOneAndUpdate(
      { weekKey, category },
      {
        week: week._id,
        weekKey,
        category,
        position,
        user: entry.userId,
        reason: buildActivityReason(entry.stats),
        metricLabel: "Activity score",
        metricValue: entry.stats.activityScore,
        setBy: "algorithm",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    results.push(doc);
  }

  return { week, entries: results };
}

// Resolves "what does the Top Active board for week X look like right
// now" — mirrors getWeekView's published/live duality for ordinary
// categories exactly:
//   - A past week only shows its persisted board once the week has been
//     PUBLISHED (an admin's draft-in-review stays invisible to regular
//     users until they publish, same as category winners).
//   - The current, still-in-progress week shows its persisted board as
//     soon as one exists — generated (even in draft) or admin-edited —
//     because for an in-progress week "draft" and "live" are the same
//     thing; publishing later just seals it as permanent history.
//   - Otherwise (no persisted board, and not the current week) falls back
//     to a freshly-computed live view for the current week, or empty.
export async function getActivityBoardView(weekKey, viewerId) {
  const { weekKey: currentKey } = getCurrentWeekKey();
  const isCurrentWeek = weekKey === currentKey;

  const week = await SpotlightWeek.findOne({ weekKey }).lean();
  const canShowPersisted = isCurrentWeek || week?.status === "published";

  if (canShowPersisted) {
    const persistedDocs = await SpotlightWinner.find({ weekKey, category: { $regex: ACTIVITY_RANK_PATTERN } })
      .sort({ position: 1 })
      .populate("user", PUBLIC_FIELDS)
      .lean();

    if (persistedDocs.length > 0) {
      const range = getWeekRange(weekKey);
      return Promise.all(
        persistedDocs.map(async (doc) => {
          const winner = shapeWinner(doc, viewerId);
          const stats = await getUserStatsSnapshot(winner.user._id, range).catch(() => null);
          return {
            key: `active_${doc.position}`,
            label: "Most Active",
            emoji: "⚡",
            winner: { ...winner, stats },
          };
        })
      );
    }
  }

  if (!isCurrentWeek) return [];

  return getTopActiveUsers({ weekKey, viewerId, limit: ACTIVITY_BOARD_SIZE });
}

// Admin-facing view of the activity board: always the raw persisted state
// (draft or published, doesn't matter — an admin reviewing a week needs to
// see exactly what's there) as a fixed-length array of `ACTIVITY_BOARD_SIZE`
// slots, `null` for any position nobody's been generated/assigned into yet.
// Mirrors getWeekDetail's `includeUnpublished: true` category behavior.
export async function getActivityBoardForAdmin(weekKey, limit = ACTIVITY_BOARD_SIZE) {
  const docs = await SpotlightWinner.find({ weekKey, category: { $regex: ACTIVITY_RANK_PATTERN } })
    .populate("user", PUBLIC_FIELDS)
    .lean();
  const byPosition = new Map(docs.map((doc) => [doc.position, doc]));

  return Array.from({ length: limit }, (_, i) => {
    const position = i + 1;
    const doc = byPosition.get(position);
    return { position, category: activityRankCategory(position), winner: doc ? shapeWinner(doc, null) : null };
  });
}

export async function listSpotlightWeeks({ limit = 20, before = null, includeUnpublished = false } = {}) {
  const query = {};
  if (!includeUnpublished) query.status = "published";
  if (before) query.startDate = { $lt: before };

  return SpotlightWeek.find(query)
    .sort({ startDate: -1 })
    .limit(Math.min(limit, 50))
    .lean();
}

export async function getUserSpotlightWins(userId) {
  return SpotlightWinner.find({ user: userId })
    .sort({ weekKey: -1 })
    .lean();
}
