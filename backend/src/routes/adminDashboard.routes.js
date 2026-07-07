import express from "express";
import { getAdminDashboard } from "../controllers/adminDashboard.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/", adminProtect, getAdminDashboard);

export default router;
