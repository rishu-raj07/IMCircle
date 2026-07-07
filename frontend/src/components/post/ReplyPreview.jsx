import { MessageCircle } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const INK = "#12141C";
const MARIGOLD = "#EC9A1E";

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
        className="mt-2 flex items-center gap-1.5 text-[12px] font-bold active:scale-95"
        style={{ color: "var(--imc-text-muted)" }}
      >
        <MessageCircle size={15} />
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
      className="mt-2 flex w-full items-start gap-2 text-left active:scale-[0.99]"
    >
      <div
        className="mt-0.5 w-[2px] shrink-0 self-stretch rounded-full"
        style={{ background: "var(--imc-border)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div
            className="grid h-4 w-4 shrink-0 place-items-center overflow-hidden rounded-full text-[7px] font-black"
            style={{ background: INK, color: MARIGOLD }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <span
            className="truncate text-[11px] font-black"
            style={{ color: "var(--imc-text)" }}
          >
            {name}
          </span>
        </div>

        <p
          className="mt-0.5 line-clamp-1 text-[12px] font-semibold"
          style={{ color: "var(--imc-text-muted)" }}
        >
          {topComment.text}
        </p>

        <span
          className="mt-0.5 inline-block text-[11px] font-bold"
          style={{ color: "var(--imc-indigo-text)" }}
        >
          View all {formatCount(count)} {count === 1 ? "reply" : "replies"}
        </span>
      </div>
    </button>
  );
}

export default ReplyPreview;
