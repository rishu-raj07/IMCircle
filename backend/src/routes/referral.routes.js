import express from "express";

import {
  getMyReferralStats,
  getMyReferredUsers,
  getUserReferralCount,
} from "../controllers/referral.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getMyReferralStats);
router.get("/me/referred", protect, getMyReferredUsers);
router.get("/user/:userId", protect, getUserReferralCount);

export default router;
