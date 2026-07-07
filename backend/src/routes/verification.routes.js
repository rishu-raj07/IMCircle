import express from "express";

import {
  preRegisterVerification,
  getVerificationStatus,
} from "../controllers/verification.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/pre-register", protect, preRegisterVerification);
router.get("/status", protect, getVerificationStatus);

export default router;
