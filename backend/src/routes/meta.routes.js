import express from "express";
import {
  searchCompanies,
  searchColleges,
  searchLocations,
  searchSkills,
  searchDegrees,
  searchIndustries,
  createCompany,
  getVersionInfo,
} from "../controllers/meta.controller.js";

const router = express.Router();

// Intentionally unauthenticated — the "is my app up to date" check has to
// work even for a logged-out user sitting on a stale cached bundle, and
// external uptime/deploy-verification tooling needs to hit this without a
// session too. No user data is exposed here, only build metadata.
router.get("/version", getVersionInfo);

router.get("/companies", searchCompanies);
router.get("/colleges", searchColleges);
router.get("/locations", searchLocations);
router.get("/skills", searchSkills);
router.get("/degrees", searchDegrees);
router.get("/industries", searchIndustries);
router.post("/companies", createCompany);
export default router;