import express from "express";
import {
  searchColleges,
  createCollege,
  getCollegeBySlug,
} from "../controllers/college.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protect, searchColleges);
router.post("/", protect, createCollege);
router.get("/:slug", protect, getCollegeBySlug);

export default router;