import express from "express";

import {
  createCircle,
  getCircles,
  getSingleCircle,
  getCircleMembers,
  joinCircle,
  leaveCircle,
  getMyCircles,
  getTrendingCircles,
  getBrowseCircles,
  requestToJoinCircle,
  getMySentCircleJoinRequests,
  getCircleJoinRequests,
  acceptCircleJoinRequest,
  rejectCircleJoinRequest,
  makeCircleAdmin,
  removeCircleMember,
  restrictCircleMember,
  unrestrictCircleMember,
  demoteCircleAdmin,
  deleteCircle,
} from "../controllers/circle.controller.js";

import {
  sendCircleInvite,
  getSentCircleInvites,
  getMyCircleInvites,
  dismissCircleInvite,
} from "../controllers/circleInvite.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCircleValidator } from "../validators/circle.validator.js";

const router = express.Router();

router.post("/", protect, createCircleValidator, validate, createCircle);

router.get("/", protect, getCircles);

router.get("/my", protect, getMyCircles);

router.get("/trending", protect, getTrendingCircles);

router.get("/browse", protect, getBrowseCircles);

router.get("/join-requests/mine", protect, getMySentCircleJoinRequests);

router.get("/invites/received", protect, getMyCircleInvites);

router.patch("/invites/:inviteId/dismiss", protect, dismissCircleInvite);

router.post("/:circleId/invite/:userId", protect, sendCircleInvite);

router.get("/:circleId/invites/sent", protect, getSentCircleInvites);

router.post("/:circleId/request-join", protect, requestToJoinCircle);

router.get("/:circleId/join-requests", protect, getCircleJoinRequests);

router.patch("/:circleId/join-requests/:requestId/accept", protect, acceptCircleJoinRequest);

router.patch("/:circleId/join-requests/:requestId/reject", protect, rejectCircleJoinRequest);

router.get("/:circleId/members", protect, getCircleMembers);

router.patch("/:circleId/members/:userId/make-admin", protect, makeCircleAdmin);

router.patch("/:circleId/members/:userId/remove-admin", protect, demoteCircleAdmin);

router.delete("/:circleId/members/:userId", protect, removeCircleMember);

router.patch("/:circleId/members/:userId/restrict", protect, restrictCircleMember);

router.patch("/:circleId/members/:userId/unrestrict", protect, unrestrictCircleMember);

router.get("/:circleId", protect, getSingleCircle);

router.post("/:circleId/join", protect, joinCircle);

router.post("/:circleId/leave", protect, leaveCircle);

router.delete("/:circleId", protect, deleteCircle);

export default router;
