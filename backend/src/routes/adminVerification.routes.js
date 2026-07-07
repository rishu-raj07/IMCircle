import express from "express";
import { listVerificationRequests } from "../controllers/adminVerification.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/", adminProtect, listVerificationRequests);

export default router;
