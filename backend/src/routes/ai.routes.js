import express from "express";
import {
  getProfileSuggestions,
  generatePostIdeas,
  summarizeLearning,
    getProjectAdvice,
      getDailyCoach,
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/post-ideas", protect, generatePostIdeas);
router.post("/learning-summary", protect, summarizeLearning);
router.post("/project-advisor", protect, getProjectAdvice);
router.get("/daily-coach", protect, getDailyCoach);
router.get("/profile-suggestions", protect, getProfileSuggestions);

export default router;