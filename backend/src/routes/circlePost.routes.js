import express from "express";
import multer from "multer";

import {
  createCirclePost,
  getCirclePosts,
  updateCirclePost,
  deleteCirclePost,
  likeCirclePost,
  commentCirclePost,
  reactToCirclePost,
} from "../controllers/circlePost.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createCirclePostValidator,
  commentCirclePostValidator,
} from "../validators/circlePost.validator.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
  "/circles/:circleId/posts",
  protect,
  upload.single("image"),
  createCirclePostValidator,
  validate,
  createCirclePost
);

router.get("/circles/:circleId/posts", protect, getCirclePosts);

router.patch("/circle-posts/:postId", protect, updateCirclePost);

router.delete("/circle-posts/:postId", protect, deleteCirclePost);

router.patch("/circle-posts/:postId/like", protect, likeCirclePost);

router.patch("/circle-posts/:postId/react", protect, reactToCirclePost);

router.post(
  "/circle-posts/:postId/comment",
  protect,
  commentCirclePostValidator,
  validate,
  commentCirclePost
);

export default router;