import express from "express";

import {
  getUserByUsername,
  getUserById,
  searchUsers,
  matchContacts,
  getSuggestions,
  getFollowers,
  getFollowing,
  getFollowersById,
  getFollowingById,
  getCircleById,
  followUser,
  unfollowUser,
  removeFollower,
  addToCircle,
  removeFromCircle,
  sendProfileMobileOtp,
  verifyProfileMobileOtp,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  registerPushToken,
  removePushToken,
  updatePublicKey,
  getUserPosts,
  getUserReposts,
} from "../controllers/user.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  otpLimiter,
  otpVerifyLimiter,
  actionLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  usernameParamValidator,
  searchUserValidator,
} from "../validators/user.validator.js";

const router = express.Router();

router.get("/search", protect, searchUserValidator, validate, searchUsers);
router.get("/suggestions", protect, getSuggestions);
router.post("/contacts/match", protect, matchContacts);

router.post("/me/push-token", protect, registerPushToken);
router.delete("/me/push-token", protect, removePushToken);

// End-to-end encryption (personal 1:1 chat) — uploads this device's public
// key only. See User.js's publicKey field and frontend/src/utils/encryption.js.
router.put("/me/public-key", protect, updatePublicKey);

router.get("/followers", protect, getFollowers);
router.get("/following", protect, getFollowing);

router.get("/id/:userId", protect, getUserById);

router.get("/:userId/followers", protect, getFollowersById);
router.get("/:userId/following", protect, getFollowingById);
router.get("/:userId/circle", protect, getCircleById);

// Profile "Posts"/"Reposts" tabs — scoped strictly to :userId (the profile
// being viewed), never to the logged-in viewer. See getUserPosts/
// getUserReposts in user.controller.js for why this replaces the old
// approach of re-filtering the personalized /feed response.
router.get("/:userId/posts", protect, getUserPosts);
router.get("/:userId/reposts", protect, getUserReposts);

router.patch("/:userId/follow", protect, followUser);
router.patch("/:userId/unfollow", protect, unfollowUser);

router.patch("/:userId/circle", protect, addToCircle);
router.delete("/:userId/circle", protect, removeFromCircle);

router.delete("/:userId/follower", protect, removeFollower);

router.post("/me/mobile/send-otp", protect, otpLimiter, sendProfileMobileOtp);
router.post("/me/mobile/verify-otp", protect, otpVerifyLimiter, verifyProfileMobileOtp);

router.get("/me/blocked", protect, getBlockedUsers);
router.patch("/:userId/block", protect, actionLimiter, blockUser);
router.patch("/:userId/unblock", protect, actionLimiter, unblockUser);
router.post("/:userId/report", protect, actionLimiter, reportUser);

router.get(
  "/:username",
  protect,
  usernameParamValidator,
  validate,
  getUserByUsername
);

export default router;
