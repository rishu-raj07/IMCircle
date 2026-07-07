import express from "express";

import {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  verifyOtp,
  resendOtp,
  getMe,
  sendMobileOtp,
  verifyMobileOtp,
  googleLogin,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  authLimiter,
  otpLimiter,
  otpVerifyLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  registerValidator,
  loginValidator,
  verifyOtpValidator,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, register);
router.post("/verify-otp", otpVerifyLimiter, verifyOtpValidator, validate, verifyOtp);
router.post("/login", authLimiter, loginValidator, validate, login);
router.post("/resend-otp", otpLimiter, resendOtp);

router.post("/mobile/send-otp", otpLimiter, sendMobileOtp);
router.post("/mobile/verify-otp", otpVerifyLimiter, verifyMobileOtp);

router.post("/google", authLimiter, googleLogin);

router.post("/refresh-token", refreshToken);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.post("/logout-all", protect, logoutAll);

export default router;