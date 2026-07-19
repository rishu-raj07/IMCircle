import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, X } from "lucide-react";

import CircleAction from "./CircleAction";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { createConversation } from "../../api/messageApi";
import { getSessionUser } from "../../utils/sessionUser";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getAvatar(user) {
  const avatar =
    user?.avatar?.url ||
    user?.avatar?.secure_url ||
    user?.profilePicture ||
    user?.profileImage ||
    user?.photo ||
    user?.photoURL ||
    user?.picture ||
    (typeof user?.avatar === "string" ? user.avatar : "");

  return normalizeImageUrl(avatar);
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "Builder";
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString?.() || value?.id?.toString?.() || "";
}

// Row for a single liker — the whole point of this list (per the product
// ask) is that it isn't just names: a circle member gets a direct
// "Message" shortcut, anyone else gets the same +Circle action used
// everywhere else in the app (CircleAction — already handles
// none/pending/circle state and its own optimistic update).
function LikerRow({ user, onClose, isSelf }) {
  const navigate = useNavigate();
  const userId = getId(user);
  const [messaging, setMessaging] = useState(false);

  const openProfile = () => {
    onClose?.();
    if (user?.username) navigate(`/profile/${user.username}`);
    else if (userId) navigate(`/profile/user/${userId}`);
  };

  const handleMessage = async (event) => {
    event.stopPropagation();
    if (messaging || !userId) return;

    try {
      setMessaging(true);
      const res = await createConversation(userId);
      const conversation = res?.conversation || res?.data?.conversation;
      if (conversation?._id) {
        onClose?.();
        navigate(`/chat/${conversation._id}`, { state: { conversation } });
      }
    } catch {
      // best-effort — non-critical
    } finally {
      setMessaging(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openProfile}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-70"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--imc-surface-2)" }}>
        <img
          src={getAvatar(user) || getGenderAvatarIcon(user)}
          alt={getName(user)}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold" style={{ color: "var(--imc-text)" }}>
          {getName(user)}
        </p>
        {user?.headline && (
          <p className="truncate text-[11px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
            {user.headline}
          </p>
        )}
      </div>

      <div onClick={(event) => event.stopPropagation()} className="shrink-0">
        {isSelf ? (
          <span className="text-[11px] font-black" style={{ color: "var(--imc-text-muted)" }}>
            You
          </span>
        ) : user?.isInCircle ? (
          <button
            type="button"
            onClick={handleMessage}
            disabled={messaging}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black active:scale-95 disabled:opacity-60"
            style={{ borderColor: "var(--imc-border)", color: "var(--imc-indigo-text)" }}
          >
            {messaging ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
            {messaging ? "..." : "Message"}
          </button>
        ) : (
          <CircleAction
            userId={userId}
            isCircleMember={false}
            isRequested={Boolean(user?.isRequested)}
            size="xs"
          />
        )}
      </div>
    </button>
  );
}

// Bottom sheet listing everyone who liked a journey milestone — opened from
// the "Liked by [circle member] +N more" row on JourneyCard.jsx. Circle
// members sort first (see getMilestoneLikers in journey.controller.js).
export default function LikersSheet({ open, onClose, title = "Liked by", loadLikers }) {
  const [likers, setLikers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const currentUserId = getId(getSessionUser());

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const data = await loadLikers();
        if (!cancelled) setLikers(data?.likers || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35" onClick={onClose}>
      <div
        className="flex max-h-[75vh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-[var(--imc-surface)] pb-[max(12px,env(safe-area-inset-bottom))] shadow-2xl imc-enter"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4" style={{ borderBottom: "1px solid var(--imc-border)" }}>
          <h3 className="text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full"
            style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto py-1">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--imc-text-muted)" }} />
            </div>
          )}

          {!loading && error && (
            <p className="px-4 py-8 text-center text-[12.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              Couldn't load likes. Try again.
            </p>
          )}

          {!loading && !error && likers.length === 0 && (
            <p className="px-4 py-8 text-center text-[12.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              No likes yet.
            </p>
          )}

          {!loading &&
            !error &&
            likers.map((user) => (
              <LikerRow
                key={getId(user)}
                user={user}
                onClose={onClose}
                isSelf={Boolean(currentUserId) && getId(user) === currentUserId}
              />
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
