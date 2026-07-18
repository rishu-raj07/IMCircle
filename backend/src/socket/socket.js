import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { sendPushToUser } from "../services/push.service.js";
import { allowedOrigins } from "../middleware/security.middleware.js";

let io;
const onlineUsers = new Map();

const getAccessSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

// Minimal cookie-header parser — avoids pulling in an undeclared transitive
// dependency just to read one cookie off the raw handshake headers.
const readCookie = (cookieHeader, name) => {
  if (!cookieHeader) return "";

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!match) return "";

  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return "";
  }
};

// Every socket connection used to be fully anonymous — any client could
// `emit("user_online", <anyone's id>)` and start receiving that person's
// notifications, or `emit("join_chat", <any conversationId>)` and listen in
// on a conversation it was never part of. This middleware authenticates the
// handshake the same way the REST `protect` middleware does (same cookie,
// same JWT), and every handler below now trusts `socket.data.userId` —
// derived from the verified token — instead of whatever the client claims.
const authenticateSocket = async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers?.cookie || "";
    const token =
      socket.handshake.auth?.token || readCookie(cookieHeader, "accessToken");

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const secret = getAccessSecret();
    if (!secret) {
      return next(new Error("Server misconfigured"));
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select(
      "_id isDeleted isBlocked blockedUsers"
    );

    if (!user || user.isDeleted || user.isBlocked) {
      return next(new Error("Account not available"));
    }

    socket.data.userId = user._id.toString();
    // Cached at connect time so the per-socket online-list filter below
    // doesn't need a DB round trip on every presence change. This can go
    // stale if the user blocks someone mid-session (reconnect picks up the
    // latest list) — an acceptable tradeoff for a low-severity field.
    socket.data.blockedUsers = (user.blockedUsers || []).map((id) => id.toString());
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired session"));
  }
};

// Broadcasting the full online-user-id list to literally everyone (the old
// `io.emit("online_users", [...])`) meant a user could see whether someone
// they'd blocked was online — a presence-privacy leak for exactly the
// relationship the block feature is supposed to sever. This sends each
// connected socket its own filtered view instead: the global online list
// minus anyone that socket's user has blocked. (Hiding a user's presence
// from people who blocked *them* would need a live reverse-block index and
// is left as a follow-up — this covers the more common "I don't want to see
// people I've blocked" direction.)
const broadcastOnlineUsers = () => {
  if (!io) return;
  const allOnline = Array.from(onlineUsers.keys());

  for (const socket of io.sockets.sockets.values()) {
    const blocked = socket.data?.blockedUsers;
    const visible =
      blocked && blocked.length
        ? allOnline.filter((id) => !blocked.includes(id))
        : allOnline;

    socket.emit("online_users", visible);
  }
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      // Was a single hardcoded origin — anyone whose browser sent
      // Origin: https://www.imcircle.com (nginx serves both www and apex)
      // had their socket handshake rejected outright. That socket never
      // connecting is exactly what silently breaks online/offline status,
      // the typing indicator, and live message delivery for that person's
      // whole session — REST calls (loading the page, sending a message)
      // still work fine over plain HTTPS, so nothing looked "down" until
      // you noticed presence/typing never updated and a refresh was needed
      // to see a message that had actually already arrived.
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    if (process.env.NODE_ENV !== "production") {
      console.log("Socket connected:", socket.id, "user:", userId);
    }

    // Always the authenticated user's own room — never trust a
    // client-supplied id here.
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    broadcastOnlineUsers();

    socket.on("user_online", () => {
      // Kept as a no-op event for backward compatibility with the existing
      // frontend, which still emits this on connect — the actual room join
      // already happened above using the verified identity.
    });

    // The initial "online_users" broadcast above only fires from the
    // "connection" event, i.e. exactly once per actual underlying socket
    // connection. Navigating between pages (Home -> Chat, etc.) re-runs
    // React effects but does NOT reconnect an already-connected socket —
    // `socket.connect()` on an already-connected client is a no-op — so a
    // component that mounts its "online_users" listener after that point
    // (Chat.jsx, every time you open a conversation) would otherwise only
    // ever hear about presence changes from THIS point forward, never the
    // current state, and would show every already-online person as
    // "Offline" until someone else happened to connect or disconnect.
    // Chat.jsx calls this once right after wiring up its listener so it
    // always gets a real snapshot regardless of whether the socket was
    // already connected before this page mounted.
    socket.on("get_online_users", () => {
      const blocked = socket.data?.blockedUsers;
      const allOnline = Array.from(onlineUsers.keys());
      const visible =
        blocked && blocked.length
          ? allOnline.filter((id) => !blocked.includes(id))
          : allOnline;

      socket.emit("online_users", visible);
    });

    socket.on("join_chat", async (conversationId) => {
      if (!conversationId) return;

      try {
        const conversation = await Conversation.findById(conversationId).select("participants");

        const isParticipant = conversation?.participants?.some(
          (participantId) => participantId.toString() === userId
        );

        if (!isParticipant) return;

        socket.join(conversationId.toString());
      } catch {
        // Invalid id or lookup failure — just don't join the room.
      }
    });

    socket.on("leave_chat", (conversationId) => {
      if (!conversationId) return;
      socket.leave(conversationId.toString());
    });

    socket.on("message_delivered", async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;

        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            $addToSet: {
              deliveredTo: {
                user: userId,
                deliveredAt: new Date(),
              },
            },
          },
          { new: true }
        ).populate("sender", "fullName username avatar");

        if (!message) return;

        io.to(conversationId.toString()).emit("message_delivered_update", {
          messageId: message._id,
          conversationId,
          userId,
          deliveredTo: message.deliveredTo,
        });
      } catch (error) {
        console.error("message_delivered error:", error.message);
      }
    });

    socket.on("typing", ({ conversationId, sender }) => {
      if (!conversationId) return;
      socket.to(conversationId.toString()).emit("user_typing", sender);
    });

    socket.on("stop_typing", (conversationId) => {
      if (!conversationId) return;
      socket.to(conversationId.toString()).emit("user_stop_typing");
    });

    socket.on("disconnect", () => {
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);

        // Stamps the moment this user actually went offline, so Chat.jsx's
        // "Last seen ..." (shown once they're no longer online) reflects
        // when they really left rather than lastActiveAt's previous
        // meaning of "last login". Only updated on a genuine full
        // disconnect (checked above) — not on every reconnect/tab-switch —
        // and swallowed on error since a failed presence write must never
        // crash the socket layer.
        User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } }).catch(() => {});
      }

      broadcastOnlineUsers();
      if (process.env.NODE_ENV !== "production") {
        console.log("Socket disconnected:", socket.id);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};

