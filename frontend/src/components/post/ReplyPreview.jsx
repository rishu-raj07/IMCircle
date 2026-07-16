import { MessageCircle } from "lucide-react";
import { getGenderAvatarIcon } from "../../utils/avatar";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getAvatarUrl(user) {
  const avatar =
    user?.avatar?.url ||
    user?.avatar?.secure_url ||
    (typeof user?.avatar === "string" ? user.avatar : "") ||
    user?.profilePicture ||
    user?.profileImage ||
    user?.photo ||
    user?.picture ||
    user?.photoURL ||
    "";

  return normalizeImageUrl(avatar);
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "Someone";
}

function formatCount(num = 0) {
  const value = Number(num) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value;
}

// Replaces the old standalone "comment bubble" action icon. No replies yet →
// a simple Reply prompt. Once there's at least one reply, shows the latest
// one inline (avatar + name + snippet) hanging off a thread line, with a
// "View all replies" trigger that opens the full comment sheet either way.
function ReplyPreview({ count = 0, topComment, onOpen }) {
  if (!count || !topComment?.user) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 flex items-center gap-2 text-[13px] font-bold active:scale-95"
        style={{ color: "var(--imc-text-muted)" }}
      >
        <MessageCircle size={18} />
        Reply
      </button>
    );
  }

  const name = getName(topComment.user);
  const avatarUrl = getAvatarUrl(topComment.user);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-start gap-2.5 text-left active:scale-[0.99]"
    >
      <div
        className="mt-0.5 w-[2px] shrink-0 self-stretch rounded-full"
        style={{ background: "var(--imc-border)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
            <img
              src={avatarUrl || getGenderAvatarIcon(topComment.user)}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <span
            className="truncate text-[12px] font-black"
            style={{ color: "var(--imc-text)" }}
          >
            {name}
          </span>
        </div>

        <p
          className="mt-1 line-clamp-1 text-[12.5px] font-semibold"
          style={{ color: "var(--imc-text-muted)" }}
        >
          {topComment.text}
        </p>

        <span
          className="mt-1 inline-block text-[12px] font-bold"
          style={{ color: "var(--imc-indigo-text)" }}
        >
          View all {formatCount(count)} {count === 1 ? "reply" : "replies"}
        </span>
      </div>
    </button>
  );
}

export default ReplyPreview;
