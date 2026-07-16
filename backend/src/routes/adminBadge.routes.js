import express from "express";

import {
  getCatalog,
  searchUsers,
  getUserBadgeDetail,
  award,
  revoke,
  recentAwards,
} from "../controllers/adminBadge.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/catalog", adminProtect, getCatalog);
router.get("/search-users", adminProtect, searchUsers);
router.get("/recent", adminProtect, recentAwards);
router.get("/user/:userId", adminProtect, getUserBadgeDetail);
router.post("/award", adminProtect, award);
router.post("/revoke", adminProtect, revoke);

export default router;
