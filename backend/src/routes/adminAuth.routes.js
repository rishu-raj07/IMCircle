import express from "express";
import {
  getAdminMe,
  logoutAdmin,
  sendAdminOtp,
  verifyAdminOtp,
} from "../controllers/adminAuth.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { otpLimiter, otpVerifyLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/send-otp", otpLimiter, sendAdminOtp);
router.post("/verify-otp", otpVerifyLimiter, verifyAdminOtp);
router.get("/me", adminProtect, getAdminMe);
router.post("/logout", adminProtect, logoutAdmin);

export default router;
