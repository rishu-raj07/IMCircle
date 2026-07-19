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

// Same messageLimiter budget as sending — edit/react/delete are just as
// easy to script-flood as sending itself, and were previously the only
// message mutations with no rate limit at all.
router.patch("/message/:messageId/reaction", protect, messageLimiter, reactToMessage);

router.patch("/message/:messageId", protect, messageLimiter, editMessage);

router.delete("/messages/bulk", protect, messageLimiter, deleteMessages);

router.delete("/message/:messageId", protect, messageLimiter, deleteMessage);

export default router;
