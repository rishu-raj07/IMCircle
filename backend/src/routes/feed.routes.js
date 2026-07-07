import express from "express";

import {
  getUniversalFeed,
  trackFeedImpressions,
} from "../controllers/feed.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getUniversalFeed);

router.post("/impressions", protect, trackFeedImpressions);

export default router;