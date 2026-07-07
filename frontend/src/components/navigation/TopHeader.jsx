import { useEffect, useState } from "react";
import { Bell, MessageSquare, Menu, Flame } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SideDrawer from "./SideDrawer";
import { getConversations } from "../../api/messageApi";
import { getMyBuilderScore } from "../../api/builderScoreApi";
import { socket } from "../../socket/socket";
import { getSessionUser } from "../../utils/sessionUser";

const UNREAD_CHAT_CACHE_KEY = "top_header_unread_chat_ids";

// Shared IMCircle brand tokens - keep in sync with Network.jsx / Home.jsx / BottomNav.jsx
const INDIGO = "#4338CA";
const MARIGOLD = "#EC9A1E";

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getUserId(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user?._id || user?.id || "";
}

function formatBadgeCount(count) {
  if (!count || count <= 0) return "";
  if (count > 99) return "99+";
  return count;
}

function TopHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [streak, setStreak] = useState(0);
  const [unreadChatIds, setUnreadChatIds] = useState(
    () => safeJsonParse(localStorage.getItem(UNREAD_CHAT_CACHE_KEY)) || []
  );

  const currentUserId = getUserId(me);
  const unreadChatCount = unreadChatIds.length;

  useEffect(() => {
    setMe(getSessionUser());
  }, []);

  useEffect(() => {
    const loadStreak = async () => {
      try {
        const res = await getMyBuilderScore();
        const builderScore = res?.builderScore || res?.data?.builderScore || null;
        setStreak(builderScore?.currentStreak || 0);
      } catch {
        setStreak(0);
      }
    };

    loadStreak();
    // Refetch on every route change too — the streak updates the instant a
    // user posts, and this badge is part of the persistent header, so it
    // needs to catch up without requiring a full page reload.
  }, [location.pathname]);

  useEffect(() => {
    const loadUnreadChats = async () => {
      if (!currentUserId) return;

      try {
        const res = await getConversations();
        const conversations = res.conversations || [];

        const ids = conversations
          .filter((conversation) => {
            if ((conversation.unreadCount || 0) > 0) return true;

            return conversation.unreadBy?.some(
              (id) => id?.toString() === currentUserId
            );
          })
          .map((conversation) => conversation._id);

        const nextIds = [...new Set(ids)];
        localStorage.setItem(UNREAD_CHAT_CACHE_KEY, JSON.stringify(nextIds));
        setUnreadChatIds(nextIds);
      } catch (error) {
        // best-effort — non-critical
      }
    };

    const timer = window.setTimeout(loadUnreadChats, 700);
    return () => window.clearTimeout(timer);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    socket.connect();
    socket.emit("user_online", currentUserId);

    socket.on("receive_message", (message) => {
      const senderId = getUserId(message.sender);

      if (senderId === currentUserId) return;

      setUnreadChatIds((prev) => {
        const next = new Set(prev);
        next.add(message.conversation);
        return Array.from(next);
      });
    });

    socket.on("message_seen_update", ({ conversationId, userId }) => {
      if (userId !== currentUserId) return;

      setUnreadChatIds((prev) =>
        prev.filter((id) => id?.toString() !== conversationId?.toString())
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_seen_update");
    };
  }, [currentUserId]);

  return (
    <>
      <header className="flex h-[72px] items-center justify-between px-1">
        <button
          onClick={() => setDrawerOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-full active:scale-95"
          style={{
            background: "var(--imc-surface)",
            border: "1px solid var(--imc-border)",
            color: "var(--imc-text)",
          }}
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => navigate("/home")}
          className="flex items-center justify-center active:scale-95"
        >
          <img
            src="/logo.png"
            alt="IMCircle"
            className="h-[38px] w-auto object-contain"
            draggable="false"
          />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-11 items-center gap-1.5 rounded-full px-3 active:scale-95"
            style={{
              background: "var(--imc-surface-strong)",
              border: "1px solid var(--imc-surface-strong-border)",
              color: "var(--imc-on-surface-strong)",
            }}
            aria-label="Your streak"
          >
            <Flame
              size={16}
              fill={streak > 0 ? MARIGOLD : "none"}
              style={{ color: streak > 0 ? MARIGOLD : "var(--imc-text-faint)" }}
            />
            <span className="text-[13px] font-black">{streak}</span>
          </button>

          <button
            onClick={() => {
              localStorage.setItem(UNREAD_CHAT_CACHE_KEY, JSON.stringify([]));
              setUnreadChatIds([]);
              navigate("/messages");
            }}
            className="relative grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{
              background: "var(--imc-surface)",
              border: "1px solid var(--imc-border)",
              color: "var(--imc-text)",
            }}
          >
            <MessageSquare size={20} />

            {unreadChatCount > 0 && (
              <span
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-black text-white ring-2"
                style={{ background: INDIGO, "--tw-ring-color": "var(--imc-surface)" }}
              >
                {formatBadgeCount(unreadChatCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/notifications")}
            className="relative grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{
              background: "var(--imc-surface)",
              border: "1px solid var(--imc-border)",
              color: "var(--imc-text)",
            }}
          >
            <Bell size={20} />
            <span
              className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ring-2"
              style={{ background: MARIGOLD, "--tw-ring-color": "var(--imc-surface)" }}
            />
          </button>
        </div>
      </header>

      <SideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

export default TopHeader;
