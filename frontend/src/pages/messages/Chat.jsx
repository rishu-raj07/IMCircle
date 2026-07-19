import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  MoreVertical,
  Send,
  Mic,
  X,
  Check,
  CheckCheck,
  Clock3,
  Trash2,
  Ban,
  Plus,
  Reply,
  Pencil,
  Lock,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getMessages,
  sendMessage,
  markMessagesSeen,
  deleteMessages,
  reactToMessage,
  editMessage,
  deleteConversation,
  blockConversation,
  unblockConversation,
} from "../../api/messageApi";
import api from "../../api/axios";
import { socket } from "../../socket/socket";
import { getSessionUser } from "../../utils/sessionUser";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { trackEvent } from "../../utils/analyticsTracker";
import { setStoredPermissionState } from "../../utils/permissions";
import ImageLoader from "../../components/common/ImageLoader";
import VoiceMessagePlayer from "../../components/common/VoiceMessagePlayer";
import RichText from "../../components/common/RichText";
import LinkPreviewCard from "../../components/common/LinkPreviewCard";
import {
  isEncryptionSupported,
  encryptForRecipient,
  decryptFromUser,
} from "../../utils/encryption";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getUserId(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user?._id || user?.id || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getAvatarUrl(user) {
  const value =
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    user?.photo ||
    user?.picture ||
    "";

  const url =
    typeof value === "string"
      ? value
      : value?.url || value?.secure_url || value?.path || "";

  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function formatTime(date) {
  if (!date) return "";

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// WhatsApp-style "Last seen ..." text for the chat header, shown whenever
// the other person isn't currently online. Falls back to nothing (header
// just shows "Offline") if the timestamp is missing or clearly stale data
// from before lastActiveAt started tracking real disconnects.
function formatLastSeen(date) {
  if (!date) return "";

  const seenAt = new Date(date);
  if (Number.isNaN(seenAt.getTime())) return "";

  const now = new Date();
  const diffMs = now - seenAt;
  if (diffMs < 0) return "";

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Last seen just now";
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;

  const isToday = seenAt.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = seenAt.toDateString() === yesterday.toDateString();

  const time = seenAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Last seen today at ${time}`;
  if (isYesterday) return `Last seen yesterday at ${time}`;

  return `Last seen ${seenAt.toLocaleDateString([], { day: "numeric", month: "short" })}`;
}

function hasUser(arr = [], userId) {
  const targetId = getUserId(userId);

  return arr.some((item) => {
    const itemUserId = getUserId(item?.user || item);
    return itemUserId === targetId;
  });
}

function getMessageStatus(message, currentUserId, otherUserId) {
  if (message.localStatus === "sending") return "sending";
  if (message.localStatus === "failed") return "failed";

  const senderId = getUserId(message.sender);

  if (senderId !== currentUserId) return "";

  if (hasUser(message.seenBy || [], otherUserId)) return "seen";

  if (hasUser(message.deliveredTo || [], otherUserId)) return "delivered";

  return "sent";
}

function isSameSender(messages, index) {
  if (index === 0) return false;

  const current = messages[index];
  const previous = messages[index - 1];

  return getUserId(current?.sender) === getUserId(previous?.sender);
}

function isLastInGroup(messages, index) {
  const current = messages[index];
  const next = messages[index + 1];

  if (!next) return true;

  return getUserId(current?.sender) !== getUserId(next?.sender);
}

function MessageStatus({ status }) {
  if (status === "sending") {
    return (
      <span className="inline-flex items-center gap-1">
        <Clock3 size={11} />
        Sending
      </span>
    );
  }

  if (status === "failed") return <span>Failed</span>;

  if (status === "seen") {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCheck size={12} />
        Seen
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCheck size={12} />
        Delivered
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Check size={12} />
      Sent
    </span>
  );
}

const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "😠", "👍", "💡", "👏"];

// Curated fallback grid shown behind the "+" button — a broad-but-compact
// set of common reactions so tapping any one of them reacts instantly,
// without pulling in a full emoji-picker dependency. The text input below
// the grid (wired to the OS's own emoji keyboard) stays as a secondary way
// to react with something outside this set.
const EMOJI_GRID = [
  "❤️", "😂", "😮", "😢", "😠", "👍", "💡", "👏",
  "🔥", "🎉", "😍", "🙏", "😅", "🤔", "👎", "💯",
  "😎", "🥳", "😭", "🤝", "👀", "✨", "💪", "🙌",
  "😁", "😊", "😘", "🥰", "😜", "🤣", "👋", "🤗",
  "😴", "😇", "💔", "🎯", "🚀", "⭐", "🫡", "😳",
];

function SmallAvatar({ user }) {
  const avatar = getAvatarUrl(user);

  if (avatar) {
    return (
      <ImageLoader
        src={avatar}
        alt={getName(user)}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
        wrapperClassName="h-8 w-8 rounded-full"
        width={96}
      />
    );
  }

  return (
    <img
      src={getGenderAvatarIcon(user)}
      alt={getName(user)}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
    />
  );
}

function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();

  const bottomRef = useRef(null);
  const loadedConversationRef = useRef("");
  const initialScrollDoneRef = useRef("");
  const inputRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const emojiInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messageRefs = useRef({});
  const messageListRef = useRef(null);
  // Mirrors the `showNewMessageBanner` state below but readable
  // synchronously inside the receive_message socket handler (which closes
  // over state from whenever the listener was attached, not necessarily
  // the latest render) — see the comment on the scroll handler.
  const isNearBottomRef = useRef(true);

  // Swipe-to-reply gesture — separate from the existing long-press
  // (react/select) state machine above so the two can coexist on the same
  // pointer sequence without fighting each other (long-press fires on a
  // stationary hold, swipe fires on a deliberate rightward drag; whichever
  // wins first cancels the other).
  const swipeFiredRef = useRef(false);
  const swipeElRef = useRef(null);
  const swipeIconElRef = useRef(null);
  const pendingReplyForVoiceRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [conversation, setConversation] = useState(
    location.state?.conversation || null
  );
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customReaction, setCustomReaction] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChatDeleteConfirm, setShowChatDeleteConfirm] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
  // messageId -> decrypted plaintext, for end-to-end encrypted messages.
  // See utils/encryption.js — decryption happens client-side and is never
  // sent anywhere, so this only ever lives in memory for this render.
  const [decryptedMap, setDecryptedMap] = useState({});

  const currentUserId = getUserId(currentUser);

  const otherUser = useMemo(() => {
    return conversation?.participants?.find(
      (user) => getUserId(user) !== currentUserId
    );
  }, [conversation, currentUserId]);

  const otherUserId = getUserId(otherUser);
  const isOtherOnline = onlineUsers.includes(otherUserId);

  // Lets the socket effect below (which deliberately does NOT list
  // otherUserId as a dependency — see its own comment) always read the
  // CURRENT otherUserId instead of whatever value was in scope when its
  // handlers were first created. Without this, opening a chat any way that
  // doesn't pre-fill `conversation` synchronously (e.g. a deep link, or a
  // page refresh while already in a chat) bakes in `otherUserId === ""`
  // for the whole session, and delivered/seen ticks silently never update.
  const otherUserIdRef = useRef(otherUserId);
  useEffect(() => {
    otherUserIdRef.current = otherUserId;
  }, [otherUserId]);

  // `otherUser.lastActiveAt` is a REST snapshot taken once when this chat
  // loaded — nothing re-fetches it afterward, so without this, "Last seen"
  // keeps showing whatever stale time was true at page-load forever, even
  // after the other person has since come online and gone offline again
  // right in front of you (exactly the "they just messaged me but it still
  // says Last seen 20 minutes ago" bug). The live "online_users" socket
  // event DOES tell us the instant they actually disconnect, so on that
  // exact transition we stamp lastActiveAt to now — accurate to the second,
  // no extra network round trip needed.
  const wasOtherOnlineRef = useRef(false);
  useEffect(() => {
    if (wasOtherOnlineRef.current && !isOtherOnline && otherUserId) {
      setConversation((prev) => {
        if (!prev?.participants) return prev;
        return {
          ...prev,
          participants: prev.participants.map((participant) =>
            getUserId(participant) === otherUserId
              ? { ...participant, lastActiveAt: new Date().toISOString() }
              : participant
          ),
        };
      });
    }
    wasOtherOnlineRef.current = isOtherOnline;
  }, [isOtherOnline, otherUserId]);

  // Self-heal for the "always shows Decrypting…" case: if this chat loaded
  // with no E2EE public key on file for the other participant (so their
  // messages can never be decrypted on this device — see the decrypt
  // effect above), and they then come online, silently re-fetch the
  // conversation once. E2EEKeyInitializer uploads a key pair the instant
  // their app/tab launches, so this catches the common cause — they were
  // simply on an older cached build without the key uploaded yet — without
  // making the user leave and reopen the chat.
  const keyRecoveryAttemptedRef = useRef(false);
  useEffect(() => {
    if (!isOtherOnline || !otherUserId) return;
    if (otherUser?.publicKey) return;
    if (keyRecoveryAttemptedRef.current) return;

    keyRecoveryAttemptedRef.current = true;

    getMessages(conversationId)
      .then((res) => {
        if (res?.conversation) setConversation(res.conversation);
      })
      .catch(() => {
        keyRecoveryAttemptedRef.current = false;
      });
  }, [isOtherOnline, otherUserId, otherUser?.publicKey, conversationId]);

  const isSelecting = selectedMessageIds.length > 0;
  const canUnsendSelected = selectedMessageIds.length > 0 && selectedMessageIds.every((id) => {
    const message = messages.find((item) => item._id === id);
    return getUserId(message?.sender) === currentUserId;
  });
  const blockedByMe = hasUser(conversation?.blockedBy || [], currentUserId);

  useEffect(() => {
    setBlocked(Boolean(conversation?.blockedBy?.length));
  }, [conversation?.blockedBy]);

  // Decrypts any end-to-end encrypted message (and any encrypted quoted
  // reply) that isn't already in decryptedMap. Runs whenever the message
  // list changes — new messages, edits, or a freshly loaded chat. Skips
  // entirely if this device has no shared key to decrypt with yet (e.g. the
  // other person hasn't published a public key), in which case those
  // bubbles just show "Couldn't decrypt this message" via the render below.
  useEffect(() => {
    const pending = [];
    const seen = new Set();

    const collect = (item) => {
      if (!item?.isEncrypted || !item?._id) return;
      if (decryptedMap[item._id] !== undefined) return;
      if (seen.has(item._id)) return;
      seen.add(item._id);
      pending.push(item);
    };

    messages.forEach((message) => {
      collect(message);
      collect(message.replyTo);
    });

    if (pending.length === 0) return;

    // No public key on file for the other participant at all — this isn't
    // a "still loading" state, it's permanent until they open the app
    // again and re-upload one (see E2EEKeyInitializer.jsx), so resolve
    // these straight to the "unavailable" state instead of leaving them
    // stuck on an infinite "Decrypting…" spinner (previously they'd never
    // get an entry in decryptedMap at all, since this effect used to bail
    // out early here without touching the map).
    if (!otherUser?.publicKey) {
      const updates = {};
      pending.forEach((item) => {
        updates[item._id] = "";
      });
      setDecryptedMap((prev) => ({ ...prev, ...updates }));
      return;
    }

    let cancelled = false;

    (async () => {
      const updates = {};

      for (const item of pending) {
        try {
          updates[item._id] = await decryptFromUser(otherUser.publicKey, item.encryptedContent);
        } catch {
          updates[item._id] = "";
        }
      }

      if (!cancelled) setDecryptedMap((prev) => ({ ...prev, ...updates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, otherUser?.publicKey, decryptedMap]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Opening a chat used to visibly animate from the top of the message list
  // down to the latest message (the smooth scrollIntoView in loadChat's
  // finally block, firing after a render). Chats should just open already
  // at the bottom, like Instagram/WhatsApp — this runs synchronously after
  // the DOM commits but before the browser paints, so it jumps straight
  // there with no visible scroll animation. Guarded per-conversationId so
  // it only fires once per chat open, not on every subsequent message.
  useLayoutEffect(() => {
    if (loading) return;
    if (initialScrollDoneRef.current === conversationId) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    initialScrollDoneRef.current = conversationId;
  }, [loading, conversationId, messages]);

  // Tapping a quoted-reply preview jumps to (and briefly highlights) the
  // original message, the same way Instagram/WhatsApp do it.
  const scrollToMessage = (messageId) => {
    if (!messageId) return;
    const el = messageRefs.current[messageId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((prev) => (prev === messageId ? null : prev));
    }, 1200);
  };

  // Tracks whether the user is currently near the bottom of the message
  // list, so a message arriving while they've scrolled up to read older
  // messages doesn't yank them back down — it shows the "New message" pill
  // below instead, same as Instagram/WhatsApp.
  const handleMessageListScroll = (event) => {
    const el = event.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 150;

    isNearBottomRef.current = nearBottom;
    if (nearBottom) setShowNewMessageBanner(false);
  };

  const jumpToLatest = () => {
    setShowNewMessageBanner(false);
    scrollToBottom();
  };

  useEffect(() => {
    if (!conversationId || loadedConversationRef.current === conversationId) {
      return;
    }

    loadedConversationRef.current = conversationId;
    initialScrollDoneRef.current = "";

    const loadChat = async () => {
      try {
        let me = getSessionUser();

        if (!me) {
          const meRes = await api.get("/auth/me");
          me = meRes.data.user || meRes.data.data || meRes.data;
        }

        setCurrentUser(me);

        const msgRes = await getMessages(conversationId);

        setConversation(msgRes.conversation);
        setMessages(msgRes.messages || []);
      } catch (error) {
        // best-effort — non-critical
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [conversationId]);

  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    // Rejoin this conversation's room on every (re)connect, not just once
    // at mount. A reconnect — mobile app backgrounded then foregrounded,
    // a wifi blip, an idle websocket getting dropped by a proxy — gets a
    // brand-new socket.id server-side, which starts in NO rooms at all.
    // The room this tab joined earlier is gone, so `receive_message` (and
    // every other event scoped to this conversation) silently stops
    // arriving here, even though the chat still looks "connected". This
    // was the actual cause of "I don't get live messages, I have to leave
    // the chat and come back" — leaving and reopening just force-remounts
    // this effect, which happens to re-join the room too. Listening for
    // "connect" directly closes that gap instead of relying on a remount.
    const joinRoom = () => {
      socket.emit("user_online", currentUserId);
      socket.emit("join_chat", conversationId);
      socket.emit("get_online_users");
    };

    socket.connect();
    joinRoom();
    socket.on("connect", joinRoom);

    socket.on("online_users", (users) => {
      setOnlineUsers(users || []);
    });

    // Presence was previously "push only" — the very first snapshot came
    // from the get_online_users call in joinRoom() above, and after that
    // this chat only ever heard about a change if a live "online_users"
    // broadcast happened to arrive (fired globally on ANY socket
    // connect/disconnect anywhere in the app, not just this conversation).
    // Any single missed broadcast — a brief network blip, a proxy hiccup —
    // then had nothing to correct it until the next unrelated
    // connect/disconnect happened to fire one, which could be minutes or
    // hours away: exactly the "shows Last seen 3 hours ago while they're
    // actively typing right now" symptom. A cheap on-demand re-request
    // every few seconds while this chat is open makes presence self-heal
    // quickly regardless of what caused it to fall out of sync, the same
    // "don't rely on just one signal" approach already used for the app
    // update banner (see useVersionCheck.js).
    const presenceResyncInterval = setInterval(() => {
      if (socket.connected) socket.emit("get_online_users");
    }, 12000);

    // No connection-state visibility previously existed on this page at
    // all — if the handshake ever failed or dropped, nothing here would
    // ever know, making exactly this class of bug ("messages/typing/
    // presence all silently stop") invisible in logs. Dev-only, mirrors
    // the backend's own `NODE_ENV !== "production"` connect logging.
    const logConnectError = (error) => {
      if (import.meta.env.DEV) {
        console.warn("[chat socket] connect_error:", error?.message || error);
      }
    };
    const logDisconnect = (reason) => {
      if (import.meta.env.DEV) {
        console.warn("[chat socket] disconnected:", reason);
      }
    };
    socket.on("connect_error", logConnectError);
    socket.on("disconnect", logDisconnect);

    socket.on("receive_message", (message) => {
      if (message.conversation !== conversationId) return;

      const incomingSenderId = getUserId(message.sender);
      const isIncomingFromOtherUser = incomingSenderId !== currentUserId;

      setMessages((prev) => {
        const existsById = prev.some((item) => item._id === message._id);
        if (existsById) return prev;

        if (message.clientTempId) {
          const hasTemp = prev.some(
            (item) => item.clientTempId === message.clientTempId
          );

          if (hasTemp) {
            return prev.map((item) =>
              item.clientTempId === message.clientTempId
                ? { ...message, localStatus: "" }
                : item
            );
          }
        }

        return [...prev, message];
      });

      if (isIncomingFromOtherUser) {
        socket.emit("message_delivered", {
          messageId: message._id,
          userId: currentUserId,
          conversationId,
        });

        markMessagesSeen(conversationId);
      }

      // Only auto-scroll if the user is already near the bottom (or it's
      // their own message just landing) — otherwise they're reading older
      // messages, and yanking them down would be jarring. Show the "New
      // message" pill instead so they can jump down on their own terms.
      if (!isIncomingFromOtherUser || isNearBottomRef.current) {
        scrollToBottom();
      } else {
        setShowNewMessageBanner(true);
      }
    });

    socket.on("message_delivered_update", ({ messageId, deliveredTo, userId }) => {
      if (userId !== otherUserIdRef.current) return;

      setMessages((prev) =>
        prev.map((message) => {
          const isMyMessage = getUserId(message.sender) === currentUserId;

          if (!isMyMessage || message._id !== messageId) return message;

          return {
            ...message,
            deliveredTo,
            status: message.status === "seen" ? "seen" : "delivered",
          };
        })
      );
    });

    socket.on(
      "message_seen_update",
      ({ conversationId: seenConversationId, userId }) => {
        if (seenConversationId !== conversationId) return;
        if (userId !== otherUserIdRef.current) return;

        setMessages((prev) =>
          prev.map((message) => {
            const isMyMessage = getUserId(message.sender) === currentUserId;
            if (!isMyMessage) return message;

            const alreadySeen = hasUser(message.seenBy || [], userId);

            return {
              ...message,
              status: "seen",
              seenBy: alreadySeen
                ? message.seenBy
                : [
                    ...(message.seenBy || []),
                    {
                      user: userId,
                      seenAt: new Date().toISOString(),
                    },
                  ],
            };
          })
        );
      }
    );

    socket.on("messages_unsent", ({ conversationId: targetConversationId, messageIds = [] }) => {
      if (targetConversationId !== conversationId) return;
      setMessages((prev) => prev.filter((message) => !messageIds.includes(message._id)));
      setSelectedMessageIds((prev) => prev.filter((id) => !messageIds.includes(id)));
      setReactionTarget((prev) => (messageIds.includes(prev?._id) ? null : prev));
    });

    // Reactions used to only update locally for whoever tapped the emoji —
    // the other participant never saw it live. This makes a reaction show
    // up instantly on both sides, closing that gap.
    socket.on("message_reacted", ({ conversationId: targetConversationId, messageId, reactions }) => {
      if (targetConversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? { ...message, reactions } : message
        )
      );
    });

    socket.on("message_edited", (edited) => {
      if (edited.conversation !== conversationId) return;
      setMessages((prev) =>
        prev.map((message) => (message._id === edited._id ? { ...message, ...edited } : message))
      );
    });

    socket.on("user_typing", (sender) => {
      if (getUserId(sender) !== currentUserId) {
        setTypingUser(sender);
      }
    });

    socket.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    return () => {
      clearInterval(presenceResyncInterval);
      socket.emit("leave_chat", conversationId);
      socket.off("connect", joinRoom);
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_delivered_update");
      socket.off("message_seen_update");
      socket.off("messages_unsent");
      socket.off("message_reacted");
      socket.off("message_edited");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("connect_error", logConnectError);
      socket.off("disconnect", logDisconnect);
    };
    // `otherUserId` is deliberately NOT a dependency here, even though it's
    // used inside this effect (the `join_chat` room only cares about
    // conversationId, not who the other participant is). `conversation` —
    // and therefore `otherUserId`, which is derived from it via useMemo —
    // starts null and only gets set once loadChat()'s async fetch resolves,
    // so otherUserId reliably changes from undefined to a real id a moment
    // after mount. With it in this array, that change tore down and
    // rebuilt the "online_users" listener right after mount — and the
    // server only re-broadcasts that event on the NEXT socket
    // connect/disconnect anywhere in the app, not on demand, so if nothing
    // else happened to connect/disconnect during the visit, the freshly
    // rebuilt listener could sit waiting indefinitely and this chat would
    // show "Offline" for someone who was actually online the whole time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, conversationId]);

  const handleTyping = (value) => {
    setText(value);

    if (!conversationId || !currentUser) return;

    socket.emit("typing", {
      conversationId,
      sender: currentUser,
      // Lets the server also deliver this straight to the other person's
      // own room (joined the instant their socket connects), instead of
      // relying solely on the conversation room — which only has members
      // once their `join_chat` async DB lookup has actually finished. See
      // the socket effect above for the same race affecting live messages.
      recipientId: otherUserId,
    });

    clearTimeout(window.__typingTimer);

    window.__typingTimer = setTimeout(() => {
      socket.emit("stop_typing", { conversationId, recipientId: otherUserId });
    }, 900);
  };

  const handleStartEdit = (message) => {
    if (!message || String(message._id).startsWith("temp-")) return;
    setEditingMessage(message);
    setReplyTarget(null);
    setText(message.isEncrypted ? decryptedMap[message._id] || "" : message.text || "");
    setReactionTarget(null);
    setShowEmojiPicker(false);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  // E2EE for new outgoing messages is turned off (by product decision —
  // encrypted messages depended on both devices having a matching key on
  // file, and any mismatch/reset/never-uploaded-key permanently showed as
  // undecryptable, which was worse than just sending plain text like a
  // normal chat). This always returns null now so every send/edit below
  // goes down the plain `text` path and shows instantly on the other
  // side — no waiting on keys, no "Not available on this device".
  //
  // The decrypt side (utils/encryption.js, the decrypt effect above, and
  // Inbox.jsx's preview decryption) is intentionally left in place so
  // messages that were already encrypted under the old flow keep working
  // exactly as before — this only stops NEW messages from being encrypted.
  const tryEncrypt = async () => null;

  const handleSaveEdit = async () => {
    const cleanText = text.trim();
    if (!cleanText || !editingMessage || savingEdit) return;

    setSavingEdit(true);

    try {
      const encryptedContent = await tryEncrypt(cleanText);
      const payload = encryptedContent
        ? { isEncrypted: true, encryptedContent }
        : { text: cleanText };

      const res = await editMessage(editingMessage._id, payload);

      if (encryptedContent) {
        setDecryptedMap((prev) => ({ ...prev, [editingMessage._id]: cleanText }));
      }

      setMessages((prev) =>
        prev.map((message) =>
          message._id === editingMessage._id ? { ...message, ...res.message } : message
        )
      );
      setEditingMessage(null);
      setText("");
    } catch (error) {
      alert(error?.response?.data?.message || "Couldn't save your edit. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSend = async () => {
    if (editingMessage) {
      await handleSaveEdit();
      return;
    }

    const cleanText = text.trim();

    if (!cleanText || !conversationId || !currentUserId || blocked) return;

    const clientTempId = `temp-${Date.now()}-${Math.random()}`;
    const replySnapshot = replyTarget;

    const tempMessage = {
      _id: clientTempId,
      clientTempId,
      conversation: conversationId,
      sender: currentUser,
      text: cleanText,
      attachments: [],
      seenBy: [],
      deliveredTo: [],
      createdAt: new Date().toISOString(),
      localStatus: "sending",
      status: "sending",
      replyTo: replySnapshot || null,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setText("");
    setReplyTarget(null);
    scrollToBottom();

    try {
      // The temp bubble above already shows `cleanText` directly (not
      // marked isEncrypted), so there's no visible flash either way here —
      // this only decides what actually goes over the wire.
      const encryptedContent = await tryEncrypt(cleanText);

      const res = await sendMessage(conversationId, {
        ...(encryptedContent
          ? { isEncrypted: true, encryptedContent, text: "" }
          : { text: cleanText }),
        attachments: [],
        clientTempId,
        replyTo: replySnapshot?._id,
      });

      if (encryptedContent && res.message?._id) {
        setDecryptedMap((prev) => ({ ...prev, [res.message._id]: cleanText }));
      }

      trackEvent("message", {
        entityType: "conversation",
        entityId: conversationId,
        metadata: { hasAttachment: false },
      }).catch(() => {});

      const savedMessage = res.message;

      setMessages((prev) =>
        prev.map((message) =>
          message.clientTempId === clientTempId
            ? { ...savedMessage, localStatus: "" }
            : message
        )
      );

      socket.emit("stop_typing", { conversationId, recipientId: otherUserId });
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.clientTempId === clientTempId
            ? {
                ...message,
                localStatus: "failed",
                status: "failed",
              }
            : message
        )
      );
    }
  };

  const toggleMessageSelection = (messageId) => {
    if (!messageId) return;

    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleMessagePress = (message) => {
    const messageId = message?._id;
    if (!messageId || String(messageId).startsWith("temp-")) return;

    toggleMessageSelection(messageId);
    setReactionTarget(message);
    setShowEmojiPicker(false);
    navigator.vibrate?.(18);
  };

  const resetSwipeVisual = () => {
    if (swipeElRef.current) swipeElRef.current.style.transform = "";
    if (swipeIconElRef.current) swipeIconElRef.current.style.opacity = "0";
  };

  const beginMessagePress = (event, message) => {
    longPressFiredRef.current = false;
    swipeFiredRef.current = false;
    swipeElRef.current = event.currentTarget;
    swipeIconElRef.current =
      event.currentTarget.parentElement?.querySelector('[data-reply-icon="true"]') || null;
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      handleMessagePress(message);
    }, 360);
  };

  // Swipe right to reply — mirrors CircleCommunity.jsx's PostBubble gesture
  // (same threshold, same disambiguation approach) so this feels like the
  // same feature elsewhere in the app. Disabled during multi-select and on
  // still-sending messages (no saved id to reply to yet).
  const moveMessagePress = (event, message) => {
    const dx = event.clientX - pressStartRef.current.x;
    const dy = event.clientY - pressStartRef.current.y;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimerRef.current);
    }

    if (
      longPressFiredRef.current ||
      swipeFiredRef.current ||
      isSelecting ||
      String(message._id).startsWith("temp-")
    ) {
      return;
    }

    if (dx > 0 && Math.abs(dy) < 40) {
      const translate = Math.min(dx, 80);
      if (swipeElRef.current) {
        swipeElRef.current.style.transform = `translateX(${translate}px)`;
      }
      if (swipeIconElRef.current) {
        swipeIconElRef.current.style.opacity = String(Math.min(translate / 55, 1));
      }

      if (dx > 55) {
        swipeFiredRef.current = true;
        navigator.vibrate?.(12);
        setReplyTarget(message);
        window.setTimeout(resetSwipeVisual, 120);
      }
    } else {
      resetSwipeVisual();
    }
  };

  const endMessagePress = () => {
    clearTimeout(longPressTimerRef.current);
    resetSwipeVisual();
    swipeElRef.current = null;
    swipeIconElRef.current = null;
  };

  const handleReact = async (reaction) => {
    const messageId = reactionTarget?._id;
    if (!messageId) return;

    setMessages((prev) =>
      prev.map((message) =>
        message._id === messageId
          ? {
              ...message,
              reactions: [
                ...(message.reactions || []).filter(
                  (item) => getUserId(item.user) !== currentUserId
                ),
                { user: currentUserId, reaction },
              ],
            }
          : message
      )
    );
    setReactionTarget(null);
    setShowEmojiPicker(false);
    setCustomReaction("");

    try {
      await reactToMessage(messageId, reaction);
    } catch (error) {
      // best-effort — non-critical
    }
  };

  const handleDeleteSelected = async () => {
    const ids = selectedMessageIds.filter(Boolean);
    if (ids.length === 0) return;

    try {
      await deleteMessages(ids, canUnsendSelected ? "everyone" : "me");
      setMessages((prev) => prev.filter((message) => !ids.includes(message._id)));
      setSelectedMessageIds([]);
      setShowDeleteConfirm(false);
      setReactionTarget(null);
    } catch (error) {
      setShowDeleteConfirm(false);
      alert(error?.response?.data?.message || "Could not unsend these messages.");
    }
  };

  const handleDeleteChat = async () => {
    setShowChatDeleteConfirm(false);
    setMessages([]);
    setSelectedMessageIds([]);
    setReactionTarget(null);

    try {
      await deleteConversation(conversationId);
      navigate("/messages", { replace: true });
    } catch (error) {
      // best-effort — non-critical
    }
  };

  const handleBlockChat = async () => {
    setShowMenu(false);

    try {
      const res = await blockConversation(conversationId);
      setBlocked(true);
      setConversation(res.conversation || conversation);
    } catch (error) {
      // best-effort — non-critical
    }
  };

  const handleUnblockChat = async () => {
    setShowMenu(false);

    try {
      const res = await unblockConversation(conversationId);
      setBlocked(false);
      setConversation(res.conversation || conversation);
    } catch (error) {
      // best-effort — non-critical
    }
  };

  const sendVoiceMessage = async (file) => {
    if (!file || !conversationId || !currentUserId || blocked) return;

    setSendingVoice(true);
    const replySnapshot = pendingReplyForVoiceRef.current;
    pendingReplyForVoiceRef.current = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/upload/audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const attachment = uploadRes.data?.file;
      if (!attachment?.url) return;

      const clientTempId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessage = {
        _id: clientTempId,
        clientTempId,
        conversation: conversationId,
        sender: currentUser,
        text: "",
        attachments: [attachment],
        seenBy: [],
        deliveredTo: [],
        createdAt: new Date().toISOString(),
        localStatus: "sending",
        status: "sending",
        replyTo: replySnapshot || null,
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      const res = await sendMessage(conversationId, {
        text: "",
        attachments: [attachment],
        clientTempId,
        replyTo: replySnapshot?._id,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.clientTempId === clientTempId
            ? { ...res.message, localStatus: "" }
            : message
        )
      );
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setSendingVoice(false);
    }
  };

  const toggleRecording = async () => {
    if (blocked || sendingVoice) return;

    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    // Always attempt getUserMedia live instead of gating on a cached
    // "denied" flag — the previous version skipped straight to the "enable
    // it in settings" alert whenever permissions.js's stored state said
    // "denied", even after the user had since granted the OS-level
    // permission. On Android WebView, the live navigator.permissions.query
    // read for 'microphone' is unreliable (unsupported/stale on some
    // WebView versions), so trusting it — or a local cache that can only
    // get more stale over time — over just trying the real API is what
    // caused "still shows the error even after granting permission". A
    // real getUserMedia() call is cheap and is the only source of truth
    // that can't be wrong.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStoredPermissionState("microphone", "granted");
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type,
        });

        sendVoiceMessage(file);
      };

      pendingReplyForVoiceRef.current = replyTarget;
      setReplyTarget(null);

      recorder.start();
      setRecording(true);
    } catch (error) {
      setStoredPermissionState("microphone", "denied");
      alert(
        "Microphone permission is needed to record voice notes. If you already enabled it in your device Settings, fully close and reopen IMCircle — Android WebView sometimes needs a fresh app launch to pick up a newly granted permission."
      );
    }
  };
    return (
    // `fixed inset-0` (viewport-locked) instead of `min-h-screen` +
    // `h-[100dvh]` in normal document flow — a fixed-height chat app-shell
    // like this one needs to be exactly the real viewport height, and
    // `position: fixed` elements are the one thing that's completely
    // unaffected by the global safe-area padding on `body` (see index.css).
    // Being in normal flow instead meant `body`'s padding-top pushed this
    // 100dvh-tall block down without shrinking it, so it overflowed past
    // the real viewport by that many pixels and the whole "fixed" chat
    // screen became scrollable instead of just the message list — visible
    // as the header sliding up/down while scrolling a conversation.
    <div className="fixed inset-0 flex justify-center bg-[var(--imc-bg)]">
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[var(--imc-bg)]">
        <div
          className="relative z-10 shrink-0 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 pb-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          {isSelecting ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedMessageIds([]);
                  setReactionTarget(null);
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-transparent text-[var(--imc-text)] active:bg-[var(--imc-surface-2)]"
              >
                <X size={20} />
              </button>

              <p className="text-[14px] font-black text-[var(--imc-text)]">
                {selectedMessageIds.length} selected
              </p>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-10 shrink-0 rounded-full px-3 text-[12px] font-black"
                style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }}
              >
                {canUnsendSelected ? "Unsend" : "Delete for me"}
              </button>
            </div>
          ) : (
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)]"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="relative shrink-0">
                {getAvatarUrl(otherUser) ? (
                  <ImageLoader
                    src={getAvatarUrl(otherUser)}
                    alt={getName(otherUser)}
                    className="h-10 w-10 rounded-full object-cover"
                    wrapperClassName="h-10 w-10 rounded-full"
                    width={96}
                  />
                ) : (
                  <img
                    src={getGenderAvatarIcon(otherUser)}
                    alt={getName(otherUser)}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}

                {isOtherOnline && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#059669]" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-black text-[var(--imc-text)]">
                  {getName(otherUser)}
                </h2>
                <p
                  className={`text-[11px] font-semibold ${
                    isOtherOnline ? "text-[#059669]" : "text-[var(--imc-text-faint)]"
                  }`}
                >
                  {typingUser
                    ? "Typing..."
                    : isOtherOnline
                    ? "Online"
                    : formatLastSeen(otherUser?.lastActiveAt) || "Offline"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="grid h-10 w-10 place-items-center rounded-full bg-transparent text-[var(--imc-text-muted)] active:bg-[var(--imc-surface-2)]"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
          )}

          {showMenu && !isSelecting && (
            <div className="absolute right-4 top-[62px] z-40 w-52 overflow-hidden rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-2xl">
              <button
                onClick={blockedByMe ? handleUnblockChat : handleBlockChat}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-black active:bg-[var(--imc-surface-2)] ${
                  blockedByMe ? "text-[#059669]" : "text-[#D92D20]"
                }`}
              >
                <Ban size={16} />
                {blockedByMe ? "Unblock this person" : "Block this person"}
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowChatDeleteConfirm(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-black text-[var(--imc-text)] active:bg-[var(--imc-surface-2)]"
              >
                <Trash2 size={16} />
                Delete chat
              </button>
            </div>
          )}
        </div>

        <div
          ref={messageListRef}
          onScroll={handleMessageListScroll}
          onClick={() => {
            setReactionTarget(null);
            setShowMenu(false);
          }}
          className="flex-1 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-5 py-5 pb-28 dark:bg-[var(--imc-bg)]"
          style={{ willChange: "transform", transform: "translateZ(0)" }}
        >
          {loading ? (
            <div className="py-16 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[55vh] items-center justify-center">
              <div className="w-full rounded-[28px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-5 py-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm" style={{ borderColor: "var(--imc-border)" }}>
                  <Lock size={24} strokeWidth={1.8} />
                </div>
                <h2 className="mt-4 text-[15px] font-black text-[var(--imc-text)]">
                  Your messages are private
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                  Say hi to {getName(otherUser)} to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isSent = getUserId(message.sender) === currentUserId;
                const groupedWithPrevious = isSameSender(messages, index);
                const lastInGroup = isLastInGroup(messages, index);

                const status = getMessageStatus(
                  message,
                  currentUserId,
                  otherUserId
                );

                // Resolved plaintext for THIS render only — decrypted E2EE
                // messages exist in-memory as plaintext the moment they're
                // shown on screen anyway, so linkifying/generating a link
                // preview for that same plaintext leaks nothing new. Only
                // real message content goes through RichText/LinkPreviewCard
                // here, never the "Decrypting…"/"Couldn't decrypt" status
                // placeholders.
                const resolvedText = message.isEncrypted
                  ? decryptedMap[message._id] || ""
                  : message.text || "";

                const senderForAvatar = otherUser;
                const selected = selectedMessageIds.includes(message._id);

                return (
                  <motion.div
                    key={message._id || message.clientTempId}
                    layout="position"
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex items-end gap-2 ${
                      isSent ? "justify-end" : "justify-start"
                    } ${groupedWithPrevious ? "mt-1" : "mt-4"}`}
                  >
                    {!isSent && (
                      <div className="h-8 w-8 shrink-0">
                        {!groupedWithPrevious ? (
                          <SmallAvatar user={senderForAvatar} />
                        ) : null}
                      </div>
                    )}

                    <div
                      className="relative max-w-[74%]"
                      ref={(el) => {
                        if (message._id) messageRefs.current[message._id] = el;
                      }}
                    >
                      <span
                        data-reply-icon="true"
                        className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 opacity-0"
                        style={{ color: "var(--imc-indigo-text)" }}
                      >
                        <Reply size={18} />
                      </span>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (longPressFiredRef.current) {
                            longPressFiredRef.current = false;
                            return;
                          }
                          if (swipeFiredRef.current) {
                            swipeFiredRef.current = false;
                            return;
                          }
                          if (isSelecting) toggleMessageSelection(message._id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMessagePress(message);
                        }}
                        onPointerDown={(event) => beginMessagePress(event, message)}
                        onPointerMove={(event) => moveMessagePress(event, message)}
                        onPointerUp={endMessagePress}
                        onPointerCancel={endMessagePress}
                        onPointerLeave={endMessagePress}
                        className={`relative px-4 py-2.5 ${
                          isSent
                            ? `bg-[#4338CA] text-white shadow-[0_8px_20px_rgba(67,56,202,0.18)] ${
                                groupedWithPrevious && lastInGroup
                                  ? "rounded-[20px] rounded-br-md"
                                  : groupedWithPrevious
                                  ? "rounded-[20px] rounded-r-md"
                                  : "rounded-[20px] rounded-tr-md"
                              }`
                            : `border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)] shadow-[0_6px_18px_rgba(15,23,42,0.05)] ${
                                groupedWithPrevious && lastInGroup
                                  ? "rounded-[20px] rounded-bl-md"
                                  : groupedWithPrevious
                                  ? "rounded-[20px] rounded-l-md"
                                  : "rounded-[20px] rounded-tl-md"
                              }`
                        } ${
                          selected || highlightedMessageId === message._id
                            ? "ring-2 ring-[var(--imc-indigo-text)] ring-offset-2 ring-offset-[#F8FAFC] dark:ring-offset-[var(--imc-bg)] scale-[0.98]"
                            : ""
                        } transition-[transform,box-shadow] duration-150 touch-pan-y select-none`}
                      >
                        {message.replyTo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(getUserId(message.replyTo));
                            }}
                            className={`mb-1.5 block w-full max-w-[220px] truncate rounded-[10px] border-l-[3px] px-2 py-1.5 text-left ${
                              isSent
                                ? "border-white/60 bg-white/10"
                                : "border-[var(--imc-indigo-text)] bg-[var(--imc-surface-2)]"
                            }`}
                          >
                            <p
                              className={`truncate text-[10.5px] font-black ${
                                isSent ? "text-white" : "text-[var(--imc-indigo-text)]"
                              }`}
                            >
                              {message.replyTo.isDeleted
                                ? "Original message"
                                : getUserId(message.replyTo.sender) === currentUserId
                                ? "You"
                                : getName(message.replyTo.sender)}
                            </p>
                            <p
                              className={`truncate text-[11.5px] font-semibold ${
                                isSent ? "text-violet-100/90" : "text-[var(--imc-text-muted)]"
                              }`}
                            >
                              {message.replyTo.isDeleted
                                ? "This message was deleted"
                                : message.replyTo.isEncrypted
                                ? decryptedMap[message.replyTo._id] === ""
                                  ? "Not available on this device"
                                  : decryptedMap[message.replyTo._id] || "Decrypting…"
                                : message.replyTo.text ||
                                  (message.replyTo.attachments?.length
                                    ? "🎤 Voice message"
                                    : "")}
                            </p>
                          </button>
                        )}

                        {message.isEncrypted ? (
                          decryptedMap[message._id] === "" ? (
                            // Not a broken/error state to the reader — this
                            // happens when the message was encrypted from a
                            // different device/session than the one
                            // viewing it right now (no multi-device key
                            // sync in this version, by design). Styled as a
                            // quiet, expected notice rather than a bold
                            // error string.
                            <p
                              className="flex items-center gap-1.5 text-[12.5px] italic"
                              style={{ color: isSent ? "rgba(255,255,255,0.75)" : "var(--imc-text-muted)" }}
                            >
                              <Lock size={12} className="shrink-0" strokeWidth={2} />
                              Not available on this device
                            </p>
                          ) : decryptedMap[message._id] ? (
                            <p className="whitespace-pre-wrap text-[13px] leading-6">
                              <RichText text={resolvedText} />
                            </p>
                          ) : (
                            <p
                              className="flex items-center gap-1.5 text-[12.5px] italic"
                              style={{ color: isSent ? "rgba(255,255,255,0.75)" : "var(--imc-text-muted)" }}
                            >
                              <Lock size={12} className="shrink-0 animate-pulse" strokeWidth={2} />
                              Decrypting…
                            </p>
                          )
                        ) : (
                          message.text && (
                            <p className="whitespace-pre-wrap text-[13px] leading-6">
                              <RichText text={resolvedText} />
                            </p>
                          )
                        )}

                        <LinkPreviewCard text={resolvedText} />

                        {message.attachments
                          ?.filter((item) => item.type === "audio" && item.url)
                          .map((item, audioIndex) => (
                            <VoiceMessagePlayer
                              key={`${item.url}-${audioIndex}`}
                              url={item.url}
                              seedKey={message._id || item.url}
                              isSent={isSent}
                              avatarUrl={
                                getAvatarUrl(isSent ? currentUser : otherUser) ||
                                getGenderAvatarIcon(isSent ? currentUser : otherUser)
                              }
                            />
                          ))}

                        <p
                          className={`mt-1.5 flex items-center justify-end gap-1 text-[9.5px] font-bold ${
                            isSent ? "text-violet-100/90" : "text-[var(--imc-text-faint)]"
                          }`}
                        >
                          {message.isEdited && (
                            <>
                              <span>edited</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatTime(message.editedAt || message.createdAt)}</span>

                          {isSent && (
                            <>
                              <span>·</span>
                              <MessageStatus status={status} />
                            </>
                          )}
                        </p>

                        <AnimatePresence>
                          {message.reactions?.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.4 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.4 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="absolute -bottom-3 right-2 rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-1.5 py-0.5 text-[12px] shadow-sm"
                            >
                              {message.reactions.slice(-2).map((item, reactionIndex) => (
                                <span key={`${item.reaction}-${reactionIndex}`}>
                                  {item.reaction}
                                </span>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showNewMessageBanner && (
            <motion.button
              type="button"
              key="new-message-banner"
              onClick={jumpToLatest}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-[100px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black text-white shadow-xl"
              style={{ background: "#4338CA" }}
            >
              <ArrowDown size={14} />
              New message
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reactionTarget && (
            <motion.div
              key="reaction-bar"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.85, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="no-scrollbar absolute left-1/2 top-[88px] z-40 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-2 py-1.5 shadow-2xl"
            >
              {MESSAGE_REACTIONS.map((reaction) => (
                <motion.button
                  key={reaction}
                  onClick={() => handleReact(reaction)}
                  whileTap={{ scale: 0.8 }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px]"
                >
                  {reaction}
                </motion.button>
              ))}
              {getUserId(reactionTarget.sender) === currentUserId &&
                (reactionTarget.text || reactionTarget.isEncrypted) &&
                !reactionTarget.attachments?.length && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.8 }}
                    onClick={() => {
                      handleStartEdit(reactionTarget);
                      setReactionTarget(null);
                    }}
                    aria-label="Edit message"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--imc-text-muted)]"
                  >
                    <Pencil size={17} />
                  </motion.button>
                )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={() => setShowEmojiPicker(true)}
                aria-label="More reactions"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[var(--imc-indigo-text)]"
                style={{ background: "var(--imc-action-soft)", borderColor: "var(--imc-action-border)" }}
              >
                <Plus size={17} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reactionTarget && showEmojiPicker && (
            <motion.div
              key="emoji-picker"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 top-[146px] z-50 w-[300px] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[18px] border p-3 shadow-2xl"
              style={{ background: "var(--imc-surface)", borderColor: "var(--imc-border)" }}
            >
              {/* Tap any icon to react instantly — this is the "keyboard icon
                  list" itself, not a preview. The text field below is only a
                  fallback for reacting with something outside this set. */}
              <div className="grid max-h-[176px] grid-cols-8 gap-0.5 overflow-y-auto">
                {EMOJI_GRID.map((emoji, index) => (
                  <motion.button
                    key={`${emoji}-${index}`}
                    type="button"
                    whileTap={{ scale: 0.8 }}
                    onClick={() => handleReact(emoji)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[18px]"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <div className="mt-2 flex gap-2 border-t pt-2" style={{ borderColor: "var(--imc-border)" }}>
                <input
                  ref={emojiInputRef}
                  value={customReaction}
                  onChange={(event) => {
                    const next = event.target.value.slice(0, 16);
                    setCustomReaction(next);
                    // The OS emoji keyboard inserts the character the
                    // instant it's tapped — react immediately on that
                    // input, same as tapping a grid icon above, instead of
                    // waiting for a separate confirm tap.
                    if (next.trim()) handleReact(next.trim());
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && customReaction.trim()) handleReact(customReaction.trim());
                  }}
                  inputMode="text"
                  enterKeyHint="done"
                  maxLength={16}
                  placeholder="Or type any emoji…"
                  className="h-10 min-w-0 flex-1 rounded-[14px] border bg-[var(--imc-surface-2)] px-3 text-center text-[18px] outline-none"
                  style={{ borderColor: "var(--imc-border)", color: "var(--imc-text)" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDeleteConfirm && (
            <ConfirmSheet
              key="delete-selected"
              title={canUnsendSelected ? "Unsend selected messages?" : "Delete selected messages for you?"}
              message={canUnsendSelected ? "These messages will be removed for everyone in this conversation." : "These messages will disappear only from your chat."}
              actionLabel={canUnsendSelected ? "Unsend" : "Delete for me"}
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={handleDeleteSelected}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChatDeleteConfirm && (
            <ConfirmSheet
              key="delete-chat"
              title="Delete this chat?"
              message="This chat will be removed from your messages list."
              actionLabel="Delete chat"
              onCancel={() => setShowChatDeleteConfirm(false)}
              onConfirm={handleDeleteChat}
            />
          )}
        </AnimatePresence>

        <div className="shrink-0 border-t border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.05)]">
          {blocked && (
            <div className="mb-3 rounded-2xl bg-[#FEF3F2] px-3 py-2 text-center text-[12px] font-black text-[#D92D20]">
              This chat is blocked. Messages cannot be sent.
            </div>
          )}

          <AnimatePresence initial={false}>
            {editingMessage && (
              <motion.div
                key="editing-bar"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 overflow-hidden rounded-[16px] px-3 py-2"
                style={{ background: "var(--imc-surface-2)" }}
              >
                <Pencil size={16} style={{ color: "var(--imc-indigo-text)" }} className="shrink-0" />

                <p className="min-w-0 flex-1 truncate text-[11px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                  Editing message
                </p>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--imc-text-muted)] active:bg-[var(--imc-surface)]"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {replyTarget && (
              <motion.div
                key="reply-bar"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 overflow-hidden rounded-[16px] px-3 py-2"
                style={{ background: "var(--imc-surface-2)" }}
              >
                <Reply size={16} style={{ color: "var(--imc-indigo-text)" }} className="shrink-0" />

                <button
                  type="button"
                  onClick={() => scrollToMessage(getUserId(replyTarget))}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[11px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                    Replying to{" "}
                    {getUserId(replyTarget.sender) === currentUserId
                      ? "yourself"
                      : getName(replyTarget.sender)}
                  </p>
                  <p className="truncate text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    {replyTarget.isEncrypted
                      ? decryptedMap[replyTarget._id] === ""
                        ? "Not available on this device"
                        : decryptedMap[replyTarget._id] || "Decrypting…"
                      : replyTarget.text ||
                        (replyTarget.attachments?.length ? "🎤 Voice message" : "")}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--imc-text-muted)] active:bg-[var(--imc-surface)]"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {recording && (
              <motion.div
                key="recording-bar"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center gap-2 overflow-hidden text-[11px] font-black text-[#D92D20]"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#D92D20]" />
                Recording voice message
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 rounded-[24px] bg-[var(--imc-surface-2)] p-1.5">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleTyping(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              type="text"
              maxLength={2000}
              disabled={blocked}
              placeholder={blocked ? "Blocked" : editingMessage ? "Edit message..." : "Type a message..."}
              className="h-11 flex-1 rounded-[18px] bg-transparent px-3 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />

            {!editingMessage && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={blocked || sendingVoice}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] active:scale-95 disabled:opacity-40 ${
                  recording
                    ? "bg-[#D92D20] text-white"
                    : "bg-[var(--imc-surface)] text-[var(--imc-text-muted)] shadow-sm"
                }`}
              >
                <Mic size={20} />
              </button>
            )}

            <button
              // Tapping this button steals focus from the text input by
              // default, which dismisses the on-screen keyboard right after
              // every send — you'd have to tap the input again to keep
              // typing. Blocking the mousedown's default focus behavior
              // keeps focus (and the keyboard) on the input the whole time.
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSend}
              disabled={!text.trim() || blocked || savingEdit}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-white shadow-lg active:scale-95 ${
                text.trim() && !blocked
                  ? "bg-[#4338CA]"
                  : "cursor-not-allowed bg-[rgba(18,20,28,0.14)]"
              }`}
            >
              {editingMessage ? <Check size={18} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ConfirmSheet({ title, message, actionLabel, onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-50 flex items-end bg-black/30 px-4 pb-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full rounded-[26px] bg-[var(--imc-surface)] p-4 shadow-2xl"
      >
        <h3 className="text-[16px] font-black text-[var(--imc-text)]">
          {title}
        </h3>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          {message}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-text)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-2xl bg-[#D92D20] text-[13px] font-black text-white"
          >
            {actionLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Chat;
