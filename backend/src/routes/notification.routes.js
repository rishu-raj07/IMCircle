import express from "express";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/me", protect, getNotifications);
router.get("/unread-count", protect, getUnreadNotificationCount);

router.patch("/read-all", protect, markAllNotificationsAsRead);
router.patch("/:notificationId/read", protect, markNotificationAsRead);

router.delete("/:notificationId", protect, deleteNotification);

export default router;
