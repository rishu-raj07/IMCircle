import express from "express";

import {
  createConversation,
  getConversations,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  deleteMessages,
  reactToMessage,
  deleteConversationForMe,
  blockConversation,
  unblockConversation,
  markMessagesAsSeen,
} from "../controllers/message.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { messageLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);

router.post("/conversation/:userId", protect, createConversation);

router.get("/:conversationId", protect, getMessages);

router.post("/:conversationId", protect, messageLimiter, sendMessage);

router.patch("/:conversationId/seen", protect, markMessagesAsSeen);

router.patch("/:conversationId/block", protect, blockConversation);

router.patch("/:conversationId/unblock", protect, unblockConversation);

router.delete("/:conversationId", protect, deleteConversationForMe);

router.patch("/message/:messageId/reaction", protect, reactToMessage);

router.patch("/message/:messageId", protect, editMessage);

router.delete("/messages/bulk", protect, deleteMessages);

router.delete("/message/:messageId", protect, deleteMessage);

export default router;
