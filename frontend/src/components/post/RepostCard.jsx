import { Repeat2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CircleAction from "../common/CircleAction";
import { getGenderAvatarIcon } from "../../utils/avatar";

function getStoredUser() {
  const keys = ["user", "bharat_user", "authUser", "currentUser"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore malformed entries
    }
  }
  return null;
}

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getName(user) {
  return user?.fullName || user?.name || user?.username || "IMCircle Builder";
}

function getHeadline(user) {
  return (
    user?.headline ||
    user?.occupation ||
    user?.role ||
    user?.title ||
    user?.profession ||
    "Building on IMCircle"
  );
}

function getImageUrl(image) {
  if (!image) return "";

  const url =
    image?.url ||
    image?.secure_url ||
    image?.path ||
    image?.avatar?.url ||
    image?.profileImage?.url ||
    image?.profilePicture?.url ||
    image?.photo?.url ||
    image?.picture ||
    image?.photoURL ||
    image;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function cleanText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    if (value.trim() === "[object Object]") return "";
    return value.trim();
  }

  if (typeof value === "object") {
    return cleanText(
      value?.text ||
        value?.caption ||
        value?.thought ||
        value?.repostText ||
        value?.quote ||
        value?.content ||
        ""
    );
  }

  return "";
}

function RepostCard({
  repostText = "",
  currentUser = null,
  repostUser = null,
  // True when this card is shown on the reposter's own profile (Profile.jsx),
  // where "You reposted this" is accurate. UserProfile.jsx (viewing someone
  // else) passes false so it correctly reads "<Their Name> reposted this"
  // instead of mislabeling their repost as the viewer's own.
  viewerIsAuthor = true,
  children,
}) {
  const navigate = useNavigate();
  const user = currentUser || repostUser || {};
  const name = getName(user);
  const headline = getHeadline(user);
  const text = cleanText(repostText);
  const username = user?.username;
  const userId = user?._id || user?.id;

  const storedUser = getStoredUser();
  const viewerId = storedUser?._id || storedUser?.id;
  const isSelf = viewerIsAuthor || Boolean(viewerId && userId && String(viewerId) === String(userId));
  const inCircle = Boolean(user?.inCircle === true);
  const circleRequested = Boolean(user?.circleRequested === true);

  const avatarUrl = getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.photo ||
      user?.picture ||
      user?.image
  );

  const openUserProfile = () => {
    if (username) {
      navigate(`/profile/${username}`);
      return;
    }

    if (userId) {
      navigate(`/profile/user/${userId}`);
      return;
    }

    navigate("/profile");
  };

  return (
    <article className="imc-enter pb-5" style={{ background: "var(--imc-surface)", borderBottom: "1px solid var(--imc-border)" }}>
      <div className="px-4 pt-4">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
          <Repeat2 size={14} />
          {viewerIsAuthor ? "You reposted this" : `${name} reposted this`}
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={openUserProfile}
            className="shrink-0 active:scale-95"
          >
            <img
              src={avatarUrl || getGenderAvatarIcon(user)}
              alt={name}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover ring-2"
              style={{ "--tw-ring-color": "var(--imc-surface)" }}
            />
          </button>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openUserProfile}
                className="min-w-0 text-left active:scale-[0.99]"
              >
                <h2 className="truncate text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                  {name}
                </h2>
              </button>

              {viewerIsAuthor && (
                <span className="text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  · You
                </span>
              )}

              {!isSelf && userId && (
                <CircleAction
                  userId={userId}
                  isCircleMember={inCircle}
                  isRequested={circleRequested}
                />
              )}
            </div>

            <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              {headline}
            </p>
          </div>
        </div>

        {text && (
          <p className="mt-3 whitespace-pre-line text-[14.5px] leading-6" style={{ color: "var(--imc-text)" }}>
            {text}
          </p>
        )}
      </div>

      {/* PostCard/JourneyCard both use a -mx-4 breakout at their root,
          expecting a px-4 parent to bleed against. mx-4 alone (no padding)
          left nothing for that breakout to cancel against, so the child card
          overflowed 16px past this box's edges and got clipped by
          overflow-hidden — cropping the header/avatar and image. px-4 here
          gives the breakout something to cancel, so the child lands flush
          against this box's own rounded edge instead. */}
      <div className="mx-4 mt-4 overflow-hidden rounded-[18px] px-4" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
        {children}
      </div>
    </article>
  );
}

export default RepostCard;
