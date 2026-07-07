import express from "express";
import {
  getAdminContentDetail,
  listAdminContent,
  updateAdminContentVisibility,
} from "../controllers/adminContent.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/", adminProtect, listAdminContent);
router.get("/:type/:contentId", adminProtect, getAdminContentDetail);
router.patch("/:type/:contentId", adminProtect, updateAdminContentVisibility);

export default router;
