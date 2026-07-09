import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, GraduationCap, Mic, Plus, Check } from "lucide-react";

import PostActions from "./PostActions";
import PostMenu from "./PostMenu";
import SocialProofBanner from "./SocialProofBanner";
import ViewInfoSheet from "../common/ViewInfoSheet";
import ImageLoader from "../common/ImageLoader";
import LazyVideo from "../common/LazyVideo";
import FullScreenReel from "./FullScreenReel";
import PostReelSlide from "./PostReelSlide";
// The old networkApi.followUser hit POST /users/follow/:id and DELETE
// /users/unfollow/:id — neither route exists on the backend (only PATCH
// /users/:id/follow does), so this button silently failed on every click.
import { followUserById } from "../../api/userApi";
import { trackEvent } from "../../utils/analyticsTracker";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// Fixed brand hues (same in both themes). Structural colors (text, surfaces,
// borders) read from the mode-aware CSS vars defined in index.css instead.
const INK = "#12141C";
const MARIGOLD = "#EC9A1E";
const MARIGOLD_DARK = "#8A5A12";
const POST_PURPOSE_LABELS = {
  general: "General",
  achievement: "Achievement",
  question: "Question",
  query: "General Query",
  opportunity: "Opportunity",
};

function getName(user) {
  return user?.fullName || user?.name || user?.username || "IMCircle Builder";
}

