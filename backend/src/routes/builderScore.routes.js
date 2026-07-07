import express from "express";

import {
  getMyBuilderScore,
  getUserBuilderScore,
  getBuilderLeaderboard,
} from "../controllers/builderScore.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getMyBuilderScore);

router.get("/leaderboard", protect, getBuilderLeaderboard);

router.get("/:userId", protect, getUserBuilderScore);

export default router;