import User from "../models/User.js";
import UserBadge from "../models/UserBadge.js";
import { BADGE_CATALOG } from "../constants/badgeCatalog.js";
import { awardBadge, revokeBadge, getUserBadgeProfile } from "../services/badge.service.js";

export const getCatalog = async (req, res) => {
  res.status(200).json({ success: true, badges: BADGE_CATALOG });
};

// Search-as-you-type user lookup for the "award a badge" flow — kept
// intentionally small (name/username/mobile) since this is only used to
// find a single account, not a general admin user browser (that already
// exists at /admin/users).
export const searchUsers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({
      isDeleted: { $ne: true },
      $or: [{ fullName: regex }, { username: regex }, { mobile: regex }],
    })
      .select("fullName username avatar headline mobile")
      .limit(15)
      .lean();

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getUserBadgeDetail = async (req, res) => {
  try {
    const profile = await getUserBadgeProfile(req.params.userId);
    res.status(200).json({ success: true, ...profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const award = async (req, res) => {
  try {
    const { userId, badgeKey, note } = req.body || {};
    const badge = await awardBadge(userId, badgeKey, {
      source: "manual",
      awardedBy: req.admin._id,
      note: String(note || "").slice(0, 300),
    });

    if (!badge) {
      return res.status(400).json({ success: false, message: "Invalid user or badge key." });
    }

    res.status(200).json({ success: true, badge });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const revoke = async (req, res) => {
  try {
    const { userId, badgeKey } = req.body || {};
    const removed = await revokeBadge(userId, badgeKey);
    res.status(200).json({ success: true, removed });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Recently awarded badges across everyone, for the admin dashboard's
// "recent activity" feel.
export const recentAwards = async (req, res) => {
  try {
    const awards = await UserBadge.find({})
      .populate("user", "fullName username avatar")
      .sort({ awardedAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json({ success: true, awards });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
