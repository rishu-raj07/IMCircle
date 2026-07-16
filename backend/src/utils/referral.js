import User from "../models/User.js";

// Resolves a referral code (currently just the referrer's username) to
// their User _id at account-creation time. Deliberately silent/best-effort
// — an invalid, stale, or self-referential code should never block signup,
// it should just mean no referral gets attributed.
export async function resolveReferrerId(refCode) {
  const username = String(refCode || "").trim().toLowerCase();
  if (!username || username.length < 3) return null;

  const referrer = await User.findOne({ username, isDeleted: { $ne: true } }).select("_id");
  return referrer?._id || null;
}
