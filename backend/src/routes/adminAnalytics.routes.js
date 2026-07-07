import express from "express";
import {
  getAdminAnalyticsContent,
  getAdminAnalyticsEvents,
  getAdminAnalyticsOverview,
  getAdminAnalyticsScreenTime,
  getAdminAnalyticsSessions,
  getAdminAnalyticsUsers,
} from "../controllers/adminAnalytics.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/overview", adminProtect, getAdminAnalyticsOverview);
router.get("/events", adminProtect, getAdminAnalyticsEvents);
router.get("/sessions", adminProtect, getAdminAnalyticsSessions);
router.get("/screen-time", adminProtect, getAdminAnalyticsScreenTime);
router.get("/content", adminProtect, getAdminAnalyticsContent);
router.get("/users", adminProtect, getAdminAnalyticsUsers);

export default router;
