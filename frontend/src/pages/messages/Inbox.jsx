import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  MessageCircle,
  Ban,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getConversations, unblockConversation } from "../../api/messageApi";
import api from "../../api/axios";
import { socket } from "../../socket/socket";
import { getSessionUser } from "../../utils/sessionUser";
import ImageLoader from "../../components/common/ImageLoader";
import { formatRelativeTime } from "../../utils/relativeTime";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { isEncryptionSupported, decryptFromUser } from "../../utils/encryption";

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

// Delegates to the shared PART-12 formatter (utils/relativeTime.js) — kept
// as a thin named wrapper so every call site in this file stays unchanged.
function formatChatTime(date) {
  return formatRelativeTime(date) || "now";
}

// `decryptedText` overrides the generic "🔒 Message" placeholder with the
// real text once it's been decrypted client-side (see the decryptedPreviews
// effect below) — undefined means "not decrypted (yet or at all)", so the
// generic placeholder from conversation.lastMessage is shown in the
// meantime rather than nothing.
function getUnreadText(conversation, decryptedText) {
  const unreadCount = conversation.unreadCount || 0;
  const fallback = decryptedText || conversation.lastMessage || "";

  if (unreadCount <= 0) {
    return fallback || "No messages yet";
  }

  if (unreadCount === 1) {
    return fallback || "1 new message";
  }

  if (unreadCount >= 5) {
    return "5+ new messages";
  }

  return `${unreadCount} new messages`;
}

function getUnreadBadge(count) {
  if (!count || count <= 0) return "";
  if (count >= 5) return "5+";
  return count;
}

function InboxMessageStatus({ status }) {
  if (status === "seen") {
    return <CheckCheck size={14} className="mr-1 inline text-[var(--imc-indigo-text)]" />;
  }

  if (status === "delivered") {
    return <CheckCheck size={14} className="mr-1 inline text-[var(--imc-text-faint)]" />;
  }

  if (status === "sent") {
    return <Check size={14} className="mr-1 inline text-[var(--imc-text-faint)]" />;
  }

  return null;
}

