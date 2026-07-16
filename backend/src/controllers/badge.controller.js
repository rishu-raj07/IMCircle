import { BADGE_CATALOG } from "../constants/badgeCatalog.js";
import { getUserBadgeProfile } from "../services/badge.service.js";

export const getBadgeCatalog = async (req, res) => {
  res.status(200).json({
    success: true,
    badges: BADGE_CATALOG,
  });
};

export const getMyBadges = async (req, res) => {
  try {
    const profile = await getUserBadgeProfile(req.user._id);
    res.status(200).json({ success: true, ...profile });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getUserBadges = async (req, res) => {
  try {
    const profile = await getUserBadgeProfile(req.params.userId);
    res.status(200).json({ success: true, ...profile });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
