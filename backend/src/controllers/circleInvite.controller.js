import Circle from "../models/Circle.js";
import CircleMember from "../models/CircleMember.js";
import CircleInvite from "../models/CircleInvite.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../socket/socket.js";

const inviterFields = "fullName name username avatar headline";
const circleFields = "name description coverImage tags membersCount visibility";

// Invite a specific user to join a specific community. Unlike the personal
// circle-connection request, this always carries the circleId, so the
// invited person can see exactly which community they've been asked to
// join instead of a generic "wants to add you" request.
export const sendCircleInvite = async (req, res) => {
  try {
    const { circleId, userId } = req.params;
    const inviterId = req.user._id;

    if (String(inviterId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You can't invite yourself",
      });
    }

    const inviterMembership = await CircleMember.findOne({
      circle: circleId,
      user: inviterId,
    });

    if (!inviterMembership) {
      return res.status(403).json({
        success: false,
        message: "Join this circle before inviting others",
      });
    }

    const alreadyMember = await CircleMember.findOne({
      circle: circleId,
      user: userId,
    });

    if (alreadyMember) {
      return res.status(200).json({
        success: true,
        message: "This person is already a member",
        status: "member",
      });
    }

    const existingInvite = await CircleInvite.findOne({
      circle: circleId,
      invitedUser: userId,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(200).json({
        success: true,
        message: "Invite already sent",
        invite: existingInvite,
        status: "pending",
      });
    }

    const invite = await CircleInvite.create({
      circle: circleId,
      invitedBy: inviterId,
      invitedUser: userId,
    });

    const circle = await Circle.findById(circleId).select("name");
    const inviterName =
      req.user?.fullName || req.user?.name || req.user?.username || "Someone";

    try {
      const notification = await Notification.create({
        recipient: userId,
        sender: inviterId,
        type: "circle_invite",
        title: "Circle invite",
        message: `${inviterName} invited you to join ${circle?.name || "a circle"}`,
      });

      emitNotification(userId, notification);
    } catch (notifyError) {
      console.error("Circle invite notification skipped:", notifyError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Invite sent",
      invite,
      status: "pending",
    });
  } catch (error) {
    console.error("sendCircleInvite error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Invites the current user has already sent for a specific circle and are
// still pending — lets the inviter's own UI know who's already been invited
// even after a page refresh (invite state otherwise only lived in memory).
export const getSentCircleInvites = async (req, res) => {
  try {
    const { circleId } = req.params;

    const invites = await CircleInvite.find({
      circle: circleId,
      invitedBy: req.user._id,
      status: "pending",
    }).select("invitedUser");

    res.status(200).json({
      success: true,
      invitedUserIds: invites.map((invite) => String(invite.invitedUser)),
    });
  } catch (error) {
    console.error("getSentCircleInvites error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Invites the current user has received and hasn't acted on yet.
export const getMyCircleInvites = async (req, res) => {
  try {
    const invites = await CircleInvite.find({
      invitedUser: req.user._id,
      status: "pending",
    })
      .populate("circle", circleFields)
      .populate("invitedBy", inviterFields)
      .sort({ createdAt: -1 });

    const validInvites = invites.filter((invite) => invite.circle);

    res.status(200).json({
      success: true,
      count: validInvites.length,
      invites: validInvites,
    });
  } catch (error) {
    console.error("getMyCircleInvites error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Dismiss an invite without joining ("Not now").
export const dismissCircleInvite = async (req, res) => {
  try {
    const invite = await CircleInvite.findOneAndUpdate(
      {
        _id: req.params.inviteId,
        invitedUser: req.user._id,
        status: "pending",
      },
      { status: "dismissed" },
      { new: true }
    );

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invite not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invite dismissed",
    });
  } catch (error) {
    console.error("dismissCircleInvite error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
