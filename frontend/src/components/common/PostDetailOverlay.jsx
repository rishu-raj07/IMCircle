import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, X } from "lucide-react";

import ResponsivePostMedia from "./ResponsivePostMedia";
import MediaLightbox from "./MediaLightbox";
import CircleAction from "./CircleAction";
import ImageLoader from "./ImageLoader";
import PostActions from "../post/PostActions";
import PostMenu from "../post/PostMenu";
import { formatRelativeTime } from "../../utils/relativeTime";
import { getGenderAvatarIcon } from "../../utils/avatar";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getName(user) {
  return user?.fullName || user?.name || user?.username || "IMCircle Builder";
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
    image;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

// Delegates to the shared PART-12 formatter (utils/relativeTime.js) — kept
// as a thin named wrapper so every call site in this file stays unchanged.
function formatTime(date) {
  return formatRelativeTime(date) || "now";
}

// Instagram-style "open post" view: profile header on top, the full,
// uncropped media in the middle (big, correctly oriented — this is where a
// tapped card actually gets its real aspect ratio, unlike the uniform feed
// thumbnail), then like/comment/repost/save/share BELOW the media — not a
// TikTok-style vertical action rail overlaid on the photo. Reuses the exact
// same PostActions/PostMenu/CircleAction the feed card already uses, so
// there's only one copy of that logic.
function PostDetailOverlay({ post = {}, type = "post", currentUser = null, initialMediaIndex = 0, onClose, onDeleted }) {
  const navigate = useNavigate();
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [index, setIndex] = useState(initialMediaIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const author = post.author || post.creator || post.user || {};
  const authorId = author?._id || author?.id || "";
  const name = getName(author);
  const username = author?.username;

  const currentUserId =
    currentUser?._id || currentUser?.id || post?.currentUserId || "";
  const isMe =
    post.isMine === true ||
    post.isOwn === true ||
    (authorId && currentUserId && String(authorId) === String(currentUserId));

  const inCircle = Boolean(
    author?.inCircle === true || post?.viewerState?.inCircle === true
  );
  const circleRequested = Boolean(author?.circleRequested === true);

  const avatarUrl = getImageUrl(
    author?.avatar || author?.profileImage || author?.profilePicture || author?.photo || author?.picture
  );

  const media = Array.isArray(post.media)
    ? post.media
        .map((item) => ({
          url: getImageUrl(item?.url || item?.secure_url || item?.path || item),
          type: item?.type || "image",
        }))
        .filter((item) => item.url && item.type !== "audio")
    : [];

  const activeItem = media[index] || media[0];

  const content = post.content || post.description || post.text || "";

  const openProfile = () => {
    if (isMe) {
      navigate("/profile");
      return;
    }
    if (username) navigate(`/profile/${username}`);
    else if (authorId) navigate(`/profile/user/${authorId}`);
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-center overflow-y-auto" style={{ background: "var(--imc-bg)" }}>
      <div className="w-full max-w-[430px]" style={{ minHeight: "100dvh", background: "var(--imc-surface)" }}>
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5"
          style={{ background: "var(--imc-surface)", borderBottom: "1px solid var(--imc-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full active:scale-95"
            style={{ background: "var(--imc-surface-2)", color: "var(--imc-indigo-text)" }}
          >
            <X size={18} />
          </button>
          <span className="text-[13px] font-black" style={{ color: "var(--imc-indigo-text)" }}>Post</span>
          <span className="w-9" />
        </div>

        <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
          <button type="button" onClick={openProfile} className="flex min-w-0 items-center gap-2.5 text-left active:scale-[0.99]">
            {avatarUrl && !avatarBroken ? (
              <ImageLoader
                src={avatarUrl}
                alt={name}
                className="h-10 w-10 rounded-full object-cover"
                wrapperClassName="h-10 w-10 rounded-full"
                width={96}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <img
                src={getGenderAvatarIcon(author)}
                alt={name}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>{name}</span>
                {author?.verification?.isVerified && <BadgeCheck size={13} style={{ color: "var(--imc-indigo)" }} />}
              </div>
              <p className="text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                {formatTime(post.createdAt)}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {!isMe && authorId && (
              <CircleAction userId={authorId} isCircleMember={inCircle} isRequested={circleRequested} />
            )}
            <PostMenu post={post} type={type} isMine={isMe} onDeleted={() => { onDeleted?.(); onClose?.(); }} />
          </div>
        </div>

        {content && (
          <p className="whitespace-pre-line px-3.5 pt-2.5 text-[13.5px] leading-5" style={{ color: "var(--imc-text)" }}>
            {content}
          </p>
        )}

        {activeItem && (
          <div className="mt-3">
            <ResponsivePostMedia
              src={activeItem.url}
              type={activeItem.type}
              alt="Post media"
              onClick={() => setLightboxOpen(true)}
              rounded="rounded-none"
              maxHeightVh={62}
              maxHeightPx={620}
              eager
            />

            {media.length > 1 && (
              <div className="flex justify-center gap-1.5 py-2">
                {media.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: i === index ? "var(--imc-indigo)" : "var(--imc-border)" }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-3.5 pb-8">
          <PostActions post={post} type={type} />
        </div>
      </div>

      {lightboxOpen && (
        <MediaLightbox
          media={media}
          initialIndex={index}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export default PostDetailOverlay;
