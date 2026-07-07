import express from "express";
import multer from "multer";

import {
  createLearning,
  getLearnings,
  getSingleLearning,
  updateLearning,
  deleteLearning,
  getMyLearnings,
  likeLearning,
  unlikeLearning,
  commentLearning,
  getLearningComments,
  saveLearning,
  unsaveLearning,
  getSavedLearnings,
  repostLearning,
  shareLearning,
  viewLearning,
  getLearningViewers,
  getLearningActivity,
  getUserLearnings,
} from "../controllers/learning.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createLearningValidator,
  updateLearningValidator,
  learningIdValidator,
  learningCommentValidator,
  learningRepostValidator,
  learningFeedValidator,
} from "../validators/learning.validator.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Explicit allowlist — `startsWith("image/")` also matches
    // "image/svg+xml", which can carry embedded script (stored XSS).
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only image files are allowed"), false);
    }

    cb(null, true);
  },
});

router.post(
  "/",
  protect,
  upload.single("image"),
  createLearningValidator,
  validate,
  createLearning
);

router.get("/", protect, learningFeedValidator, validate, getLearnings);

router.get("/my", protect, getMyLearnings);
router.get("/me", protect, getMyLearnings);
router.get("/user/:userId", protect, getUserLearnings);

router.get("/saved", protect, getSavedLearnings);

router.patch("/:id/like", protect, learningIdValidator, validate, likeLearning);

router.patch(
  "/:id/unlike",
  protect,
  learningIdValidator,
  validate,
  unlikeLearning
);

router.post(
  "/:id/comment",
  protect,
  learningIdValidator,
  learningCommentValidator,
  validate,
  commentLearning
);

router.get(
  "/:id/comments",
  protect,
  learningIdValidator,
  validate,
  getLearningComments
);

router.patch("/:id/save", protect, learningIdValidator, validate, saveLearning);

router.patch(
  "/:id/unsave",
  protect,
  learningIdValidator,
  validate,
  unsaveLearning
);

router.post(
  "/:id/repost",
  protect,
  learningIdValidator,
  learningRepostValidator,
  validate,
  repostLearning
);

router.patch(
  "/:id/share",
  protect,
  learningIdValidator,
  validate,
  shareLearning
);
router.post(
  "/:id/view",
  protect,
  learningIdValidator,
  validate,
  viewLearning
);

router.get(
  "/:id/viewers",
  protect,
  learningIdValidator,
  validate,
  getLearningViewers
);

router.get(
  "/:id/activity",
  protect,
  learningIdValidator,
  validate,
  getLearningActivity
);
router.get("/:id", protect, learningIdValidator, validate, getSingleLearning);

router.patch(
  "/:id",
  protect,
  learningIdValidator,
  upload.single("image"),
  updateLearningValidator,
  validate,
  updateLearning
);

router.delete("/:id", protect, learningIdValidator, validate, deleteLearning);

export default router;