function getInitial(name) {
  return name?.charAt(0)?.toUpperCase() || "B";
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getStoredUser() {
  const keys = ["user", "bharat_user", "authUser", "currentUser"];

  for (const key of keys) {
    const parsed = safeJsonParse(localStorage.getItem(key));
    if (parsed?._id || parsed?.id || parsed?.user?._id || parsed?.user?.id) {
      return parsed?.user || parsed;
    }
  }

  return {};
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

function formatTime(date) {
  if (!date) return "now";

  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function formatCount(num = 0) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
}

function cleanText(value) {
  if (!value || typeof value !== "string") return "";
  if (value === "[object Object]") return "";
  return value;
}

function getRepostText(post) {
  return cleanText(
    post?.repostText ||
      post?.repostCaption ||
      post?.quoteText ||
      post?.quote ||
      post?.caption ||
      post?.myRepost?.caption ||
      post?.myRepost?.text ||
      post?.myRepost?.thought ||
      post?.repost?.text ||
      post?.repost?.caption ||
      ""
  );
}

function PostCard({ post = {}, type = "post", currentUser = null }) {
  const navigate = useNavigate();

  const [showViews, setShowViews] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  // No parent-list plumbing needed — the backend soft-deletes and future
  // feed loads already exclude it, so this just hides the card from the
  // CURRENT view the instant the delete succeeds.
  const [deleted, setDeleted] = useState(false);

  const storedUser = getStoredUser();

  const author = post.author || post.creator || post.user || {};
  const name = getName(author);
  const authorId = getId(author);
  const username = author?.username;

  const currentUserId =
    getId(currentUser) ||
    getId(post.currentUser) ||
    getId(post.loggedInUser) ||
    getId(storedUser) ||
    post.currentUserId ||
    "";

  const isMe =
    post.isMine === true ||
    post.isOwn === true ||
    post.isMe === true ||
    author?.isMe === true ||
    (authorId && currentUserId && String(authorId) === String(currentUserId));

  const getInitialFollowing = () =>
    Boolean(
      author?.isFollowing === true ||
        post?.isFollowing === true ||
        post?.followedByMe === true
    );

  const [following, setFollowing] = useState(getInitialFollowing);

  useEffect(() => {
    setFollowing(getInitialFollowing());
  }, [post?._id, post?.isFollowing, post?.followedByMe, author?.isFollowing]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [authorId, author?.avatar, author?.profileImage, author?.profilePicture]);

  const showFollowButton = Boolean(authorId) && !isMe && !following;

  const avatarUrl = getImageUrl(
    author?.avatar ||
      author?.profileImage ||
      author?.profilePicture ||
      author?.photo ||
      author?.picture ||
      author?.image
  );

  const repostText = getRepostText(post);

  const content =
    post.content ||
    post.description ||
    post.text ||
    "Shared a new update on IMCircle.";

  const occupation =
    author?.headline ||
    author?.occupation ||
    author?.role ||
    author?.title ||
    author?.profession ||
    "Builder";

  const impressions =
    post.impressionsCount || post.viewsCount || post.impressions || 0;
  const purpose = post.purpose || post.postPurpose || post.category || "";
  const purposeLabel = POST_PURPOSE_LABELS[purpose] || "";

  const tag =
    type === "learning"
      ? post.topic
        ? `#${post.topic}`
        : "#TodayILearned"
      : purposeLabel
      ? `#${purposeLabel.replace(/\s+/g, "")}`
      : post.tag || post.category || "#BuildingInPublic";

  const media = Array.isArray(post.media)
    ? post.media
        .slice(0, 4)
        .map((item) => ({
          url: getImageUrl(item?.url || item?.secure_url || item?.path || item),
          type: item?.type || "image",
        }))
        .filter((item) => item.url)
    : [];
  const visualMedia = media.filter((item) => item.type !== "audio");

  const activeMedia =
    activeMediaIndex !== null ? visualMedia[activeMediaIndex] : null;

  const openUserProfile = (e) => {
    e.stopPropagation();

    if (isMe) {
      navigate("/profile");
      return;
    }

    if (username) {
      navigate(`/profile/${username}`);
      return;
    }

    if (authorId) {
      navigate(`/profile/user/${authorId}`);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();

    if (!authorId || isMe || followLoading) return;

    setFollowLoading(true);
    setFollowing(true);

    try {
      await followUserById(authorId);
      trackEvent("follow", { entityType: "user", entityId: authorId }).catch(() => {});
    } catch (error) {
      setFollowing(false);
    } finally {
      setFollowLoading(false);
    }
  };

  if (deleted) return null;

  return (
    <>
      <article
        className="imc-enter overflow-hidden rounded-[16px] pb-3"
        style={{
          background: "var(--imc-surface)",
          border: "1px solid var(--imc-border)",
        }}
      >
        <SocialProofBanner proof={post.circleProof} />

        <div className="px-3.5 pt-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex min-w-0 gap-2.5">
              <button
                type="button"
                onClick={openUserProfile}
                className="shrink-0 active:scale-95"
              >
                {avatarUrl && !avatarBroken ? (
                  <ImageLoader
                    src={avatarUrl}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover ring-2"
                    wrapperClassName="h-10 w-10 rounded-full"
                    width={96}
                    style={{ "--tw-ring-color": "var(--imc-surface)" }}
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[16px] font-black"
                    style={{ background: INK, color: MARIGOLD }}
                  >
                    {getInitial(name)}
                  </div>
                )}
              </button>

              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openUserProfile}
                    className="min-w-0 text-left active:scale-[0.99]"
                  >
                    <h2 className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
                      {name}
                    </h2>
                  </button>

                  {isMe && (
                    <span className="text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                      · You
                    </span>
                  )}

                  {showFollowButton && (
                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={followLoading}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black text-white active:scale-95 disabled:opacity-60"
                      style={{ background: "#12141C" }}
                    >
                      <Plus size={11} strokeWidth={3} />
                      {followLoading ? "..." : "Follow"}
                    </button>
                  )}

                  {following && !isMe && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)", color: "#12141C" }}
                    >
                      <Check size={11} />
                      Following
                    </span>
                  )}

                  {type === "learning" && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                      style={{ background: "rgba(236,154,30,0.14)", color: MARIGOLD_DARK }}
                    >
                      Learning
                    </span>
                  )}

                  {type !== "learning" && purposeLabel ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                      style={{
                        background: "rgba(236,154,30,0.14)",
                        color: MARIGOLD_DARK,
                      }}
                    >
                      {purposeLabel}
                    </span>
                  ) : null}
                </div>

                <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  {occupation} • {formatTime(post.createdAt)}
                </p>
              </div>
            </div>

            <PostMenu
              post={post}
              type={type}
              isMine={isMe}
              onDeleted={() => setDeleted(true)}
            />
          </div>

          {post?.isRepostView && repostText && (
            <div
              className="mt-4 rounded-[18px] px-4 py-3"
              style={{ background: "rgba(67,56,202,0.06)" }}
            >
              <p className="text-[12px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                Your repost note
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
                {repostText}
              </p>
            </div>
          )}

          <div className="mt-2">
            <p
              className={`whitespace-pre-line text-[13.5px] leading-5 ${
                expanded ? "" : "line-clamp-4"
              }`}
              style={{ color: "var(--imc-text)" }}
            >
              {content}
            </p>

            {content.length > 180 && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-[12px] font-black"
                style={{ color: "var(--imc-text-muted)" }}
              >
                {expanded ? "show less" : "... more"}
              </button>
            )}
          </div>
        </div>

        <PostMedia media={media} onOpen={setActiveMediaIndex} />

        <div className="px-3.5 pt-2.5">
          {type === "learning" && post.title && (
            <div
              className="mb-3 rounded-[18px] p-3"
              style={{ border: "1px solid rgba(18,20,28,0.16)", background: "rgba(18,20,28,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={16} style={{ color: MARIGOLD_DARK }} />
                <p className="text-[12px] font-black" style={{ color: MARIGOLD_DARK }}>
                  {post.title}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[12px] font-black" style={{ color: MARIGOLD_DARK }}>
              {tag}
            </span>

            <button
              onClick={() => setShowViews(true)}
              className="flex items-center gap-1 text-[11px] font-bold"
              style={{ color: "var(--imc-text-muted)" }}
            >
              <Eye size={14} />
              {formatCount(impressions)} impressions
            </button>
          </div>

          <PostActions post={post} type={type} />
        </div>
      </article>

      {activeMedia && (
        <FullScreenReel onClose={() => setActiveMediaIndex(null)}>
          <PostReelSlide post={post} type={type} initialMediaIndex={activeMediaIndex} />
        </FullScreenReel>
      )}

      <ViewInfoSheet
        open={showViews}
        onClose={() => setShowViews(false)}
        title={type === "learning" ? "Learning Impressions" : "Post Impressions"}
      />
    </>
  );
}

function PostMedia({ media, onOpen }) {
  if (!media.length) return null;

  const visualMedia = media.filter((item) => item.type !== "audio");
  const audioMedia = media.filter((item) => item.type === "audio");

  return (
    <div className="mt-2 px-3.5">
      <VisualMediaGrid media={visualMedia} onOpen={onOpen} />
      {audioMedia.map((item) => (
        <VoiceNote key={item.url} item={item} />
      ))}
    </div>
  );
}

function VisualMediaGrid({ media, onOpen }) {
  if (!media.length) return null;

  if (media.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="block max-h-[260px] w-full overflow-hidden rounded-[14px]"
        style={{ background: "var(--imc-surface-2)" }}
      >
        {media[0].type === "video" ? (
          <LazyVideo src={media[0].url} controls className="w-full object-cover" />
        ) : (
          <ImageLoader
            src={media[0].url}
            alt="Post media"
            className="h-full w-full object-cover"
            wrapperClassName="aspect-[4/3] w-full"
            width={700}
          />
        )}
      </button>
    );
  }

  if (media.length === 2) {
    return (
      <div className="grid h-[220px] w-full grid-cols-2 gap-[2px] overflow-hidden rounded-[14px]" style={{ background: "var(--imc-surface-2)" }}>
        {media.map((item, index) => (
          <MediaButton key={item.url} item={item} index={index} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid h-[220px] w-full grid-cols-2 gap-[2px] overflow-hidden rounded-[14px]" style={{ background: "var(--imc-surface-2)" }}>
      <MediaButton item={media[0]} index={0} onOpen={onOpen} />
      <div className="grid grid-rows-2 gap-[2px]">
        <MediaButton item={media[1]} index={1} onOpen={onOpen} />
        <div className="grid grid-cols-2 gap-[2px]">
          <MediaButton item={media[2]} index={2} onOpen={onOpen} />
          <button
            type="button"
            onClick={() => onOpen(3)}
            className="relative h-full w-full overflow-hidden"
            style={{ background: "var(--imc-surface-2)" }}
          >
            {media[3]?.type === "video" ? (
              <LazyVideo
                src={media[3]?.url}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageLoader
                src={media[3]?.url}
                alt="Post media"
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
                width={700}
              />
            )}

            {media.length > 4 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[20px] font-black text-white">
                +{media.length - 4}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaButton({ item, index, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="h-full w-full overflow-hidden"
      style={{ background: "var(--imc-surface-2)" }}
    >
      {item.type === "video" ? (
        <LazyVideo src={item.url} className="h-full w-full object-cover" controls={false} />
      ) : (
        <ImageLoader
          src={item.url}
          alt="Post media"
          className="h-full w-full object-cover"
          wrapperClassName="h-full w-full"
          width={700}
        />
      )}
    </button>
  );
}

function VoiceNote({ item }) {
  return (
    <div
      className="mt-2 flex items-center gap-2 rounded-full px-3 py-2"
      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: "rgba(18,20,28,0.06)" }}
      >
        <Mic size={17} style={{ color: MARIGOLD_DARK }} />
      </span>
      <audio src={item.url} controls className="h-8 flex-1" />
    </div>
  );
}

export default memo(PostCard);
