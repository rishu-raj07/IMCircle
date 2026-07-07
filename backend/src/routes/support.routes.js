import express from "express";

import { reportProblem } from "../controllers/support.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { actionLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/report", protect, actionLimiter, reportProblem);

export default router;
