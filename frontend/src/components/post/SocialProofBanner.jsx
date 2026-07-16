import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
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

function getId(user) {
  return user?._id?.toString?.() || user?.id?.toString?.() || "";
}

// "Someone you know commented" banner — shown above a feed item when a
// circle member commented on it. Deliberately never surfaces strangers:
// this is meant to feel like social proof from people the viewer actually
// knows, not generic activity noise.
function SocialProofBanner({ proof, onOpenProfile, background = "var(--imc-surface)" }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!proof || !proof.primaryUser || dismissed) return null;

  const { primaryUser, avatars = [], othersCount = 0, commentText = "" } = proof;

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
    // Flush with the card — no margin, no rounded corners — and filled with
    // the SAME surface color as the card below it (a caller can override
    // this via `background` for a tinted card, e.g. JourneyCard's subtle
    // indigo wash), so there's no color seam where the page's background
    // would otherwise show through. This reads as the top strip of ONE
    // continuous card instead of a separate floating box. A single bottom
    // border stands in for the divider between this strip and the content
    // underneath.
    <div
      className="flex items-center justify-between gap-2 px-3.5 py-2.5"
      style={{
        background,
        borderBottom: "1px solid var(--imc-border)",
      }}
    >
      <button
        type="button"
        onClick={() => handleOpenProfile(primaryUser)}
        className="flex min-w-0 items-start gap-2 text-left active:scale-[0.98]"
      >
        <div className="mt-0.5 flex shrink-0 -space-x-2">
          {avatars.slice(0, 3).map((user, index) => {
            const avatarUrl = getAvatarUrl(user);
            const name = user?.fullName || user?.name || "Someone";

            return (
              <div
                key={getId(user) || index}
                className="h-6 w-6 overflow-hidden rounded-full"
                style={{ border: "2px solid var(--imc-surface)" }}
              >
                <img
                  src={avatarUrl || getGenderAvatarIcon(user)}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>

        <div className="min-w-0">
          <p
            className="truncate text-[11px] font-bold"
            style={{ color: "var(--imc-text)" }}
          >
            <span className="font-black">{primaryUser.fullName}</span>
            {othersCount > 0
              ? ` +${othersCount} other${othersCount > 1 ? "s" : ""} commented`
              : " commented"}
          </p>

          {/* The circle member's actual comment, shown right in the same
              strip instead of just a bare "X commented" with no content. */}
          {commentText && (
            <p
              className="mt-0.5 line-clamp-1 text-[11px] font-medium"
              style={{ color: "var(--imc-text-muted)" }}
            >
              {commentText}
            </p>
          )}
        </div>
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
