import Notification from "../models/Notification.js";
import { deriveTarget } from "../utils/notificationTarget.js";

const populateFields = "fullName name username avatar headline tagline gender";

function shapeNotification(doc) {
  const raw = doc.toObject ? doc.toObject() : doc;
  const actorDoc = raw.actor || raw.sender || null;
  const target = deriveTarget(raw);

  return {
    ...raw,
    actor: actorDoc
      ? {
          _id: actorDoc._id,
          name: actorDoc.fullName || actorDoc.name || actorDoc.username || "",
          username: actorDoc.username || "",
          avatar: actorDoc.avatar || "",
          tagline: actorDoc.headline || actorDoc.tagline || "",
        }
      : null,
    ...target,
  };
}

export const getNotifications = async (req, res) => {
  try {
    // Clamp page/limit to sane bounds so a bad or malicious query param
    // can't force an unbounded scan (e.g. ?limit=999999).
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate("sender", populateFields)
        .populate("actor", populateFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      limit,
      hasMore: skip + notifications.length < total,
      notifications: notifications.map(shapeNotification),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    // findOneAndUpdate bypasses the model's pre('save') hook that normally
    // keeps read/isRead/readAt in sync, so all three are set explicitly
    // here rather than relying on that hook.
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        recipient: req.user._id,
      },
      { isRead: true, read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    // updateMany also bypasses pre('save') — same explicit three-field sync
    // as markNotificationAsRead above.
    await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      { isRead: true, read: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};