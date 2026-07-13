import express from "express";
import {
  getLocationDetails,
  reverseLocation,
  searchLocations,
} from "../controllers/location.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protect, searchLocations);
router.get("/details", protect, getLocationDetails);
router.get("/reverse", protect, reverseLocation);

export default router;

