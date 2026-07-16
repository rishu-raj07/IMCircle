import SpotlightWeek from "../models/SpotlightWeek.js";
import SpotlightWinner from "../models/SpotlightWinner.js";
import SpotlightNomination from "../models/SpotlightNomination.js";
import User from "../models/User.js";
import {
  getISOWeekKey,
  getWeekRange,
  generateWeeklySpotlight,
  publishWeek,
  unpublishWeek,
  getSpotlightWeekByKey,
  getActivityBoardForAdmin,
} from "../services/spotlight.service.js";
import { isValidSpotlightCategory } from "../constants/spotlightCategories.js";

const ACTIVITY_BOARD_SIZE = 12;
const activityRankCategory = (position) => `activity_rank_${position}`;

const PUBLIC_FIELDS = "fullName username avatar headline field role";

export const listWeeks = async (req, res) => {
  try {
    const weeks = await SpotlightWeek.find({})
      .sort({ startDate: -1 })
      .limit(Number(req.query.limit) || 30)
      .lean();
    res.status(200).json({ success: true, weeks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getWeekDetail = async (req, res) => {
  try {
    const week = await getSpotlightWeekByKey(req.params.weekKey, { includeUnpublished: true });
    if (!week) {
      return res.status(404).json({ success: false, message: "That week hasn't been generated yet." });
    }
    // Activity board positions travel alongside the ordinary categories so
    // the admin drawer can show/edit both in one place.
    const activityBoard = await getActivityBoardForAdmin(req.params.weekKey, ACTIVITY_BOARD_SIZE);
    res.status(200).json({ success: true, week: { ...week, activityBoard } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const generateWeek = async (req, res) => {
  try {
    const weekKey = req.body?.weekKey || getISOWeekKey(new Date()).weekKey;
    const force = Boolean(req.body?.force);
    const result = await generateWeeklySpotlight(weekKey, { force });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Could not generate that week." });
  }
};

export const publish = async (req, res) => {
  try {
    const week = await publishWeek(req.params.weekKey);
    if (!week) {
      return res.status(404).json({ success: false, message: "That week hasn't been generated yet." });
    }
    res.status(200).json({ success: true, week });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const unpublish = async (req, res) => {
  try {
    const week = await unpublishWeek(req.params.weekKey);
    res.status(200).json({ success: true, week });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Manual override for a single category — used both to hand-pick a winner
// from scratch and to correct an algorithmic pick. Setting `setBy: "admin"`
// protects this category from being silently overwritten the next time
// generateWeeklySpotlight runs (weekly cron or a manual regenerate).
export const editWinner = async (req, res) => {
  try {
    const { weekKey } = req.params;
    const { category, userId, reason } = req.body || {};

    if (!isValidSpotlightCategory(category)) {
      return res.status(400).json({ success: false, message: "Pick a valid Spotlight category." });
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ success: false, message: "That user wasn't found." });
    }

    let week = await SpotlightWeek.findOne({ weekKey });
    if (!week) {
      const { weekNumber, year } = (() => {
        const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
        return { year: Number(match?.[1]), weekNumber: Number(match?.[2]) };
      })();
      if (!weekNumber || !year) {
        return res.status(400).json({ success: false, message: "Invalid weekKey format." });
      }
      const range = getWeekRange(weekKey) || { startDate: new Date(), endDate: new Date() };
      week = await SpotlightWeek.create({
        weekKey,
        weekNumber,
        year,
        startDate: range.startDate,
        endDate: range.endDate,
      });
    }

    const winner = await SpotlightWinner.findOneAndUpdate(
      { weekKey, category },
      {
        week: week._id,
        weekKey,
        category,
        user: userId,
        reason: Array.isArray(reason) ? reason.slice(0, 6) : [],
        setBy: "admin",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("user", PUBLIC_FIELDS);

    res.status(200).json({ success: true, winner });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const removeWinner = async (req, res) => {
  try {
    const { weekKey, category } = req.params;
    await SpotlightWinner.deleteOne({ weekKey, category });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Manual override for a single Activity-board POSITION (1-N) — same idea as
// editWinner, but keyed by numbered slot instead of a category. Setting
// `setBy: "admin"` protects this exact position from being reassigned the
// next time generateWeeklyActivityBoard runs, and the chosen person is
// excluded from the pool that fills the OTHER positions that run so they
// don't also land at their "natural" rank elsewhere on the same board.
export const editActivityPosition = async (req, res) => {
  try {
    const { weekKey } = req.params;
    const position = Number(req.params.position);
    const { userId, reason } = req.body || {};

    if (!Number.isInteger(position) || position < 1 || position > ACTIVITY_BOARD_SIZE) {
      return res.status(400).json({ success: false, message: `Position must be between 1 and ${ACTIVITY_BOARD_SIZE}.` });
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ success: false, message: "That user wasn't found." });
    }

    let week = await SpotlightWeek.findOne({ weekKey });
    if (!week) {
      const { weekNumber, year } = (() => {
        const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
        return { year: Number(match?.[1]), weekNumber: Number(match?.[2]) };
      })();
      if (!weekNumber || !year) {
        return res.status(400).json({ success: false, message: "Invalid weekKey format." });
      }
      const range = getWeekRange(weekKey) || { startDate: new Date(), endDate: new Date() };
      week = await SpotlightWeek.create({
        weekKey,
        weekNumber,
        year,
        startDate: range.startDate,
        endDate: range.endDate,
      });
    }

    const category = activityRankCategory(position);
    const winner = await SpotlightWinner.findOneAndUpdate(
      { weekKey, category },
      {
        week: week._id,
        weekKey,
        category,
        position,
        user: userId,
        reason: Array.isArray(reason) ? reason.slice(0, 6) : [],
        metricLabel: "Activity score",
        setBy: "admin",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("user", PUBLIC_FIELDS);

    res.status(200).json({ success: true, winner });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const removeActivityPosition = async (req, res) => {
  try {
    const { weekKey } = req.params;
    const position = Number(req.params.position);
    await SpotlightWinner.deleteOne({ weekKey, category: activityRankCategory(position) });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const listNominations = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const query = status === "all" ? {} : { status };

    const nominations = await SpotlightNomination.find(query)
      .populate("nominator", PUBLIC_FIELDS)
      .populate("targetUser", PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ success: true, nominations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const reviewNomination = async (req, res) => {
  try {
    const { action } = req.body || {};
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be approve or reject." });
    }

    const nomination = await SpotlightNomination.findByIdAndUpdate(
      req.params.nominationId,
      {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: req.admin._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!nomination) {
      return res.status(404).json({ success: false, message: "Nomination not found." });
    }

    res.status(200).json({ success: true, nomination });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
