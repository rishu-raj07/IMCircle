import User from "../models/User.js";

const PUBLIC_FIELDS = "fullName username avatar headline createdAt gender";

// The viewer's own referral stats — how many builders they've brought in,
// plus who referred them (if anyone). `referredCount` is always computed
// live from User.referredBy rather than cached, so it can never drift.
export const getMyReferralStats = async (req, res) => {
  try {
    const [referredCount, me] = await Promise.all([
      User.countDocuments({ referredBy: req.user._id, isDeleted: { $ne: true } }),
      User.findById(req.user._id).select("referredBy username").populate("referredBy", PUBLIC_FIELDS),
    ]);

    res.status(200).json({
      success: true,
      referredCount,
      referredBy: me?.referredBy || null,
      username: me?.username || "",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getMyReferredUsers = async (req, res) => {
  try {
    const referred = await User.find({ referredBy: req.user._id, isDeleted: { $ne: true } })
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json({ success: true, referred });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Public-ish stat for someone else's profile (referred count only — the
// list of who they referred is private to them).
export const getUserReferralCount = async (req, res) => {
  try {
    const referredCount = await User.countDocuments({
      referredBy: req.params.userId,
      isDeleted: { $ne: true },
    });
    res.status(200).json({ success: true, referredCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
