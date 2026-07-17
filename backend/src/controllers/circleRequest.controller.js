import CircleRequest from "../models/CircleRequest.js";
import User from "../models/User.js";
import notificationService from "../services/notification.service.js";

const publicUserFields =
  "fullName name username avatar profileImage profilePicture picture photo photoURL image coverImage headline bio field role primaryInterest skills interests location preferences stats followers following circle createdAt gender";

const getId = (value) => String(value);

const isSameId = (a, b) => getId(a) === getId(b);

const withMutualCircleCount = (user, viewerCircleIds) => {
  if (!user) return null;
  const value = typeof user.toObject === "function" ? user.toObject() : user;
  const mutualCircleCount = (value.circle || []).filter((id) =>
    viewerCircleIds.has(String(id))
  ).length;

  return { ...value, mutualCircleCount };
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

    // dedupe: true — re-sending a request to the same person (after it
    // expired/was withdrawn client-side, or a double-tap) resurfaces the
    // same notification instead of stacking duplicates.
    notificationService
      .create({
        recipientId: receiverId,
        actorId: senderId,
        type: "circle_request",
        entityType: "user",
        entityId: senderId,
        metadata: { username: sender.username },
        message: `${sender.fullName || "Someone"} wants to add you to circle`,
        dedupe: true,
      })
      .catch(() => {});

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
      "fullName username circle followers following"
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

    // The original "X wants to add you to circle" notification (on the
    // receiver's side) is now stale — the request has been resolved — so
    // remove it, then notify the original sender that it was accepted.
    notificationService
      .removeByDedupeKey({
        type: "circle_request",
        entityType: "user",
        entityId: senderId,
        actorId: senderId,
        recipientId: receiverId,
      })
      .catch(() => {});

    notificationService
      .create({
        recipientId: senderId,
        actorId: receiverId,
        type: "circle_accepted",
        entityType: "user",
        entityId: receiverId,
        metadata: { username: receiver.username },
        message: `${receiver.fullName || "Someone"} accepted your circle request`,
      })
      .catch(() => {});

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

    // The pending "wants to add you to circle" notification is now stale —
    // the request has been resolved — so remove it. Deliberately NOT
    // creating a new "declined your request" notification: per the product
    // decision (documented alongside the same call in unfollowUser), a
    // rejection is a negative/quiet action that isn't surfaced to the
    // person who sent the request, to avoid notification spam around a
    // "no."
    notificationService
      .removeByDedupeKey({
        type: "circle_request",
        entityType: "user",
        entityId: request.sender,
        actorId: request.sender,
        recipientId: receiverId,
      })
      .catch(() => {});

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
    const rawRequests = await CircleRequest.find({
      receiver: req.user._id,
      status: "pending",
    })
      .populate("sender", publicUserFields)
      .sort({ createdAt: -1 })
      .lean();

    const viewerCircleIds = new Set((req.user.circle || []).map(String));
    const requests = rawRequests.map((request) => ({
      ...request,
      sender: withMutualCircleCount(request.sender, viewerCircleIds),
    }));

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
    const rawRequests = await CircleRequest.find({
      sender: req.user._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    const receiverIds = rawRequests.map((request) => request.receiver);
    const receivers = await User.find({ _id: { $in: receiverIds } })
      .select(publicUserFields)
      .lean();
    const viewerCircleIds = new Set((req.user.circle || []).map(String));
    const receiverById = new Map(
      receivers.map((user) => [
        String(user._id),
        withMutualCircleCount(user, viewerCircleIds),
      ])
    );

    // populate("receiver", ...) used to be used here directly, but Mongoose
    // silently sets the field to null if that User document can't be
    // resolved (e.g. it was deleted between the request being sent and this
    // being fetched) — which threw away the raw id along with it. The
    // frontend (Home.jsx/Network.jsx's getPendingReceiverId) already falls
    // back to a `receiverId` field for exactly this case, but this endpoint
    // never sent one, so a request whose receiver failed to populate
    // silently dropped out of the "already requested" list — the Suggested
    // People card for that person would show "+Circle" again even though a
    // pending request genuinely still existed. Resolving receivers
    // separately (instead of via populate) means the raw id is always sent
    // regardless of whether the receiver doc itself was found.
    const requests = rawRequests.map((request) => ({
      ...request,
      receiverId: String(request.receiver),
      receiver: receiverById.get(String(request.receiver)) || null,
    }));

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
