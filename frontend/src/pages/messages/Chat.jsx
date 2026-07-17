import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
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
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getMessages,
  sendMessage,
  markMessagesSeen,
  deleteMessages,
  reactToMessage,
  deleteConversation,
  blockConversation,
  unblockConversation,
} from "../../api/messageApi";
import api from "../../api/axios";
import { socket } from "../../socket/socket";
import { getSessionUser } from "../../utils/sessionUser";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { trackEvent } from "../../utils/analyticsTracker";
import {
  setStoredPermissionState,
  shouldAttemptPermission,
} from "../../utils/permissions";
import ImageLoader from "../../components/common/ImageLoader";

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

const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "👍"];

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
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const emojiInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  const currentUserId = getUserId(currentUser);

  const otherUser = useMemo(() => {
    return conversation?.participants?.find(
      (user) => getUserId(user) !== currentUserId
    );
  }, [conversation, currentUserId]);

  const otherUserId = getUserId(otherUser);
  const isOtherOnline = onlineUsers.includes(otherUserId);
  const isSelecting = selectedMessageIds.length > 0;
  const canUnsendSelected = selectedMessageIds.length > 0 && selectedMessageIds.every((id) => {
    const message = messages.find((item) => item._id === id);
    return getUserId(message?.sender) === currentUserId;
  });
  const blockedByMe = hasUser(conversation?.blockedBy || [], currentUserId);

  useEffect(() => {
    setBlocked(Boolean(conversation?.blockedBy?.length));
  }, [conversation?.blockedBy]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    if (!conversationId || loadedConversationRef.current === conversationId) {
      return;
    }

    loadedConversationRef.current = conversationId;

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
        scrollToBottom();
      }
    };

    loadChat();
  }, [conversationId]);

  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    socket.connect();
    socket.emit("user_online", currentUserId);
    socket.emit("join_chat", conversationId);

    socket.on("online_users", (users) => {
      setOnlineUsers(users || []);
    });

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

      scrollToBottom();
    });

    socket.on("message_delivered_update", ({ messageId, deliveredTo, userId }) => {
      if (userId !== otherUserId) return;

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
        if (userId !== otherUserId) return;

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

    socket.on("user_typing", (sender) => {
      if (getUserId(sender) !== currentUserId) {
        setTypingUser(sender);
      }
    });

    socket.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    return () => {
      socket.emit("leave_chat", conversationId);
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_delivered_update");
      socket.off("message_seen_update");
      socket.off("messages_unsent");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [currentUserId, conversationId, otherUserId]);

  const handleTyping = (value) => {
    setText(value);

    if (!conversationId || !currentUser) return;

    socket.emit("typing", {
      conversationId,
      sender: currentUser,
    });

    clearTimeout(window.__typingTimer);

    window.__typingTimer = setTimeout(() => {
      socket.emit("stop_typing", conversationId);
    }, 900);
  };

  const handleSend = async () => {
    const cleanText = text.trim();

    if (!cleanText || !conversationId || !currentUserId || blocked) return;

    const clientTempId = `temp-${Date.now()}-${Math.random()}`;

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
    };

    setMessages((prev) => [...prev, tempMessage]);
    setText("");
    scrollToBottom();

    try {
      const res = await sendMessage(conversationId, {
        text: cleanText,
        attachments: [],
        clientTempId,
      });

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

      socket.emit("stop_typing", conversationId);
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

  const beginMessagePress = (event, message) => {
    longPressFiredRef.current = false;
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      handleMessagePress(message);
    }, 360);
  };

  const moveMessagePress = (event) => {
    const dx = Math.abs(event.clientX - pressStartRef.current.x);
    const dy = Math.abs(event.clientY - pressStartRef.current.y);
    if (dx > 10 || dy > 10) clearTimeout(longPressTimerRef.current);
  };

  const endMessagePress = () => clearTimeout(longPressTimerRef.current);

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
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      const res = await sendMessage(conversationId, {
        text: "",
        attachments: [attachment],
        clientTempId,
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

    // Respect an already-known denial instead of calling getUserMedia again
    // on every tap of the mic button — repeatedly calling it after a real
    // denial is what used to surface a fresh permission prompt each time.
    const canAttempt = await shouldAttemptPermission("microphone");

    if (!canAttempt) {
      alert(
        "Microphone access is turned off for IMCircle. Enable it in your device settings to record voice notes."
      );
      return;
    }

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

      recorder.start();
      setRecording(true);
    } catch (error) {
      setStoredPermissionState("microphone", "denied");
      alert("Microphone permission is needed to record voice notes.");
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
          className="relative shrink-0 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 pb-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
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
                    : "Offline"}
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
          onClick={() => {
            setReactionTarget(null);
            setShowMenu(false);
          }}
          className="flex-1 overflow-y-auto bg-[#F8FAFC] px-5 py-5 pb-28 dark:bg-[var(--imc-bg)]"
        >
          {loading ? (
            <div className="py-16 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[55vh] items-center justify-center">
              <div className="w-full rounded-[28px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-5 py-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border bg-[var(--imc-surface)] text-[var(--imc-text-muted)] shadow-sm" style={{ borderColor: "var(--imc-border)" }}>
                  <UserRound size={27} strokeWidth={1.7} />
                </div>
                <h2 className="mt-4 text-[15px] font-black text-[var(--imc-text)]">
                  Fresh chat with {getName(otherUser)}
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                  Old messages are cleared. Send a new message to start again.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message, index) => {
                const isSent = getUserId(message.sender) === currentUserId;
                const groupedWithPrevious = isSameSender(messages, index);
                const lastInGroup = isLastInGroup(messages, index);

                const status = getMessageStatus(
                  message,
                  currentUserId,
                  otherUserId
                );

                const senderForAvatar = otherUser;
                const selected = selectedMessageIds.includes(message._id);

                return (
                  <div
                    key={message._id || message.clientTempId}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (longPressFiredRef.current) {
                          longPressFiredRef.current = false;
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
                      onPointerMove={moveMessagePress}
                      onPointerUp={endMessagePress}
                      onPointerCancel={endMessagePress}
                      onPointerLeave={endMessagePress}
                      className={`relative max-w-[74%] px-4 py-2.5 ${
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
                      } ${selected ? "ring-2 ring-[var(--imc-indigo-text)] ring-offset-2 ring-offset-[#F8FAFC] dark:ring-offset-[var(--imc-bg)] scale-[0.98]" : ""} transition-[transform,box-shadow] duration-150 touch-pan-y select-none`}
                    >
                      {message.text && (
                        <p className="whitespace-pre-wrap text-[13px] leading-6">
                          {message.text}
                        </p>
                      )}

                      {message.attachments
                        ?.filter((item) => item.type === "audio" && item.url)
                        .map((item, audioIndex) => (
                          <VoiceMessage
                            key={`${item.url}-${audioIndex}`}
                            item={item}
                            isSent={isSent}
                          />
                        ))}

                      <p
                        className={`mt-1.5 flex items-center justify-end gap-1 text-[9.5px] font-bold ${
                          isSent ? "text-violet-100/90" : "text-[var(--imc-text-faint)]"
                        }`}
                      >
                        <span>{formatTime(message.createdAt)}</span>

                        {isSent && (
                          <>
                            <span>·</span>
                            <MessageStatus status={status} />
                          </>
                        )}
                      </p>

                      {message.reactions?.length > 0 && (
                        <div className="absolute -bottom-3 right-2 rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-1.5 py-0.5 text-[12px] shadow-sm">
                          {message.reactions.slice(-2).map((item, reactionIndex) => (
                            <span key={`${item.reaction}-${reactionIndex}`}>
                              {item.reaction}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {reactionTarget && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 top-[88px] z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-2 py-1.5 shadow-2xl"
          >
            {MESSAGE_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => handleReact(reaction)}
                className="grid h-10 w-10 place-items-center rounded-full text-[20px] active:scale-90"
              >
                {reaction}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(true);
                window.setTimeout(() => emojiInputRef.current?.focus(), 40);
              }}
              aria-label="Choose another emoji"
              className="grid h-10 w-10 place-items-center rounded-full border text-[var(--imc-indigo-text)] active:scale-90"
              style={{ background: "var(--imc-action-soft)", borderColor: "var(--imc-action-border)" }}
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {reactionTarget && showEmojiPicker && (
          <div className="absolute left-1/2 top-[146px] z-50 w-[300px] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[18px] border p-3 shadow-2xl" style={{ background: "var(--imc-surface)", borderColor: "var(--imc-border)" }}>
            <p className="mb-2 text-[10px] font-bold text-[var(--imc-text-muted)]">Open your emoji keyboard and choose any emoji</p>
            <div className="flex gap-2">
              <input
                ref={emojiInputRef}
                value={customReaction}
                onChange={(event) => setCustomReaction(event.target.value.slice(0, 16))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && customReaction.trim()) handleReact(customReaction.trim());
                }}
                inputMode="text"
                enterKeyHint="done"
                maxLength={16}
                placeholder="😀"
                className="h-11 min-w-0 flex-1 rounded-[14px] border bg-[var(--imc-surface-2)] px-3 text-center text-[22px] outline-none"
                style={{ borderColor: "var(--imc-border)", color: "var(--imc-text)" }}
              />
              <button
                type="button"
                disabled={!customReaction.trim()}
                onClick={() => handleReact(customReaction.trim())}
                className="h-11 rounded-[14px] px-4 text-[11px] font-black disabled:opacity-40"
                style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }}
              >
                React
              </button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <ConfirmSheet
            title={canUnsendSelected ? "Unsend selected messages?" : "Delete selected messages for you?"}
            message={canUnsendSelected ? "These messages will be removed for everyone in this conversation." : "These messages will disappear only from your chat."}
            actionLabel={canUnsendSelected ? "Unsend" : "Delete for me"}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteSelected}
          />
        )}

        {showChatDeleteConfirm && (
          <ConfirmSheet
            title="Delete this chat?"
            message="This chat will be removed from your messages list."
            actionLabel="Delete chat"
            onCancel={() => setShowChatDeleteConfirm(false)}
            onConfirm={handleDeleteChat}
          />
        )}

        <div className="shrink-0 border-t border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.05)]">
          {blocked && (
            <div className="mb-3 rounded-2xl bg-[#FEF3F2] px-3 py-2 text-center text-[12px] font-black text-[#D92D20]">
              This chat is blocked. Messages cannot be sent.
            </div>
          )}

          {recording && (
            <div className="mb-2 flex items-center justify-center gap-2 text-[11px] font-black text-[#D92D20]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#D92D20]" />
              Recording voice message
            </div>
          )}

          <div className="flex items-center gap-2 rounded-[24px] bg-[var(--imc-surface-2)] p-1.5">
            <input
              value={text}
              onChange={(e) => handleTyping(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              type="text"
              maxLength={2000}
              disabled={blocked}
              placeholder={blocked ? "Blocked" : "Type a message..."}
              className="h-11 flex-1 rounded-[18px] bg-transparent px-3 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />

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

            <button
              onClick={handleSend}
              disabled={!text.trim() || blocked}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-white shadow-lg active:scale-95 ${
                text.trim() && !blocked
                  ? "bg-[#4338CA]"
                  : "cursor-not-allowed bg-[rgba(18,20,28,0.14)]"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceMessage({ item, isSent }) {
  return (
    <div
      className={`mt-1.5 flex min-w-[220px] items-center gap-2 rounded-[16px] px-3 py-2 ${
        isSent
          ? "bg-white/15 text-white"
          : "border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isSent
            ? "bg-white/20 text-white"
            : "bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]"
        }`}
      >
        <Mic size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`mb-1 text-[10px] font-black ${
            isSent ? "text-violet-100" : "text-[var(--imc-text-muted)]"
          }`}
        >
          Voice message
        </p>
        <audio
          src={item.url}
          controls
          className="h-7 w-full max-w-[180px] rounded-full"
        />
      </div>
    </div>
  );
}

function ConfirmSheet({ title, message, actionLabel, onCancel, onConfirm }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/30 px-4 pb-4">
      <div className="w-full rounded-[26px] bg-[var(--imc-surface)] p-4 shadow-2xl">
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
      </div>
    </div>
  );
}

export default Chat;
