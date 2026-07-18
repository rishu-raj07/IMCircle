import express from "express";
import multer from "multer";

import {
  createJourney,
  getJourneys,
  getSingleJourney,
  getMyJourneys,
  getUserJourneys,
  updateJourney,
  updateJourneyCover,
  deleteJourney,
  reportJourney,
  createMilestone,
  followJourney,
  unfollowJourney,
  getFollowingJourneys,
  likeMilestone,
  unlikeMilestone,
  getMilestoneLikers,
  commentMilestone,
  getMilestoneComments,
  getJourneyFeed,
  getJourneyDiscoverFeed,
  repostMilestone,
  shareMilestone,
  saveMilestone,
  unsaveMilestone,
} from "../controllers/journey.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { actionLimiter } from "../middleware/rateLimit.middleware.js";

import {
  createJourneyValidator,
  updateJourneyValidator,
  journeyIdValidator,
  milestoneIdValidator,
  createMilestoneValidator,
  commentMilestoneValidator,
} from "../validators/journey.validator.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Explicit allowlist — `startsWith("image/")` also matches
    // "image/svg+xml", which can carry embedded script (stored XSS). Only
    // safe raster/video types are accepted.
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]);

    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only image or video files are allowed"), false);
    }

    cb(null, true);
  },
});

router.post("/", protect, createJourneyValidator, validate, createJourney);

router.get("/", protect, getJourneys);

router.get("/my", protect, getMyJourneys);

router.get("/following", protect, getFollowingJourneys);

router.get("/feed", protect, getJourneyFeed);

router.get("/discover", protect, getJourneyDiscoverFeed);

router.get("/user/:userId", protect, getUserJourneys);

router.post("/:id/follow", protect, journeyIdValidator, validate, followJourney);

router.delete(
  "/:id/unfollow",
  protect,
  journeyIdValidator,
  validate,
  unfollowJourney
);

router.post(
  "/:id/milestone",
  protect,
  journeyIdValidator,
  upload.single("image"),
  createMilestoneValidator,
  validate,
  createMilestone
);

router.patch(
  "/:id/cover",
  protect,
  journeyIdValidator,
  upload.single("cover"),
  validate,
  updateJourneyCover
);

router.get("/:id", protect, journeyIdValidator, validate, getSingleJourney);

router.patch(
  "/:id",
  protect,
  journeyIdValidator,
  updateJourneyValidator,
  validate,
  updateJourney
);

router.delete("/:id", protect, journeyIdValidator, validate, deleteJourney);

router.post(
  "/:id/report",
  protect,
  actionLimiter,
  journeyIdValidator,
  validate,
  reportJourney
);

router.patch(
  "/milestone/:milestoneId/like",
  protect,
  milestoneIdValidator,
  validate,
  likeMilestone
);

router.patch(
  "/milestone/:milestoneId/unlike",
  protect,
  milestoneIdValidator,
  validate,
  unlikeMilestone
);

router.get(
  "/milestone/:milestoneId/likes",
  protect,
  milestoneIdValidator,
  validate,
  getMilestoneLikers
);

router.patch(
  "/milestone/:milestoneId/repost",
  protect,
  milestoneIdValidator,
  validate,
  repostMilestone
);

router.patch(
  "/milestone/:milestoneId/share",
  protect,
  milestoneIdValidator,
  validate,
  shareMilestone
);

router.patch(
  "/milestone/:milestoneId/save",
  protect,
  milestoneIdValidator,
  validate,
  saveMilestone
);

router.patch(
  "/milestone/:milestoneId/unsave",
  protect,
  milestoneIdValidator,
  validate,
  unsaveMilestone
);

router.post(
  "/milestone/:milestoneId/comment",
  protect,
  milestoneIdValidator,
  commentMilestoneValidator,
  validate,
  commentMilestone
);

router.get(
  "/milestone/:milestoneId/comments",
  protect,
  milestoneIdValidator,
  validate,
  getMilestoneComments
);

export default router;
