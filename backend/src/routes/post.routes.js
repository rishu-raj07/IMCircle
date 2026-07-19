import express from "express";

import {
  createPost,
  updatePost,
  getFeed,
  getSinglePost,
  likePost,
  repostPost,
  sharePost,
  commentOnPost,
  savePost,
  deletePost,
  reportPost,
  getMyPosts,
  getSavedPosts,
  getPostComments,
  getPostLikers,
  votePostPoll,
  getPostPollVoters,
replyPostComment,
likePostComment,
deletePostComment,
} from "../controllers/post.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { actionLimiter } from "../middleware/rateLimit.middleware.js";

import {
  createPostValidator,
  commentValidator,
  postIdValidator,
} from "../validators/post.validator.js";

const router = express.Router();

router.post(
  "/",
  protect,
  upload.array("media", 2),
  createPostValidator,
  validate,
  createPost
);

router.get("/feed", protect, getFeed);

router.get("/me", protect, getMyPosts);
router.get("/saved", protect, getSavedPosts);
router.get("/:postId/comments", protect, postIdValidator, validate, getPostComments);

router.post(
  "/:postId/comments/:commentId/reply",
  protect,
  replyPostComment
);

router.patch(
  "/:postId/comments/:commentId/like",
  protect,
  likePostComment
);

router.delete(
  "/:postId/comments/:commentId",
  protect,
  deletePostComment
);
router.patch("/:postId/like", protect, postIdValidator, validate, likePost);
router.get("/:postId/likes", protect, postIdValidator, validate, getPostLikers);
router.patch("/:postId/poll/vote", protect, postIdValidator, validate, votePostPoll);
router.get("/:postId/poll/voters", protect, postIdValidator, validate, getPostPollVoters);
router.patch("/:postId/repost", protect, postIdValidator, validate, repostPost);
router.patch("/:postId/share", protect, postIdValidator, validate, sharePost);

router.post(
  "/:postId/comment",
  protect,
  postIdValidator,
  commentValidator,
  validate,
  commentOnPost
);

router.patch("/:postId/save", protect, postIdValidator, validate, savePost);
router.patch("/:postId", protect, postIdValidator, validate, updatePost);
router.delete("/:postId", protect, postIdValidator, validate, deletePost);
router.post("/:postId/report", protect, actionLimiter, postIdValidator, validate, reportPost);
router.get("/:postId", protect, postIdValidator, validate, getSinglePost);

export default router;