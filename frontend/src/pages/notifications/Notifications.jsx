import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import {
  getFreshNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notificationApi";

const INK = "#12141C";
const PAPER = "#F8F4EA";
const MARIGOLD = "#EC9A1E";
const GOLD_TINT = "#FDF3E3";
const MUTED = "#6B7280";
const LINE = "rgba(18,20,28,0.08)";
const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
}

function normalizeNotifications(response) {
  const list =
    response?.notifications ||
    response?.data?.notifications ||
    response?.data ||
    response;

  return Array.isArray(list) ? list : [];
}

function getNotificationTime(item) {
  return new Date(
    item?.createdAt ||
      item?.updatedAt ||
      item?.time ||
      item?.timestamp ||
      item?.created_at ||
      0
  ).getTime();
}

function getNotificationText(item) {
  return (
    item?.message ||
    item?.text ||
    item?.body ||
    item?.title ||
    "You have a new notification"
  );
}

function getImageUrl(value) {
  if (!value) return "";

  const url =
    value?.secure_url ||
    value?.url ||
    value?.path ||
    value?.avatar?.url ||
    value?.profileImage?.url ||
    value?.image?.url ||
    value;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getSender(item) {
  return (
    item?.sender ||
    item?.from ||
    item?.actor ||
    item?.user ||
    item?.createdBy ||
    item?.data?.sender ||
    item?.data?.actor ||
    item?.meta?.sender ||
    null
  );
}

function getSenderName(item) {
  const sender = getSender(item);
  return (
    sender?.fullName ||
    sender?.name ||
    sender?.username ||
    item?.senderName ||
    item?.actorName ||
    ""
  );
}

function getSenderTagline(item) {
  const sender = getSender(item);
  return (
    sender?.headline ||
    sender?.tagline ||
    sender?.role ||
    sender?.field ||
    sender?.bio ||
    item?.senderHeadline ||
    item?.actorHeadline ||
    item?.data?.senderHeadline ||
    ""
  );
}

function getSenderImage(item) {
  const sender = getSender(item);
  return getImageUrl(
    sender?.avatar ||
      sender?.profileImage ||
      sender?.profilePicture ||
      sender?.photo ||
      sender?.picture ||
      sender?.image ||
      sender?.profile?.avatar ||
      sender?.profile?.profileImage ||
      item?.senderAvatar ||
      item?.actorAvatar ||
      item?.data?.senderAvatar ||
      item?.data?.actorAvatar
  );
}

function formatRelativeTime(value) {
  if (!value) return "now";

  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${Math.max(1, seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo`;
  return `${Math.floor(days / 365)} yr`;
}

function getType(item) {
  return String(item?.type || item?.notificationType || "general").toLowerCase();
}

function getIcon(type) {
  if (type.includes("circle") || type.includes("community")) return UsersRound;
  if (type.includes("request") || type.includes("follow") || type.includes("invite")) return UserPlus;
  if (type.includes("comment") || type.includes("reply") || type.includes("message")) return MessageCircle;
  if (type.includes("like")) return Heart;
  if (type.includes("repost") || type.includes("share")) return Repeat2;
  if (type.includes("journey") || type.includes("learning") || type.includes("milestone")) return Sparkles;
  if (type.includes("verify") || type.includes("admin")) return ShieldCheck;
  return Bell;
}

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getFreshNotifications();
      setNotifications(
        normalizeNotifications(data).sort(
          (a, b) => getNotificationTime(b) - getNotificationTime(a)
        )
      );
    } catch {
      setNotifications((prev) => prev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadNotifications, 8000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", loadNotifications);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", loadNotifications);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item?.read && !item?.isRead).length;

  const filtered = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => getNotificationTime(b) - getNotificationTime(a)
    );

    if (activeTab === "All") return sorted;
    if (activeTab === "Unread") return sorted.filter((item) => !item?.read && !item?.isRead);

    const q = activeTab.toLowerCase();
    return sorted.filter((item) => getType(item).includes(q));
  }, [activeTab, notifications]);

  const openNotification = async (item) => {
    const id = getId(item);
    if (id) {
      try {
        setActionId(id);
        await markNotificationRead(id);
        setNotifications((prev) =>
          prev.map((notification) =>
            getId(notification) === id
              ? { ...notification, read: true, isRead: true }
              : notification
          )
        );
      } catch {
        // Keep navigation responsive even if read-state fails.
      } finally {
        setActionId("");
      }
    }

    const target =
      item?.link ||
      item?.url ||
      item?.targetUrl ||
      item?.meta?.url ||
      item?.data?.url;

    if (target) navigate(target);
  };

  const handleDelete = async (item) => {
    const id = getId(item);
    setNotifications((prev) =>
      prev.filter((notification) => getId(notification) !== id)
    );

    if (!id) return;

    try {
      await deleteNotification(id);
    } catch {
      // Optimistic delete stays deleted in the UI.
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read: true, isRead: true }))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read: true, isRead: true }))
      );
    }
  };

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "#DED8CC" }}>
      <div className="min-h-screen w-full max-w-[430px] pb-24" style={{ background: PAPER }}>
        <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-4 backdrop-blur-xl" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: PAPER, color: INK }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[18px] font-black" style={{ color: INK }}>
                Notifications
              </h1>
              <p className="text-[11px] font-bold" style={{ color: MUTED }}>
                {unreadCount} unread updates
              </p>
            </div>
            <button
              onClick={handleReadAll}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: GOLD_TINT, color: "#8A5A12" }}
            >
              <CheckCheck size={19} />
            </button>
          </div>
        </header>

        <main className="px-4 pt-4">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
            {["All", "Unread", "Circle", "Invite", "Journey", "Comment", "Like"].map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="h-9 shrink-0 rounded-full px-4 text-[12px] font-black"
                  style={{
                    background: active ? INK : "#fff",
                    color: active ? MARIGOLD : MUTED,
                    border: `1px solid ${LINE}`,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid min-h-[220px] place-items-center">
              <Loader2 className="animate-spin" size={25} style={{ color: MARIGOLD }} />
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((item) => (
                <NotificationCard
                  key={getId(item) || getNotificationText(item)}
                  item={item}
                  loading={actionId === getId(item)}
                  onClick={() => openNotification(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] bg-[var(--imc-surface)] p-6 text-center" style={{ border: `1px solid ${LINE}` }}>
              <Bell className="mx-auto" size={28} style={{ color: MARIGOLD }} />
              <p className="mt-3 text-[14px] font-black" style={{ color: INK }}>
                No notifications
              </p>
              <p className="mt-1 text-[12px] font-semibold" style={{ color: MUTED }}>
                Circle invites, comments, likes, journey updates, and requests will appear here.
              </p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function NotificationCard({ item, loading, onClick, onDelete }) {
  const type = getType(item);
  const Icon = getIcon(type);
  const unread = !item?.read && !item?.isRead;
  const senderName = getSenderName(item);
  const senderTagline = getSenderTagline(item);
  const image = getSenderImage(item);
  const [swiped, setSwiped] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const text =
    getNotificationText(item) ||
    (senderName ? `${senderName} sent you a notification` : "New notification");

  return (
    <div
      className="relative overflow-hidden rounded-[22px]"
      onTouchStart={(event) => {
        touchStart.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }}
      onTouchEnd={(event) => {
        const dx = event.changedTouches[0].clientX - touchStart.current.x;
        const dy = event.changedTouches[0].clientY - touchStart.current.y;

        if (Math.abs(dx) <= Math.abs(dy)) return;
        if (dx < -45) setSwiped(true);
        if (dx > 35) setSwiped(false);
      }}
    >
      <button
        onClick={onDelete}
        className="absolute inset-y-0 right-0 w-24 text-[12px] font-black text-white"
        style={{ background: "#D92D20" }}
      >
        Delete
      </button>

      <button
        onClick={onClick}
        className="relative flex w-full gap-3 rounded-[22px] bg-[var(--imc-surface)] p-4 text-left shadow-[0_10px_26px_rgba(18,20,28,0.035)] transition-transform"
        style={{
          border: unread ? "1px solid rgba(236,154,30,0.22)" : `1px solid ${LINE}`,
          transform: swiped ? "translateX(-88px)" : "translateX(0)",
        }}
      >
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: unread ? INK : PAPER, color: unread ? MARIGOLD : MUTED }}>
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : image ? (
          <NotificationAvatar image={image} name={senderName} icon={Icon} />
        ) : senderName ? (
          <NotificationAvatar image="" name={senderName} icon={Icon} />
        ) : (
          <Icon size={21} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-black leading-5" style={{ color: INK }}>
              {senderName || item?.title || type.replaceAll("_", " ")}
            </p>
            {senderTagline && (
              <p className="truncate text-[10.5px] font-semibold" style={{ color: MUTED }}>
                {senderTagline}
              </p>
            )}
          </div>
          {unread && <span className="mt-1 h-2 w-2 rounded-full" style={{ background: MARIGOLD }} />}
        </div>
        <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: MUTED }}>
          {text}
        </p>
        <p className="mt-2 text-[10px] font-black" style={{ color: MARIGOLD }}>
          {formatRelativeTime(item?.createdAt || item?.updatedAt)}
        </p>
      </div>
      </button>
    </div>
  );
}

function NotificationAvatar({ image, name, icon: Icon }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name || "Sender"}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  if (name) {
    return (
      <span className="text-[13px] font-black">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return <Icon size={21} />;
}

export default Notifications;
