import express from "express";

import { trending, search, getHashtagFeed } from "../controllers/hashtag.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/trending", protect, trending);
router.get("/search", protect, search);
router.get("/:tag", protect, getHashtagFeed);

export default router;
