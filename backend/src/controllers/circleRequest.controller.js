import CircleRequest from "../models/CircleRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../socket/socket.js";

const publicUserFields =
  "fullName username avatar coverImage headline bio field role skills location preferences stats followers following circle createdAt";

const getId = (value) => String(value);

const isSameId = (a, b) => getId(a) === getId(b);

const createNotification = async ({ recipient, sender, type, title, message }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
    });

    emitNotification(recipient, notification);
  } catch (error) {
    console.error("Circle notification skipped:", error.message);
  }
};

export const sendCircleRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (isSameId(senderId, receiverId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send circle request to yourself",
      });
    }

    const receiver = await User.findOne({
      _id: receiverId,
      isDeleted: false,
      isBlocked: false,
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const sender = await User.findById(senderId).select(
      "fullName username circle blockedUsers"
    );

    if (
      sender.blockedUsers?.some((id) => isSameId(id, receiverId)) ||
      receiver.blockedUsers?.some((id) => isSameId(id, senderId))
    ) {
      return res.status(403).json({
        success: false,
        message: "You can't send a circle request to this user",
      });
    }

    const alreadyInCircle = sender.circle?.some((id) =>
      isSameId(id, receiverId)
    );

    if (alreadyInCircle) {
      return res.status(200).json({
        success: true,
        message: "Already in your circle",
        status: "accepted",
      });
    }

    const existingPending = await CircleRequest.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: "Circle request already sent",
        request: existingPending,
        status: "pending",
      });
    }

    const reversePending = await CircleRequest.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending",
    });

    if (reversePending) {
      return res.status(200).json({
        success: true,
        message: "This user already sent you a circle request",
        request: reversePending,
        status: "received",
      });
    }

    const request = await CircleRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    await createNotification({
      recipient: receiverId,
      sender: senderId,
      type: "circle_request",
      title: "New circle request",
      message: `${sender.fullName || "Someone"} wants to add you to circle`,
    });

    return res.status(201).json({
      success: true,
      message: "Circle request sent",
      request,
      status: "pending",
    });
  } catch (error) {
    console.error("SEND CIRCLE REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const acceptCircleRequest = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const { requestId } = req.params;

    const request = await CircleRequest.findOne({
      _id: requestId,
      receiver: receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Circle request not found",
      });
    }

    const senderId = request.sender;

    request.status = "accepted";
    await request.save();

    await User.updateOne(
      { _id: receiverId },
      {
        $addToSet: {
          circle: senderId,
          followers: senderId,
          following: senderId,
        },
      }
    );

    await User.updateOne(
      { _id: senderId },
      {
        $addToSet: {
          circle: receiverId,
          followers: receiverId,
          following: receiverId,
        },
      }
    );

    const receiver = await User.findById(receiverId).select(
      "fullName circle followers following"
    );

    const sender = await User.findById(senderId).select(
      "circle followers following"
    );

    await User.findByIdAndUpdate(receiverId, {
      "stats.circleCount": receiver.circle.length,
      "stats.followersCount": receiver.followers.length,
      "stats.followingCount": receiver.following.length,
    });

    await User.findByIdAndUpdate(senderId, {
      "stats.circleCount": sender.circle.length,
      "stats.followersCount": sender.followers.length,
      "stats.followingCount": sender.following.length,
    });

    await createNotification({
      recipient: senderId,
      sender: receiverId,
      type: "circle_accepted",
      title: "Circle request accepted",
      message: `${receiver.fullName || "Someone"} accepted your circle request`,
    });

    return res.status(200).json({
      success: true,
      message: "Circle request accepted",
      request,
    });
  } catch (error) {
    console.error("ACCEPT CIRCLE REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const rejectCircleRequest = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const { requestId } = req.params;

    const request = await CircleRequest.findOne({
      _id: requestId,
      receiver: receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Circle request not found",
      });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Circle request rejected",
      request,
    });
  } catch (error) {
    console.error("REJECT CIRCLE REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getReceivedCircleRequests = async (req, res) => {
  try {
    const requests = await CircleRequest.find({
      receiver: req.user._id,
      status: "pending",
    })
      .populate("sender", publicUserFields)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET RECEIVED CIRCLE REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getSentCircleRequests = async (req, res) => {
  try {
    const requests = await CircleRequest.find({
      sender: req.user._id,
      status: "pending",
    })
      .populate("receiver", publicUserFields)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET SENT CIRCLE REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};