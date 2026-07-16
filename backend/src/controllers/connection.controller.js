import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import FollowerEvent from "../models/FollowerEvent.js";
import { emitNotification } from "../socket/socket.js";

const publicUserFields =
  "fullName username avatar headline field role location stats gender";

export const sendCircleRequest = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const recipientId = req.params.userId;

    if (requesterId.toString() === recipientId) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself to Circle",
      });
    }

    const requester = await User.findById(requesterId);
    const recipient = await User.findById(recipientId);

    if (!recipient || recipient.isDeleted || recipient.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message:
          existingConnection.status === "accepted"
            ? "User is already in your Circle"
            : "Circle request already exists",
      });
    }

    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    const notification = await Notification.create({
      recipient: recipientId,
      sender: requesterId,
      type: "connection_request",
      title: "New Circle request",
      message: `${requester.fullName} sent you a Circle request`,
      connection: connection._id,
    });

    emitNotification(recipientId, notification);

    res.status(201).json({
      success: true,
      message: "Circle request sent successfully",
      connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const acceptCircleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const connection = await Connection.findOne({
      _id: requestId,
      recipient: req.user._id,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Circle request not found",
      });
    }

    connection.status = "accepted";
    await connection.save();

    const recipient = await User.findById(connection.recipient);

    await User.findByIdAndUpdate(connection.requester, {
      $addToSet: { circle: connection.recipient },
      $inc: { "stats.connectionsCount": 1 },
    });

    await User.findByIdAndUpdate(connection.recipient, {
      $addToSet: { circle: connection.requester },
      $inc: { "stats.connectionsCount": 1 },
    });

    await FollowerEvent.create([
      {
        user: connection.requester,
        follower: connection.recipient,
        action: "follow",
      },
      {
        user: connection.recipient,
        follower: connection.requester,
        action: "follow",
      },
    ]);

    const notification = await Notification.create({
      recipient: connection.requester,
      sender: connection.recipient,
      type: "connection_accept",
      title: "Circle request accepted",
      message: `${recipient.fullName} accepted your Circle request`,
      connection: connection._id,
    });

    emitNotification(connection.requester, notification);

    res.status(200).json({
      success: true,
      message: "Circle request accepted",
      connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const rejectCircleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const connection = await Connection.findOne({
      _id: requestId,
      recipient: req.user._id,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Circle request not found",
      });
    }

    connection.status = "rejected";
    await connection.save();

    res.status(200).json({
      success: true,
      message: "Circle request rejected",
      connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const removeFromCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const connection = await Connection.findOne({
      status: "accepted",
      $or: [
        { requester: currentUserId, recipient: targetUserId },
        { requester: targetUserId, recipient: currentUserId },
      ],
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "User is not in your Circle",
      });
    }

    await Connection.findByIdAndDelete(connection._id);

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { circle: targetUserId },
      $inc: { "stats.connectionsCount": -1 },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $pull: { circle: currentUserId },
      $inc: { "stats.connectionsCount": -1 },
    });

    await FollowerEvent.create([
      {
        user: currentUserId,
        follower: targetUserId,
        action: "unfollow",
      },
      {
        user: targetUserId,
        follower: currentUserId,
        action: "unfollow",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "User removed from Circle",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getCircleRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.user._id,
      status: "pending",
    })
      .populate("requester", publicUserFields)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getCircleList = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("circle", publicUserFields)
      .select("circle");

    res.status(200).json({
      success: true,
      count: user.circle?.length || 0,
      circle: user.circle || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};