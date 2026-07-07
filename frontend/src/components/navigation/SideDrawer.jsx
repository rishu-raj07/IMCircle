import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  ChevronRight,
  Home,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { getMyProfile } from "../../api/profileApi";
import { getConversations } from "../../api/messageApi";
import { getNotifications } from "../../api/notificationApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getUserName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getUserHeadline(user) {
  return user?.headline || user?.bio || "Share your journey on IMCircle";
}

function getUserLocation(user) {
  if (typeof user?.location === "string") return user.location;

  const city = user?.location?.city;
  const state = user?.location?.state;
  return [city, state].filter(Boolean).join(", ");
}

function getUserAvatar(user) {
  const image =
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    user?.picture ||
    user?.photo;

  const url = image?.secure_url || image?.url || image?.path || image;
  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function isNotificationUnread(notification) {
  return !(notification?.isRead || notification?.read);
}

function SideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await getMyProfile();
        const user = res?.user || res?.data?.user || res?.data || res;
        if (!cancelled) setMe(user || null);
      } catch {
        // best-effort — drawer still works with whatever it has
      }
    })();

    (async () => {
      try {
        const res = await getConversations();
        const conversations = res?.conversations || res?.data?.conversations || [];
        const count = conversations.filter((c) => (c?.unreadCount || 0) > 0).length;
        if (!cancelled) setUnreadMessages(count);
      } catch {
        // best-effort
      }
    })();

    (async () => {
      try {
        const res = await getNotifications();
        const list = res?.notifications || res?.data?.notifications || res?.data || [];
        const count = (Array.isArray(list) ? list : []).filter(isNotificationUnread).length;
        if (!cancelled) setUnreadNotifications(count);
      } catch {
        // best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

  const isActive = (path) => location.pathname === path;

  const avatar = getUserAvatar(me);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[80] h-[100dvh] w-[84%] max-w-[350px] overflow-hidden rounded-r-[34px] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--imc-bg)" }}
      >
        <div className="h-[100dvh] overflow-y-auto overscroll-contain px-5 py-4 pb-32">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="IMCircle"
                className="h-9 w-9 object-contain"
                draggable="false"
              />

              <div>
                <h1
                  className="font-serif text-[18px] font-semibold tracking-[-0.3px]"
                  style={{ color: "var(--imc-text)" }}
                >
                  IM<span style={{ color: "var(--imc-indigo-text)" }}>Circle</span>
                </h1>
                <p className="mt-0.5 text-[9.5px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  Share your journey. Grow together.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full active:scale-95"
              style={{ background: "var(--imc-surface)", color: "var(--imc-text)" }}
            >
              <X size={18} />
            </button>
          </div>

          <button
            onClick={() => goTo("/profile")}
            className="mt-5 flex w-full items-center gap-3 rounded-[26px] p-3 text-left shadow-sm ring-1 active:scale-[0.99]"
            style={{ background: "var(--imc-surface)", "--tw-ring-color": "var(--imc-border)" }}
          >
            <div
              className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full"
              style={{ background: "rgba(67,56,202,0.14)" }}
            >
              {avatar ? (
                <img src={avatar} alt={getUserName(me)} className="h-full w-full object-cover" />
              ) : (
                <User size={28} style={{ color: "var(--imc-indigo-text)" }} />
              )}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 bg-[#059669]" style={{ borderColor: "var(--imc-surface)" }} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[16px] font-black" style={{ color: "var(--imc-text)" }}>
                {getUserName(me)}
              </h2>

              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                {getUserHeadline(me)}
              </p>

              {getUserLocation(me) && (
                <p className="mt-0.5 text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  {getUserLocation(me)}
                </p>
              )}
            </div>

            <ChevronRight size={18} style={{ color: "var(--imc-text-muted)" }} />
          </button>

          <div className="mt-5">
            <SectionTitle title="Main" />

            <DrawerItem
              active={isActive("/home")}
              icon={<Home size={20} />}
              label="Home"
              onClick={() => goTo("/home")}
            />

            <DrawerItem
              active={isActive("/network")}
              icon={<Users size={20} />}
              label="Network"
              onClick={() => goTo("/network")}
            />

            <DrawerItem
              active={isActive("/messages")}
              icon={<MessageSquare size={20} />}
              label="Messages"
              badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
              onClick={() => goTo("/messages")}
            />

            <DrawerItem
              active={isActive("/saved")}
              icon={<Bookmark size={20} />}
              label="Saved"
              onClick={() => goTo("/saved")}
            />

            <DrawerItem
              active={isActive("/notifications")}
              icon={<Bell size={20} />}
              label="Notifications"
              badge={unreadNotifications > 0 ? String(unreadNotifications) : undefined}
              onClick={() => goTo("/notifications")}
            />
          </div>

          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--imc-border)" }}>
            <SectionTitle title="More" />

            <DrawerItem
              active={isActive("/verification")}
              icon={<ShieldCheck size={20} />}
              label="Verification"
              smallBadge="New"
              onClick={() => goTo("/verification")}
            />

            <DrawerItem
              active={isActive("/settings")}
              icon={<Settings size={20} />}
              label="Settings"
              onClick={() => goTo("/settings")}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionTitle({ title }) {
  return (
    <p
      className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em]"
      style={{ color: "var(--imc-text-muted)" }}
    >
      {title}
    </p>
  );
}

function DrawerItem({ icon, label, active, badge, smallBadge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-1 flex h-11 w-full items-center gap-3 rounded-[20px] px-3 transition active:scale-[0.99]"
      style={{
        background: active ? "rgba(67,56,202,0.12)" : "transparent",
        color: active ? "var(--imc-indigo-text)" : "var(--imc-text)",
      }}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-2xl"
        style={{
          background: active ? "var(--imc-surface)" : "var(--imc-bg)",
          color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)",
        }}
      >
        {icon}
      </span>

      <span className="flex-1 text-left text-[13px] font-black">{label}</span>

      {badge && (
        <span className="rounded-full bg-[#4338CA] px-2 py-0.5 text-[9px] font-black text-white">
          {badge}
        </span>
      )}

      {smallBadge && (
        <span
          className="rounded-full px-2 py-1 text-[9px] font-black"
          style={{ background: "rgba(236,154,30,0.16)", color: "var(--imc-marigold)" }}
        >
          {smallBadge}
        </span>
      )}
    </button>
  );
}

export default SideDrawer;