export const isUserOnline = (userId) => {
  if (!userId) return false;
  return onlineUsers.has(userId.toString());
};

// Stricter than isUserOnline: true only if this user currently has a socket
// sitting in this exact conversation's room (i.e. the chat screen is open
// right now), not just connected somewhere else in the app. Used to decide
// whether a new DM should also create a Notification — a message sent while
// the recipient is actively looking at that same conversation is already
// visible in real time via `receive_message`, so a duplicate entry in the
// Notifications tab would just be noise. If they're online but on a
// different screen (or a different chat), they still get notified.
export const isUserActiveInConversation = (userId, conversationId) => {
  if (!io || !userId || !conversationId) return false;

  const socketId = onlineUsers.get(userId.toString());
  if (!socketId) return false;

  const room = io.sockets.adapter.rooms.get(conversationId.toString());
  return Boolean(room && room.has(socketId));
};

export const emitNotification = (recipientId, notification) => {
  if (!io || !recipientId) return;
  io.to(recipientId.toString()).emit("new_notification", notification);

  // Fire the native push alongside the socket event — deliberately not
  // awaited. This function is called synchronously from ~12 controller
  // call sites right before they respond to the request that triggered
  // the notification (a like/comment/follow/etc); a push send (DB lookup
  // + Firebase API call) must never add latency to that response, and a
  // push failure must never surface as an error to that unrelated action.
  // See push.service.js for the full explanation and error handling.
  sendPushToUser(recipientId, notification).catch(() => {});
};

export const emitMessage = (conversationId, message) => {
  if (!io || !conversationId) return;
  io.to(conversationId.toString()).emit("receive_message", message);
};

export const emitMessageSeen = (conversationId, userId) => {
  if (!io || !conversationId || !userId) return;

  io.to(conversationId.toString()).emit("message_seen_update", {
    conversationId: conversationId.toString(),
    userId: userId.toString(),
  });
};

export const emitMessagesUnsent = (conversationId, messageIds = []) => {
  if (!io || !conversationId || messageIds.length === 0) return;
  io.to(conversationId.toString()).emit("messages_unsent", {
    conversationId: conversationId.toString(),
    messageIds: messageIds.map(String),
  });
};

// Reactions previously only updated via the REST response for whoever
// tapped the emoji — the other participant never found out until their next
// full refetch of the conversation. This closes that gap so a reaction
// shows up live on both sides, the way it does on Instagram/WhatsApp.
export const emitMessageReacted = (conversationId, message) => {
  if (!io || !conversationId || !message) return;
  io.to(conversationId.toString()).emit("message_reacted", {
    conversationId: conversationId.toString(),
    messageId: message._id?.toString ? message._id.toString() : String(message._id),
    reactions: message.reactions || [],
  });
};

// Broadcasts a full edited message (already re-populated by the caller) so
// the other participant sees the new text and the "edited" label live,
// instead of only finding out on their next full refetch.
export const emitMessageEdited = (conversationId, message) => {
  if (!io || !conversationId || !message) return;
  io.to(conversationId.toString()).emit("message_edited", message);
};
