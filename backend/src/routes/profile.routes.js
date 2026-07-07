import express from "express";

import {
  getProfile,
  updateProfile,
  updateOpenToWork,
  updateOpenToHiring,
  deleteProfile,
  suggestUsername,
  checkUsername,
} from "../controllers/profile.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateProfileValidator } from "../validators/profile.validator.js";

const router = express.Router();

router.get("/me", protect, getProfile);

router.get("/username/suggestions", protect, suggestUsername);
router.get("/username/availability", protect, checkUsername);

router.put(
  "/update",
  protect,
  updateProfileValidator,
  validate,
  updateProfile
);

router.patch("/open-to-work", protect, updateOpenToWork);

router.patch("/open-to-hiring", protect, updateOpenToHiring);

router.delete("/delete", protect, deleteProfile);

export default router;