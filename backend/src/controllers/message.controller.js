import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

import {
  emitMessage,
  emitMessageSeen,
  emitMessagesUnsent,
  emitNotification,
  isUserOnline,
} from "../socket/socket.js";

const userPopulateFields =
  "fullName username avatar profileImage profilePicture image photo picture headline role occupation";

const getPlainId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString() || value?.id?.toString() || value?.toString() || "";
};

const hasUserInArray = (arr = [], userId) => {
  const targetId = getPlainId(userId);

  return arr.some((item) => {
    const itemUserId = getPlainId(item?.user || item);
    return itemUserId === targetId;
  });
};

const areCircleConnected = async (userAId, userBId) => {
  const userA = await User.findById(userAId).select("circle");
  const userB = await User.findById(userBId).select("circle");

  if (!userA || !userB) return false;

  const aHasB = hasUserInArray(userA.circle || [], userBId);
  const bHasA = hasUserInArray(userB.circle || [], userAId);

  return aHasB && bHasA;
};

const getOtherParticipantId = (conversation, currentUserId) => {
  const other = conversation.participants.find(
    (id) => getPlainId(id) !== getPlainId(currentUserId)
  );

  return getPlainId(other);
};

const isConversationBlocked = (conversation) =>
  Array.isArray(conversation?.blockedBy) && conversation.blockedBy.length > 0;

const getMessageStatus = (message, receiverId) => {
  const targetReceiverId = getPlainId(receiverId);

  if (!targetReceiverId) return "sent";

  const seenByReceiver = hasUserInArray(message.seenBy || [], targetReceiverId);
  if (seenByReceiver) return "seen";

  const deliveredToReceiver = hasUserInArray(
    message.deliveredTo || [],
    targetReceiverId
  );

  if (deliveredToReceiver) return "delivered";

  return "sent";
};

const getPreviewText = (text = "", attachments = []) => {
  const cleanText = text.trim();

  if (cleanText) return cleanText;

  if (attachments.length > 0) {
    switch (attachments[0].type) {
      case "image":
        return "📷 Image";
      case "video":
        return "🎥 Video";
      case "audio":
        return "🎤 Voice note";
      case "file":
        return "📄 Document";
      default:
        return "Attachment";
    }
  }

  return "";
};

