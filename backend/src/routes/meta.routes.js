import express from "express";
import {
  searchCompanies,
  searchColleges,
  searchLocations,
  searchSkills,
  searchDegrees,
  searchIndustries,
  createCompany,
} from "../controllers/meta.controller.js";

const router = express.Router();

router.get("/companies", searchCompanies);
router.get("/colleges", searchColleges);
router.get("/locations", searchLocations);
router.get("/skills", searchSkills);
router.get("/degrees", searchDegrees);
router.get("/industries", searchIndustries);
router.post("/companies", createCompany);
export default router;