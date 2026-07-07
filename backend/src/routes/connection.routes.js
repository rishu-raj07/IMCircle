import express from "express";

import {
  sendCircleRequest,
  acceptCircleRequest,
  rejectCircleRequest,
  removeFromCircle,
  getCircleRequests,
  getCircleList,
} from "../controllers/connection.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", protect, sendCircleRequest);

router.patch("/accept/:requestId", protect, acceptCircleRequest);

router.patch("/reject/:requestId", protect, rejectCircleRequest);

router.delete("/remove/:userId", protect, removeFromCircle);

router.get("/requests", protect, getCircleRequests);

router.get("/list", protect, getCircleList);

export default router;