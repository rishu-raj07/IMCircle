import express from "express";

import {
  getCategories,
  getCurrent,
  getNavWeeks,
  getWeek,
  getArchive,
  getUserWins,
  nominate,
  getMyNominations,
  upvote,
  getTopActive,
} from "../controllers/spotlight.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/categories", protect, getCategories);
router.get("/current", protect, getCurrent);
router.get("/nav", protect, getNavWeeks);
router.get("/weeks", protect, getArchive);
router.get("/weeks/:weekKey/top-active", protect, getTopActive);
router.get("/weeks/:weekKey", protect, getWeek);
router.get("/user/:userId", protect, getUserWins);
router.get("/nominations/mine", protect, getMyNominations);
router.post("/nominate", protect, nominate);
router.post("/weeks/:weekKey/:category/upvote", protect, upvote);

export default router;
