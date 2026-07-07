import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const MARIGOLD = "#EC9A1E";
const INK = "#12141C";

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

function getId(user) {
  return user?._id?.toString?.() || user?.id?.toString?.() || "";
}

// "Someone you know commented" banner — shown above a feed item when a
// circle member commented on it. Deliberately never surfaces strangers:
// this is meant to feel like social proof from people the viewer actually
// knows, not generic activity noise.
function SocialProofBanner({ proof, onOpenProfile }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!proof || !proof.primaryUser || dismissed) return null;

  const { primaryUser, avatars = [], othersCount = 0 } = proof;

  const handleOpenProfile = (user) => {
    if (onOpenProfile) {
      onOpenProfile(user);
      return;
    }

    if (user?.username) {
      navigate(`/profile/${user.username}`);
    } else if (getId(user)) {
      navigate(`/profile/user/${getId(user)}`);
    }
  };

  return (
    <div
      className="mx-2 mb-1.5 mt-2 flex items-center justify-between gap-2 rounded-[14px] px-3 py-2"
      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
    >
      <button
        type="button"
        onClick={() => handleOpenProfile(primaryUser)}
        className="flex min-w-0 items-center gap-2 text-left active:scale-[0.98]"
      >
        <div className="flex shrink-0 -space-x-2">
          {avatars.slice(0, 3).map((user, index) => {
            const avatarUrl = getAvatarUrl(user);
            const name = user?.fullName || user?.name || "Someone";

            return (
              <div
                key={getId(user) || index}
                className="grid h-6 w-6 place-items-center overflow-hidden rounded-full text-[9px] font-black"
                style={{
                  background: INK,
                  color: MARIGOLD,
                  border: "2px solid var(--imc-surface-2)",
                }}
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
            );
          })}
        </div>

        <p
          className="min-w-0 truncate text-[11px] font-bold"
          style={{ color: "var(--imc-text)" }}
        >
          <span className="font-black">{primaryUser.fullName}</span>
          {othersCount > 0
            ? ` +${othersCount} other${othersCount > 1 ? "s" : ""} commented`
            : " commented"}
        </p>
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 active:scale-90"
        style={{ color: "var(--imc-text-faint)" }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default SocialProofBanner;
