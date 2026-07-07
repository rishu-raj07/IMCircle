import express from "express";
import {
  searchCompanies,
  createCompany,
  getCompanyBySlug,
} from "../controllers/company.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protect, searchCompanies);
router.post("/", protect, createCompany);
router.get("/:slug", protect, getCompanyBySlug);

export default router;