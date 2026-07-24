import express from "express";

import {
  getForYouNews,
  getArticles,
  getNewsCategories,
  getNewsById,
  openNews,
  saveNews,
  unsaveNews,
  shareNews,
  markNotInterested,
  removeNotInterested,
} from "../controllers/news.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { actionLimiter } from "../middleware/rateLimit.middleware.js";
import { newsIdValidator, listNewsValidator, shareNewsValidator } from "../validators/news.validator.js";

const router = express.Router();

router.get("/for-you", protect, listNewsValidator, validate, getForYouNews);
router.get("/articles", protect, listNewsValidator, validate, getArticles);
router.get("/categories", protect, getNewsCategories);
router.get("/:newsId", protect, newsIdValidator, validate, getNewsById);

router.post("/:newsId/open", protect, newsIdValidator, validate, openNews);
router.post("/:newsId/save", protect, actionLimiter, newsIdValidator, validate, saveNews);
router.delete("/:newsId/save", protect, actionLimiter, newsIdValidator, validate, unsaveNews);
router.post("/:newsId/share", protect, actionLimiter, shareNewsValidator, validate, shareNews);
router.post("/:newsId/not-interested", protect, actionLimiter, newsIdValidator, validate, markNotInterested);
router.delete("/:newsId/not-interested", protect, actionLimiter, newsIdValidator, validate, removeNotInterested);

export default router;
