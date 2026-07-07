import express from "express";
import {
  getAdminReportDetail,
  listAdminReports,
  updateAdminReport,
} from "../controllers/adminReports.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/", adminProtect, listAdminReports);
router.get("/:reportId", adminProtect, getAdminReportDetail);
router.patch("/:reportId", adminProtect, updateAdminReport);

export default router;
