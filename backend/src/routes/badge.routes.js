import express from "express";

import { getBadgeCatalog, getMyBadges, getUserBadges } from "../controllers/badge.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/catalog", protect, getBadgeCatalog);
router.get("/me", protect, getMyBadges);
router.get("/user/:userId", protect, getUserBadges);

export default router;
