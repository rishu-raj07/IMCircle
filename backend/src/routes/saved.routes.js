import express from "express";
import { getSavedItems } from "../controllers/saved.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getSavedItems);

export default router;