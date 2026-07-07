import express from "express";

import {
  sendCircleRequest,
  acceptCircleRequest,
  rejectCircleRequest,
  getReceivedCircleRequests,
  getSentCircleRequests,
} from "../controllers/circleRequest.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:userId/send", protect, sendCircleRequest);

router.patch("/:requestId/accept", protect, acceptCircleRequest);

router.patch("/:requestId/reject", protect, rejectCircleRequest);

router.get("/received", protect, getReceivedCircleRequests);

router.get("/sent", protect, getSentCircleRequests);

export default router;