import { useEffect, useState } from "react";
import { Bell, Flame, MessageSquare, Menu, Search } from "lucide-react";
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

function TopHeader({ onStreakClick }) {
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
      <header className="flex h-[60px] items-center justify-between px-1">
        <button
          onClick={() => setDrawerOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full active:scale-95"
          style={{ color: "var(--imc-text-muted)" }}
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => navigate("/home")}
          className="ml-2 mr-auto flex min-h-11 flex-col items-start justify-center active:scale-95"
        >
          <span className="text-[22px] font-black leading-none tracking-[-1.1px]" style={{ color: "var(--imc-text)" }}>
            <span style={{ color: "var(--imc-indigo-text)" }}>IM</span>Circle
          </span>
          <span className="mt-1 text-[8.5px] font-medium leading-none" style={{ color: "var(--imc-text-muted)" }}>
            Your circle shapes your future.
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (streak < 1) return;
              if (onStreakClick) onStreakClick();
              else navigate("/home", { state: { openStreakCard: true } });
            }}
            className="relative grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{ color: MARIGOLD }}
            aria-label={streak > 0 ? `Open your ${streak}-day streak card` : "Build a one-day streak to unlock your streak card"}
          >
            <Flame size={21} fill={streak > 0 ? MARIGOLD : "none"} strokeWidth={2.1} />
            {streak > 0 && (
              <span
                className="absolute bottom-0.5 right-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[8px] font-black text-white ring-2"
                style={{ background: INDIGO, "--tw-ring-color": "var(--imc-surface)" }}
              >
                {streak > 99 ? "99+" : streak}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/search")}
            className="grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{ color: "var(--imc-text)" }}
            aria-label="Search"
          >
            <Search size={20} strokeWidth={2} />
          </button>

          <button
            onClick={() => {
              localStorage.setItem(UNREAD_CHAT_CACHE_KEY, JSON.stringify([]));
              setUnreadChatIds([]);
              navigate("/messages");
            }}
            className="relative grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{
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
