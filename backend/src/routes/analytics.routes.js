import express from "express";

import {
  trackImpression,
  getMyAnalytics,
  getContentAnalytics,
  trackProfileView,
  getProfileAnalytics,
  getPostAnalytics,
  getLearningAnalytics,
  getProjectAnalytics,
  getJourneyAnalytics,
  getCircleAnalytics,
  trackSearchEvent,
  getMySearchAnalytics,
  getFollowerGrowthAnalytics,
  getMyAnalyticsDashboard,
  trackGenericBatch,
  trackGenericEvent,
} from "../controllers/analytics.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// ====================
// Trackers
// ====================

router.post("/event", trackGenericEvent);
router.post("/batch", trackGenericBatch);
router.post("/impression", protect, trackImpression);

router.post(
  "/profile-view/:userId",
  protect,
  trackProfileView
);

router.post(
  "/search",
  protect,
  trackSearchEvent
);

// ====================
// User Analytics
// ====================

router.get("/me", protect, getMyAnalytics);

router.get(
  "/profile/:userId",
  protect,
  getProfileAnalytics
);

router.get(
  "/search/me",
  protect,
  getMySearchAnalytics
);

// ====================
// Content Analytics
// ====================

router.get(
  "/post/:postId",
  protect,
  getPostAnalytics
);

router.get(
  "/learning/:learningId",
  protect,
  getLearningAnalytics
);

router.get(
  "/project/:projectId",
  protect,
  getProjectAnalytics
);

router.get(
  "/journey-stats/:journeyId",
  protect,
  getJourneyAnalytics
);

router.get(
  "/circle/:circleId",
  protect,
  getCircleAnalytics
);
router.get("/followers/me", protect, getFollowerGrowthAnalytics);
router.get("/dashboard/me", protect, getMyAnalyticsDashboard);
// ====================
// Generic Content Analytics
// ====================

router.get(
  "/content/:contentType/:contentId",
  protect,
  getContentAnalytics
);

export default router;
