import express from "express";
import {
  getAdminUserDetail,
  listAdminUsers,
  softDeleteAdminUser,
  suspendAdminUser,
  unsuspendAdminUser,
} from "../controllers/adminUsers.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/", adminProtect, listAdminUsers);
router.get("/:userId", adminProtect, getAdminUserDetail);
router.patch("/:userId/suspend", adminProtect, suspendAdminUser);
router.patch("/:userId/unsuspend", adminProtect, unsuspendAdminUser);
router.delete("/:userId", adminProtect, softDeleteAdminUser);

export default router;