export const createConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    }

    if (getPlainId(currentUserId) === getPlainId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const otherUser = await User.findById(otherUserId);

    if (!otherUser || otherUser.isDeleted || otherUser.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUserDoc = await User.findById(currentUserId).select("blockedUsers");
    const hasBlockRelation =
      (currentUserDoc?.blockedUsers || []).some((id) => String(id) === String(otherUserId)) ||
      (otherUser.blockedUsers || []).some((id) => String(id) === String(currentUserId));

    if (hasBlockRelation) {
      return res.status(403).json({
        success: false,
        message: "You can't message this user",
      });
    }

    const allowed = await areCircleConnected(currentUserId, otherUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You can message only accepted circle connections",
      });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: {
        $all: [currentUserId, otherUserId],
      },
      isDeleted: false,
    }).populate("participants", userPopulateFields);

    if (conversation && isConversationBlocked(conversation)) {
      return res.status(403).json({
        success: false,
        message: "This conversation is blocked",
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, otherUserId],
        unreadBy: [],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        "participants",
        userPopulateFields
      );
    } else if (hasUserInArray(conversation.deletedFor || [], currentUserId)) {
      await Message.updateMany(
        {
          conversation: conversation._id,
          isDeleted: false,
        },
        {
          $addToSet: {
            hiddenFor: currentUserId,
          },
        }
      );

      conversation.deletedFor = (conversation.deletedFor || []).filter(
        (id) => getPlainId(id) !== getPlainId(currentUserId)
      );
      conversation.unreadBy = (conversation.unreadBy || []).filter(
        (id) => getPlainId(id) !== getPlainId(currentUserId)
      );
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("createConversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isDeleted: false,
      deletedFor: {
        $ne: req.user._id,
      },
    })
      .populate("participants", userPopulateFields)
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const conversationsWithMeta = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUser = conversation.participants.find(
          (user) => getPlainId(user) !== getPlainId(req.user._id)
        );

        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          sender: {
            $ne: req.user._id,
          },
          "seenBy.user": {
            $ne: req.user._id,
          },
          hiddenFor: {
            $ne: req.user._id,
          },
          isDeleted: false,
        });

        const latestMessage = await Message.findOne({
          conversation: conversation._id,
          isDeleted: false,
          hiddenFor: {
            $ne: req.user._id,
          },
        })
          .populate("sender", userPopulateFields)
          .sort({ createdAt: -1 });

        let lastMessageStatus = "";

        if (
          latestMessage &&
          getPlainId(latestMessage.sender) === getPlainId(req.user._id)
        ) {
          lastMessageStatus = getMessageStatus(latestMessage, otherUser?._id);
        }

        return {
          ...conversation.toObject(),
          unreadCount,
          latestMessage,
          lastMessage: latestMessage ? conversation.lastMessage : "",
          lastMessageAt: latestMessage ? conversation.lastMessageAt : null,
          lastMessageStatus,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: conversationsWithMeta.length,
      conversations: conversationsWithMeta,
    });
  } catch (error) {
    console.error("getConversations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text = "", attachments = [], clientTempId = "" } = req.body;

    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to message in this conversation",
      });
    }

    const otherUserId = getOtherParticipantId(conversation, req.user._id);

    if (isConversationBlocked(conversation)) {
      return res.status(403).json({
        success: false,
        message: "This conversation is blocked",
      });
    }

    const [currentUserDoc, otherUserDoc] = await Promise.all([
      User.findById(req.user._id).select("blockedUsers"),
      User.findById(otherUserId).select("blockedUsers"),
    ]);
    const hasBlockRelation =
      (currentUserDoc?.blockedUsers || []).some((id) => String(id) === String(otherUserId)) ||
      (otherUserDoc?.blockedUsers || []).some((id) => String(id) === String(req.user._id));

    if (hasBlockRelation) {
      return res.status(403).json({
        success: false,
        message: "You can't message this user",
      });
    }

    const allowed = await areCircleConnected(req.user._id, otherUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You can message only accepted circle connections",
      });
    }

    if (!text.trim() && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message text or attachment is required",
      });
    }

    const validTypes = ["audio"];

    const formattedAttachments = attachments.map((item) => ({
      url: item.url,
      publicId: item.publicId,
      type: validTypes.includes(item.type) ? item.type : "file",
    })).filter((item) => item.type === "audio" && item.url);

    if (attachments.length > 0 && formattedAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Only voice messages are allowed",
      });
    }

    const receiverIds = conversation.participants.filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );

    const deliveredTo = receiverIds
      .filter((id) => isUserOnline(id))
      .map((id) => ({
        user: id,
        deliveredAt: new Date(),
      }));

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim(),
      clientTempId,
      attachments: formattedAttachments,
      seenBy: [],
      deliveredTo,
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      userPopulateFields
    );

    const preview = getPreviewText(text, formattedAttachments);

    conversation.lastMessage = preview;
    conversation.lastMessageAt = new Date();
    conversation.unreadBy = receiverIds;
    conversation.deletedFor = (conversation.deletedFor || []).filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );

    await conversation.save();

    const receiverId = receiverIds[0];

    const messageObj = populatedMessage.toObject();
    messageObj.status = getMessageStatus(messageObj, receiverId);

    emitMessage(conversation._id, messageObj);

    // Best-effort notification so a direct message shows up in the
    // recipient's Notifications tab and, when tapped, opens this exact
    // conversation (see targetType "message" handling in
    // notification.controller.js) instead of falling back to Network.
    // Skipped while the recipient is actively online/connected (they're
    // already seeing it live via the socket) to avoid flooding the
    // Notifications tab during a live back-and-forth conversation.
    if (receiverId && !isUserOnline(receiverId)) {
      try {
        const senderName =
          req.user.fullName || req.user.name || req.user.username || "Someone";

        const notification = await Notification.create({
          recipient: receiverId,
          sender: req.user._id,
          type: "message",
          title: senderName,
          message: preview || "Sent you a message",
          targetType: "message",
          targetId: conversation._id,
          data: { conversationId: conversation._id, senderId: req.user._id },
        });

        emitNotification(receiverId, notification);
      } catch (notifyError) {
        console.error("Message notification skipped:", notifyError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: messageObj,
    });
  } catch (error) {
    console.error("sendMessage error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.conversationId
    ).populate("participants", userPopulateFields);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (user) => getPlainId(user) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to view this conversation",
      });
    }

    const otherUser = conversation.participants.find(
      (user) => getPlainId(user) !== getPlainId(req.user._id)
    );

    const allowed = await areCircleConnected(req.user._id, otherUser?._id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You can view messages only with accepted circle connections",
      });
    }

    if (hasUserInArray(conversation.deletedFor || [], req.user._id)) {
      await Message.updateMany(
        {
          conversation: conversation._id,
          isDeleted: false,
        },
        {
          $addToSet: {
            hiddenFor: req.user._id,
          },
        }
      );

      conversation.deletedFor = (conversation.deletedFor || []).filter(
        (id) => getPlainId(id) !== getPlainId(req.user._id)
      );
    }

    const seenUpdate = await Message.updateMany(
      {
        conversation: req.params.conversationId,
        sender: {
          $ne: req.user._id,
        },
        "seenBy.user": {
          $ne: req.user._id,
        },
        hiddenFor: {
          $ne: req.user._id,
        },
      },
      {
        $push: {
          seenBy: {
            user: req.user._id,
            seenAt: new Date(),
          },
        },
      }
    );

    conversation.unreadBy = conversation.unreadBy.filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );

    await conversation.save();

    const messages = await Message.find({
      conversation: req.params.conversationId,
      isDeleted: false,
      hiddenFor: {
        $ne: req.user._id,
      },
    })
      .populate("sender", userPopulateFields)
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map((message) => {
      const obj = message.toObject();
      const isMyMessage = getPlainId(obj.sender) === getPlainId(req.user._id);

      if (isMyMessage) {
        obj.status = getMessageStatus(obj, otherUser?._id);
      }

      return obj;
    });

    if (seenUpdate.modifiedCount > 0) {
      emitMessageSeen(req.params.conversationId, req.user._id);
    }

    return res.status(200).json({
      success: true,
      count: formattedMessages.length,
      conversation,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("getMessages error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to access this conversation",
      });
    }

    const otherUserId = getOtherParticipantId(conversation, req.user._id);

    const allowed = await areCircleConnected(req.user._id, otherUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You can mark messages seen only with accepted circle connections",
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: {
          $ne: req.user._id,
        },
        "seenBy.user": {
          $ne: req.user._id,
        },
      },
      {
        $push: {
          seenBy: {
            user: req.user._id,
            seenAt: new Date(),
          },
        },
      }
    );

    conversation.unreadBy = conversation.unreadBy.filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );

    await conversation.save();

    emitMessageSeen(conversationId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen",
    });
  } catch (error) {
    console.error("markMessagesAsSeen error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (getPlainId(message.sender) !== getPlainId(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    message.isDeleted = true;
    await message.save();

    return res.status(200).json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("deleteMessage error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deleteMessages = async (req, res) => {
  try {
    const scope = req.body.scope === "everyone" ? "everyone" : "me";
    const ids = Array.isArray(req.body.messageIds)
      ? req.body.messageIds.filter(Boolean)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message ids are required",
      });
    }

    const messages = await Message.find({ _id: { $in: ids }, isDeleted: false }).select("sender conversation");
    if (scope === "everyone") {
      const notOwned = messages.some(
        (message) => getPlainId(message.sender) !== getPlainId(req.user._id)
      );

      if (notOwned || messages.length !== ids.length) {
        return res.status(403).json({ success: false, message: "You can only unsend messages that you sent." });
      }

      await Message.updateMany(
        { _id: { $in: ids }, sender: req.user._id, isDeleted: false },
        { $set: { isDeleted: true } }
      );

      const conversationIds = [...new Set(messages.map((message) => getPlainId(message.conversation)).filter(Boolean))];
      conversationIds.forEach((conversationId) => emitMessagesUnsent(conversationId, ids));
    } else {
      await Message.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $addToSet: { hiddenFor: req.user._id } }
      );
    }

    return res.status(200).json({
      success: true,
      message: scope === "everyone" ? "Messages unsent" : "Messages deleted for you",
      deletedIds: ids,
    });
  } catch (error) {
    console.error("deleteMessages error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { reaction = "" } = req.body;
    const cleanReaction = String(reaction || "").trim();

    if (!cleanReaction || cleanReaction.length > 16) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction",
      });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const conversation = await Conversation.findById(message.conversation);
    const isParticipant = conversation?.participants?.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    message.reactions = (message.reactions || []).filter(
      (item) => getPlainId(item.user) !== getPlainId(req.user._id)
    );
    message.reactions.push({
      user: req.user._id,
      reaction: cleanReaction,
      reactedAt: new Date(),
    });

    await message.save();

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("reactToMessage error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deleteConversationForMe = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this chat",
      });
    }

    conversation.deletedFor = [
      ...new Set([...(conversation.deletedFor || []), req.user._id].map(String)),
    ];
    conversation.unreadBy = (conversation.unreadBy || []).filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );
    await conversation.save();

    await Message.updateMany(
      {
        conversation: conversation._id,
        isDeleted: false,
      },
      {
        $addToSet: {
          hiddenFor: req.user._id,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Chat deleted",
    });
  } catch (error) {
    console.error("deleteConversationForMe error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const blockConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to block this chat",
      });
    }

    conversation.blockedBy = [
      ...new Set([...(conversation.blockedBy || []), req.user._id].map(String)),
    ];
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "User blocked",
      conversation,
    });
  } catch (error) {
    console.error("blockConversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const unblockConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || conversation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => getPlainId(id) === getPlainId(req.user._id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to unblock this chat",
      });
    }

    conversation.blockedBy = (conversation.blockedBy || []).filter(
      (id) => getPlainId(id) !== getPlainId(req.user._id)
    );
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "User unblocked",
      conversation,
    });
  } catch (error) {
    console.error("unblockConversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