function Inbox() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const loadStartedRef = useRef(false);
  // conversationId -> decrypted latest-message text. Decryption happens
  // entirely client-side with keys already in this browser (same mechanism
  // as Chat.jsx) — nothing here weakens E2EE, it just means the list can
  // show the real preview instead of a generic "🔒 Message" placeholder for
  // conversations this device is actually able to decrypt.
  const [decryptedPreviews, setDecryptedPreviews] = useState({});

  const currentUserId = getUserId(currentUser);

  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    const load = async () => {
      try {
        let me = getSessionUser();

        if (!me) {
          const meRes = await api.get("/auth/me");
          me = meRes.data.user || meRes.data.data || meRes.data;
        }

        setCurrentUser(me);

        const convRes = await getConversations();
        setConversations(convRes.conversations || []);
      } catch (error) {
        // best-effort — non-critical
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isEncryptionSupported() || !currentUserId) return;

    let cancelled = false;

    // Keyed by the LATEST MESSAGE's id, not the conversation's — a new
    // incoming encrypted message must trigger a fresh decrypt, not keep
    // showing whatever the previous latest message decrypted to.
    const pending = conversations.filter((conversation) => {
      const latest = conversation.latestMessage;
      if (!latest?._id || !latest?.isEncrypted || !latest?.encryptedContent) return false;
      if (decryptedPreviews[latest._id] !== undefined) return false;

      const otherUser = conversation.participants?.find(
        (user) => getUserId(user) !== currentUserId
      );
      return Boolean(otherUser?.publicKey);
    });

    if (pending.length === 0) return;

    Promise.all(
      pending.map(async (conversation) => {
        const otherUser = conversation.participants?.find(
          (user) => getUserId(user) !== currentUserId
        );

        try {
          const text = await decryptFromUser(
            otherUser.publicKey,
            conversation.latestMessage.encryptedContent
          );
          return [conversation.latestMessage._id, text];
        } catch {
          // Encrypted from a different device/session than this one — see
          // encryption.js's documented multi-device trade-off. Recorded as
          // "" (tried, failed) rather than left undefined, so this
          // message isn't retried on every future render — the generic
          // lock placeholder shows instead of a broken-looking row.
          return [conversation.latestMessage._id, ""];
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const updates = Object.fromEntries(results);
      if (Object.keys(updates).length > 0) {
        setDecryptedPreviews((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [conversations, currentUserId, decryptedPreviews]);

  useEffect(() => {
    if (!currentUserId) return;

    socket.connect();
    socket.emit("user_online", currentUserId);

    socket.on("online_users", (users) => {
      setOnlineUsers(users || []);
    });

    socket.on("receive_message", (message) => {
      const senderId = getUserId(message.sender);
      const isFromOtherUser = senderId !== currentUserId;

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id !== message.conversation) return conv;

          const nextUnreadCount = isFromOtherUser
            ? (conv.unreadCount || 0) + 1
            : conv.unreadCount || 0;

          return {
            ...conv,
            latestMessage: message,
            // Real text fills in a moment later via the decryptedPreviews
            // effect above (which reacts to this same conversations state
            // update) — this is just the placeholder shown until then.
            lastMessage: message.isEncrypted
              ? "New message"
              : message.text ||
                (message.attachments?.some((item) => item.type === "audio")
                  ? "Voice message"
                  : "Attachment"),
            lastMessageAt: message.createdAt,
            lastMessageStatus: isFromOtherUser ? "" : message.status || "sent",
            unreadCount: nextUnreadCount,
            unreadBy: isFromOtherUser
              ? [...new Set([...(conv.unreadBy || []), currentUserId])]
              : conv.unreadBy,
          };
        });

        return updated.sort((a, b) => {
          const timeA = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
      });
    });

    socket.on("message_delivered_update", ({ messageId, userId }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.latestMessage?._id !== messageId) return conv;
          if (userId === currentUserId) return conv;

          return {
            ...conv,
            lastMessageStatus:
              conv.lastMessageStatus === "seen" ? "seen" : "delivered",
          };
        })
      );
    });

    socket.on("message_seen_update", ({ userId }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          const latestSenderId = getUserId(conv.latestMessage?.sender);

          if (userId === currentUserId) return conv;
          if (latestSenderId !== currentUserId) return conv;

          return {
            ...conv,
            lastMessageStatus: "seen",
          };
        })
      );
    });

    return () => {
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_delivered_update");
      socket.off("message_seen_update");
    };
  }, [currentUserId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const otherUser = conversation.participants?.find(
        (user) => getUserId(user) !== currentUserId
      );

      const name = getName(otherUser).toLowerCase();
      const role = (otherUser?.headline || "").toLowerCase();
      const query = search.toLowerCase();
      const unreadCount = conversation.unreadCount || 0;

      const matchesSearch =
        name.includes(query) ||
        role.includes(query) ||
        (conversation.lastMessage || "").toLowerCase().includes(query);

      if (activeFilter === "Unread") {
        return matchesSearch && unreadCount > 0;
      }

      if (activeFilter === "Blocked") {
        return matchesSearch && Boolean(conversation.blockedBy?.length);
      }

      return matchesSearch;
    });
  }, [conversations, currentUserId, search, activeFilter]);

  const handleUnblock = async (event, conversationId) => {
    event.stopPropagation();

    try {
      const res = await unblockConversation(conversationId);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === conversationId
            ? res.conversation || { ...conversation, blockedBy: [] }
            : conversation
        )
      );
    } catch (error) {
      // best-effort — non-critical
    }
  };

  return (
    <div className="-mt-[calc(env(safe-area-inset-top,0px)+8px)] min-h-screen bg-[var(--imc-bg)] flex justify-center">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface)]">
        <div
          className="sticky top-0 z-20 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 pb-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[18px] font-black text-[var(--imc-text)]">
              Messages
            </h1>

            <span className="h-10 w-10" />
          </div>

          <div className="mt-4 flex h-11 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-3">
            <Search size={18} className="text-[var(--imc-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>
        </div>

        <main className="px-4 pt-4">
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            {["All", "Unread", "Blocked", "Opportunities", "Network"].map((item) => (
              <button
                key={item}
                onClick={() => setActiveFilter(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black ${
                  activeFilter === item
                    ? "bg-[#4338CA] text-white"
                    : "bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              Loading messages...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[rgba(18,20,28,0.14)] bg-[var(--imc-surface-2)] px-4 py-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--imc-surface)", color: "var(--imc-indigo-text)" }}>
                {activeFilter === "Blocked" ? <Ban size={24} /> : <MessageCircle size={24} />}
              </div>
              <h2 className="mt-4 text-[15px] font-black text-[var(--imc-text)]">
                {activeFilter === "Blocked" ? "No blocked chats" : "No messages yet"}
              </h2>
              <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                {activeFilter === "Blocked"
                  ? "Blocked conversations will show here."
                  : "Start a conversation from someone’s profile."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => {
                const otherUser = conversation.participants?.find(
                  (user) => getUserId(user) !== currentUserId
                );

                const unreadCount = conversation.unreadCount || 0;
                const isUnread = unreadCount > 0;
                const unreadBadge = getUnreadBadge(unreadCount);
                const previewText = getUnreadText(
                  conversation,
                  decryptedPreviews[conversation.latestMessage?._id]
                );
                const isOnline = onlineUsers.includes(getUserId(otherUser));
                const isBlocked = Boolean(conversation.blockedBy?.length);
                const blockedByMe = conversation.blockedBy?.some(
                  (user) => getUserId(user) === currentUserId
                );

                return (
                  <button
                    key={conversation._id}
                    onClick={() =>
                      navigate(`/chat/${conversation._id}`, {
                        state: { conversation },
                      })
                    }
                    className={`flex w-full items-center gap-3 rounded-[24px] border p-3 text-left shadow-sm active:scale-[0.99] ${
                      isBlocked
                        ? "border-[#FEE4E2] bg-[#FFFBFA]"
                        : "border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)]"
                    }`}
                  >
                    <div className="relative">
                      {getAvatarUrl(otherUser) ? (
                        <ImageLoader
                          src={getAvatarUrl(otherUser)}
                          alt={getName(otherUser)}
                          className="h-[52px] w-[52px] rounded-2xl object-cover"
                          wrapperClassName="h-[52px] w-[52px] rounded-2xl"
                          width={96}
                        />
                      ) : (
                        <img
                          src={getGenderAvatarIcon(otherUser)}
                          alt={getName(otherUser)}
                          className="h-[52px] w-[52px] rounded-2xl object-cover"
                        />
                      )}

                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#059669]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h2 className="truncate text-[14px] font-black text-[var(--imc-text)]">
                            {getName(otherUser)}
                          </h2>
                          <p className="truncate text-[10.5px] font-bold text-[var(--imc-text-muted)]">
                            {isBlocked ? "Blocked" : otherUser?.headline || "IMCircle User"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-[10px] font-bold ${
                            isUnread ? "text-[var(--imc-indigo-text)]" : "text-[var(--imc-text-faint)]"
                          }`}
                        >
                          {formatChatTime(conversation.lastMessageAt)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-[12px] ${
                            isUnread
                              ? "font-black text-[var(--imc-text)]"
                              : "font-semibold text-[var(--imc-text-muted)]"
                          }`}
                        >
                          {!isUnread && conversation.lastMessageStatus && (
                            <InboxMessageStatus
                              status={conversation.lastMessageStatus}
                            />
                          )}
                          {isBlocked ? "You blocked this chat" : previewText}
                        </p>

                        {blockedByMe ? (
                          <button
                            type="button"
                            onClick={(event) => handleUnblock(event, conversation._id)}
                            className="shrink-0 rounded-full bg-[#ECFDF3] px-3 py-1 text-[10px] font-black text-[#027A48]"
                          >
                            Unblock
                          </button>
                        ) : isBlocked ? (
                          <span className="shrink-0 rounded-full bg-[#FEF3F2] px-3 py-1 text-[10px] font-black text-[#D92D20]">
                            Blocked
                          </span>
                        ) : isUnread && (
                          <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#4338CA] px-2 text-[10px] font-black text-white">
                            {unreadBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Inbox;
