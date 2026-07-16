import express from "express";

import { unfurlUrl } from "../controllers/linkPreview.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, unfurlUrl);

export default router;
