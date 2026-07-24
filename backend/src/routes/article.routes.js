import express from "express";

import {
  listArticles,
  getFeaturedArticles,
  getArticleBySlug,
  getRelatedArticles,
  saveArticle,
  unsaveArticle,
  shareArticle,
  recordArticleView,
  createDraft,
  getArticleForEdit,
  updateArticle,
  publishArticle,
  archiveArticle,
  deleteArticle,
  getMyArticles,
  getMyDrafts,
  getMyPublished,
} from "../controllers/article.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { actionLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Order matters for single-segment GETs — "/featured" and "/me" must be
// registered before the catch-all "/:slug" or they'd be swallowed as slug
// lookups. Two-segment paths ("/me/drafts", "/:id/related", etc.) don't
// actually collide with ":slug" either way, but are kept grouped near their
// related route for readability.
router.get("/", protect, listArticles);
router.get("/featured", protect, getFeaturedArticles);

// Author's own dashboard — deliberately NOT rate-limited beyond the global
// limiter; these are reads.
router.get("/me", protect, getMyArticles);
router.get("/me/drafts", protect, getMyDrafts);
router.get("/me/published", protect, getMyPublished);

// Create/edit/publish/archive/delete — all ownership-checked inside the
// controller (author is always derived from req.user, never trusted from
// the body). PATCH is deliberately NOT behind actionLimiter — it's also
// the debounced-autosave endpoint, which legitimately fires every couple
// of seconds while someone is actively typing.
router.post("/", protect, actionLimiter, createDraft);
router.get("/:id/edit", protect, getArticleForEdit);
router.patch("/:id", protect, updateArticle);
router.post("/:id/publish", protect, actionLimiter, publishArticle);
router.post("/:id/archive", protect, actionLimiter, archiveArticle);
router.delete("/:id", protect, actionLimiter, deleteArticle);

router.get("/:id/related", protect, getRelatedArticles);
router.post("/:id/save", protect, actionLimiter, saveArticle);
router.delete("/:id/save", protect, actionLimiter, unsaveArticle);
router.post("/:id/share", protect, actionLimiter, shareArticle);
router.post("/:id/view", protect, actionLimiter, recordArticleView);

router.get("/:slug", protect, getArticleBySlug);

export default router;
