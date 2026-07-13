import express from "express";
import { proxyAvatarImage } from "../controllers/media.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/avatar", protect, proxyAvatarImage);

export default router;
