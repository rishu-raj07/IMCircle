import Notification from "../models/Notification.js";

const populateFields = "fullName name username avatar headline tagline";

// Every notification-creation call site across the app stores its target a
// little differently (post.controller.js uses a bare `post` field,
// JourneyMilestoneLike.js uses `data: { journey, milestone }`, the new
// learning-share notification uses `learning`/`data.learning`, etc). Rather
// than touching every one of those call sites, normalize them all here, at
// read time, into one consistent shape the frontend can rely on:
// { targetType, targetId, postId, journeyId, learningId, circleId, link }.
function deriveTarget(raw) {
  const data = raw?.data || {};
  const type = String(raw?.type || "").toLowerCase();

  const postId = raw?.post ? String(raw.post) : data.post ? String(data.post) : "";
  const milestoneId = raw?.milestone
    ? String(raw.milestone)
    : data.milestone
    ? String(data.milestone)
    : "";
  const journeyId = raw?.journey ? String(raw.journey) : data.journey ? String(data.journey) : "";
  const learningId = raw?.learning
    ? String(raw.learning)
    : data.learning
    ? String(data.learning)
    : "";
  const repostId = raw?.repost ? String(raw.repost) : data.repost ? String(data.repost) : "";
  const circleId = raw?.circle ? String(raw.circle) : data.circle ? String(data.circle) : "";

  const actorId = String(raw?.actor || raw?.sender || "");

  let targetType = raw?.targetType || "";
  let targetId = raw?.targetId ? String(raw.targetId) : "";

  if (!targetType) {
    if (postId) {
      targetType = "post";
      targetId = postId;
    } else if (milestoneId) {
      targetType = "journey_milestone";
      targetId = milestoneId;
    } else if (journeyId) {
      targetType = "journey";
      targetId = journeyId;
    } else if (learningId) {
      targetType = "learning";
      targetId = learningId;
    } else if (circleId) {
      targetType = "circle";
      targetId = circleId;
    } else if (type.startsWith("connection_") || type.includes("follow")) {
      targetType = "user";
      targetId = actorId;
    } else if (type.startsWith("circle_")) {
      targetType = "circle";
      targetId = circleId;
    } else {
      targetType = "user";
      targetId = actorId;
    }
  }

  let link = raw?.link || "";
  if (!link) {
    if (targetType === "journey" && journeyId) link = `/journey/${journeyId}`;
    else if (targetType === "journey_milestone" && journeyId) link = `/journey/${journeyId}`;
    else if (targetType === "learning" && learningId) link = `/learning-view/${learningId}`;
    else if (targetType === "circle" && circleId) link = `/circles/${circleId}`;
    // "post" has no dedicated single-post route yet — leave link empty and
    // let the frontend fall back to a safe existing route (the recipient's
    // own profile, since these are always "commented/liked your post").
  }

  return {
    targetType,
    targetId,
    postId,
    journeyId,
    learningId,
    repostId,
    circleId,
    link,
  };
}

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
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("sender", populateFields)
      .populate("actor", populateFields)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
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
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        recipient: req.user._id,
      },
      { isRead: true },
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
    await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      { isRead: true }
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