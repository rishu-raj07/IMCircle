import express from "express";
import {
  searchCompanies,
  createCompany,
  verifyCompanyWebsite,
  getCompanyBySlug,
} from "../controllers/company.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protect, searchCompanies);
router.post("/verify-domain", protect, verifyCompanyWebsite);
router.post("/", protect, createCompany);
router.get("/:slug", protect, getCompanyBySlug);

export default router;
