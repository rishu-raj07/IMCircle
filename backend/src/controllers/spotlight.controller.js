import SpotlightNomination from "../models/SpotlightNomination.js";
import CircleRequest from "../models/CircleRequest.js";
import {
  getCurrentSpotlight,
  getSpotlightWeekByKey,
  getWeekView,
  listSpotlightWeeks,
  listRecentWeekMetas,
  getUserSpotlightWins,
  toggleUpvote,
  getActivityBoardView,
} from "../services/spotlight.service.js";
import { isValidSpotlightCategory, SPOTLIGHT_CATEGORIES } from "../constants/spotlightCategories.js";

export const getCategories = async (req, res) => {
  res.status(200).json({ success: true, categories: SPOTLIGHT_CATEGORIES });
};

// Same "is the viewer already in Circle with this person / do they have a
// pending sent request" logic feed.controller.js's withAuthorState uses for
// post authors — applied here to each winner's user so the Spotlight list
// can show a real Add to Circle / Requested / In Circle button per row
// instead of a generic profile link. `req.user.circle` is already loaded on
// the auth'd user doc, so this only costs one extra query (pending sent
// requests).
async function attachCircleStatus(week, viewer) {
  if (!week) return week;

  const viewerId = String(viewer._id);
  const circleSet = new Set((viewer.circle || []).map((id) => String(id)));

  const pending = await CircleRequest.find({ sender: viewer._id, status: "pending" })
    .select("receiver")
    .lean();
  const pendingSet = new Set(pending.map((r) => String(r.receiver)));

  const categories = (week.categories || []).map((category) => {
    const winnerUser = category.winner?.user;
    if (!winnerUser) return category;

    const targetId = String(winnerUser._id);
    const isMine = targetId === viewerId;
    const inCircle = !isMine && circleSet.has(targetId);
    const circleRequested = !isMine && !inCircle && pendingSet.has(targetId);

    return {
      ...category,
      winner: {
        ...category.winner,
        user: { ...winnerUser, isMine, inCircle, circleRequested },
      },
    };
  });

  return { ...week, categories };
}

export const getCurrent = async (req, res) => {
  try {
    const week = await getCurrentSpotlight(req.user._id);
    res.status(200).json({ success: true, week: await attachCircleStatus(week, req.user) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Pure date-math week metadata for the week-picker strip in the UI — always
// returns a full, scrollable list of recent weeks (weekKey/number/range)
// even for weeks nobody has generated Spotlight data for yet, so the strip
// never looks broken. Selecting a week from it calls GET /weeks/:weekKey,
// which resolves live data for the current week / published data for past
// ones via getWeekView.
export const getNavWeeks = async (req, res) => {
  try {
    const count = Math.min(Number(req.query.count) || 12, 52);
    const weeks = listRecentWeekMetas(count);
    res.status(200).json({ success: true, weeks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getWeek = async (req, res) => {
  try {
    const week = await getWeekView(req.params.weekKey, req.user._id);
    if (!week) {
      return res.status(404).json({ success: false, message: "That Spotlight week wasn't found." });
    }
    res.status(200).json({ success: true, week: await attachCircleStatus(week, req.user) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Real cross-user leaderboard (distinct people, not one-per-category) — see
// getActivityBoardView in spotlight.service.js for the published/live
// resolution (admin-reviewed + editable-by-position, auto-published weekly,
// same as the category system). Reuses attachCircleStatus by wrapping the
// entries in a `{ categories }` shape, since each entry already has the
// same `{ key, winner: { user, ... } }` structure a normal category does.
export const getTopActive = async (req, res) => {
  try {
    const entries = await getActivityBoardView(req.params.weekKey, req.user._id);
    const { categories } = await attachCircleStatus({ categories: entries }, req.user);
    res.status(200).json({ success: true, entries: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const upvote = async (req, res) => {
  try {
    const { weekKey, category } = req.params;
    const winner = await toggleUpvote({ weekKey, category, userId: req.user._id });
    if (!winner) {
      return res.status(404).json({ success: false, message: "Nothing to upvote here yet." });
    }
    res.status(200).json({ success: true, winner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Couldn't register that upvote." });
  }
};

export const getArchive = async (req, res) => {
  try {
    const before = req.query.before ? new Date(req.query.before) : null;
    const weeks = await listSpotlightWeeks({ limit: Number(req.query.limit) || 20, before });
    res.status(200).json({ success: true, weeks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getUserWins = async (req, res) => {
  try {
    const wins = await getUserSpotlightWins(req.params.userId);
    res.status(200).json({ success: true, wins });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const nominate = async (req, res) => {
  try {
    const { category, targetType, targetId, targetUserId, note } = req.body || {};

    if (!isValidSpotlightCategory(category)) {
      return res.status(400).json({ success: false, message: "Pick a valid Spotlight category." });
    }

    const allowedTargetTypes = ["post", "journey", "learning", "milestone", "user", "startup"];
    if (!allowedTargetTypes.includes(targetType)) {
      return res.status(400).json({ success: false, message: "That's not something you can nominate." });
    }

    const nomination = await SpotlightNomination.create({
      nominator: req.user._id,
      category,
      targetType,
      targetId: targetId || null,
      targetUser: targetUserId || null,
      note: String(note || "").slice(0, 500),
    });

    res.status(201).json({ success: true, nomination });
  } catch (error) {
    res.status(500).json({ success: false, message: "Couldn't submit your nomination. Please try again." });
  }
};

export const getMyNominations = async (req, res) => {
  try {
    const nominations = await SpotlightNomination.find({ nominator: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json({ success: true, nominations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
