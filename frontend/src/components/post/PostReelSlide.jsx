import { useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Send,
  UserPlus,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import CommentSheet from "../common/CommentSheet";
import RepostSheet from "../common/RepostSheet";
import ImageLoader from "../common/ImageLoader";
import { getGenderAvatarIcon } from "../../utils/avatar";

import {
  likePost,
  repostPost,
  sharePost,
  savePost,
  commentOnPost,
  getPostComments,
} from "../../api/postApi";
import {
  likeLearning,
  unlikeLearning,
  repostLearning,
  saveLearning,
  unsaveLearning,
  commentLearning,
  getLearningComments,
} from "../../api/learningApi";
import { followUserById } from "../../api/userApi";
import { trackEvent } from "../../utils/analyticsTracker";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const INK = "#12141C";

function formatCount(num = 0) {
  const value = Number(num) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value;
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "IMCircle Builder";
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getAvatar(user) {
  if (!user) return "";

  const avatar =
    user?.avatar?.url ||
    user?.avatar?.secure_url ||
    user?.profilePicture?.url ||
    user?.profilePicture?.secure_url ||
    user?.profileImage?.url ||
    user?.profileImage?.secure_url ||
    user?.photo?.url ||
    user?.photo?.secure_url ||
    user?.photoURL ||
    user?.picture ||
    (typeof user?.avatar === "string" ? user.avatar : "") ||
    (typeof user?.profilePicture === "string" ? user.profilePicture : "") ||
    (typeof user?.profileImage === "string" ? user.profileImage : "");

  return normalizeImageUrl(avatar);
}

function getMediaItems(post) {
  if (!Array.isArray(post?.media)) return [];

  return post.media
    .map((item) => ({
      url: normalizeImageUrl(
        item?.url || item?.secure_url || item?.path || item
      ),
      type: item?.type || "image",
    }))
    .filter((item) => item.url && item.type !== "audio");
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString?.() || value?.id?.toString?.() || "";
}

function getStoredUser() {
  const keys = ["user", "bharat_user", "authUser", "currentUser"];

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);
      return parsed?.user || parsed?.data?.user || parsed?.data || parsed;
    } catch {
      // ignore
    }
  }

  return null;
}

// Full-screen, single-item counterpart to the reel-style view journeys
// already get (JourneyReelSlide). Self-contained like that component — it
// carries its own like/comment/repost/save state and hits the API directly
// — so it can be dropped in wherever a post/learning card wants to open its
// image "fully" without needing a route, a fetch, or a parent-managed feed.
function PostReelSlide({ post = {}, type = "post", initialMediaIndex = 0 }) {
  const navigate = useNavigate();
  const author = post.author || post.creator || post.user || {};

  const loggedInUser = getStoredUser();
  const loggedInUserId = getId(loggedInUser);
  const authorId = getId(author);

  const isMe =
    post.isMine === true ||
    post.isOwn === true ||
    post.isMe === true ||
    author?.isMe === true ||
    (authorId && loggedInUserId && authorId === loggedInUserId);

  const finalName = getName(author);
  const avatar = getAvatar(author);
  const tagline = (author?.headline || "").trim();

  const finalText =
    post.content || post.description || post.text || "Shared an update.";

  const media = getMediaItems(post);
  const [mediaIndex, setMediaIndex] = useState(
    Math.min(Math.max(initialMediaIndex || 0, 0), Math.max(media.length - 1, 0))
  );
  const activeMedia = media[mediaIndex];

  const [likes, setLikes] = useState(
    post.likesCount || post.likes?.length || 0
  );
  const [replies, setReplies] = useState(
    post.repliesCount || post.commentsCount || post.comments?.length || 0
  );
  const [reposts, setReposts] = useState(
    post.repostsCount || post.reposts?.length || 0
  );
  const [saves, setSaves] = useState(post.savesCount || post.saves?.length || 0);

  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [reposted, setReposted] = useState(Boolean(post.repostedByMe));
  const [saved, setSaved] = useState(Boolean(post.savedByMe));
  const [following, setFollowing] = useState(
    Boolean(
      author?.isFollowing === true ||
        post?.isFollowing === true ||
        post?.followedByMe === true
    )
  );
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);

  // Double-tap-to-like (Instagram convention): tapping the media twice
  // quickly always shows the heart pop, but only ever LIKES — never
  // unlikes — even if the second tap lands after the post was already
  // liked. lastTapRef tracks the timestamp of the previous tap so we can
  // tell a real double-tap apart from two unrelated single taps.
  const lastTapRef = useRef(0);
  const heartPopTimeoutRef = useRef(null);
  const [heartPop, setHeartPop] = useState(false);

  const handleLike = async () => {
    if (!post?._id) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    if (nextLiked) {
      trackEvent("like", { entityType: type, entityId: post._id }).catch(() => {});
    }

    try {
      if (type === "learning") {
        const data = nextLiked
          ? await likeLearning(post._id)
          : await unlikeLearning(post._id);

        if (typeof data.likesCount === "number") setLikes(data.likesCount);
        if (typeof data.likedByMe === "boolean") setLiked(data.likedByMe);
      } else {
        const data = await likePost(post._id);
        if (typeof data.likesCount === "number") setLikes(data.likesCount);
        if (typeof data.likedByMe === "boolean") setLiked(data.likedByMe);
      }
    } catch {
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(nextLiked ? prev - 1 : prev + 1, 0));
    }
  };

  const showHeartPop = () => {
    setHeartPop(true);
    if (heartPopTimeoutRef.current) clearTimeout(heartPopTimeoutRef.current);
    heartPopTimeoutRef.current = window.setTimeout(() => setHeartPop(false), 700);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (!isDoubleTap) return;

    showHeartPop();
    if (!liked) handleLike();
  };

  const handleSave = async () => {
    if (!post?._id) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(nextSaved ? prev + 1 : prev - 1, 0));

    if (nextSaved) {
      trackEvent("save", { entityType: type, entityId: post._id }).catch(() => {});
    }

    try {
      if (type === "learning") {
        const data = nextSaved
          ? await saveLearning(post._id)
          : await unsaveLearning(post._id);
        if (typeof data.savesCount === "number") setSaves(data.savesCount);
      } else {
        const data = await savePost(post._id);
        if (typeof data.savesCount === "number") setSaves(data.savesCount);
      }
    } catch {
      setSaved(!nextSaved);
      setSaves((prev) => Math.max(nextSaved ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRepost = async (thought = "") => {
    if (!post?._id) return;

    const nextReposted = !reposted || Boolean(thought);
    setReposted(nextReposted);
    setReposts((prev) => Math.max(nextReposted ? prev + 1 : prev - 1, 0));

    if (nextReposted) {
      trackEvent("repost", {
        entityType: type,
        entityId: post._id,
        metadata: { withThought: Boolean(thought) },
      }).catch(() => {});
    }

    try {
      const data =
        type === "learning"
          ? await repostLearning(post._id, thought)
          : await repostPost(post._id, {
              text: thought,
              repostText: thought,
              caption: thought,
              quote: thought,
            });

      if (typeof data.repostsCount === "number") setReposts(data.repostsCount);
      if (typeof data.reposted === "boolean") setReposted(data.reposted);

      setShowRepost(false);
    } catch {
      setReposted(!nextReposted);
      setReposts((prev) => Math.max(nextReposted ? prev - 1 : prev + 1, 0));
    }
  };

  const handleShare = async () => {
    if (!post?._id) return;

    trackEvent("share", { entityType: type, entityId: post._id }).catch(() => {});

    try {
      if (type === "post") await sharePost(post._id);

      if (navigator.share) {
        await navigator.share({
          title: "IMCircle",
          text: finalText,
          url: window.location.href,
        });
      }
    } catch {
      // silent
    }
  };

  const handleFollow = async () => {
    if (!authorId || isMe || following) return;

    setFollowing(true);

    try {
      await followUserById(authorId);
      trackEvent("follow", { entityType: "user", entityId: authorId }).catch(() => {});
    } catch {
      setFollowing(false);
    }
  };

  const openAuthorProfile = () => {
    if (isMe) {
      navigate("/profile");
      return;
    }

    if (author?.username) {
      navigate(`/profile/${author.username}`);
      return;
    }

    if (authorId) {
      navigate(`/profile/user/${authorId}`);
    }
  };

  const loadReplies = async () => {
    if (!post?._id) return { comments: [] };
    return type === "learning" ? getLearningComments(post._id) : getPostComments(post._id);
  };

  const addReply = async (text) => {
    if (!post?._id) return null;
    trackEvent("comment", { entityType: type, entityId: post._id }).catch(() => {});
    return type === "learning" ? commentLearning(post._id, text) : commentOnPost(post._id, text);
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--imc-bg)" }}>
      {/* Full-bleed like Instagram/TikTok stories — the photo fills the
          entire slide edge to edge (cropped to fit, not letterboxed), with
          the rail/caption floating on top. Used to sit inset with big
          margins and `object-contain`, which mostly worked on a dark
          canvas (the empty margin just read as "background"), but on a
          light canvas the same gap looked like an unfinished page. */}
      {activeMedia ? (
        <ImageLoader
          src={activeMedia.url}
          alt="Post media"
          width={900}
          wrapperClassName="absolute inset-0 z-0"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="max-w-[80%] px-4 text-center text-[15px] font-semibold leading-6" style={{ color: "var(--imc-text-muted)" }}>
            {finalText}
          </p>
        </div>
      )}

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setMediaIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))
            }
            className="absolute left-2 top-1/2 z-[5] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full active:scale-90"
            style={{ background: "rgba(18,20,28,0.5)", color: "#fff" }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() =>
              setMediaIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))
            }
            className="absolute right-2 top-1/2 z-[5] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full active:scale-90"
            style={{ background: "rgba(18,20,28,0.5)", color: "#fff" }}
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute left-1/2 top-[68px] z-[5] flex -translate-x-1/2 gap-1">
            {media.map((_, index) => (
              <span
                key={index}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background:
                    index === mediaIndex ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Also doubles as the double-tap-to-like hit area — it already
          covers the full slide and sits above the media in DOM order, so
          it's the topmost element under the rail/caption (which come after
          it and correctly still receive their own taps). */}
      {/* This scrim sits directly on top of the user's photo, not the app's
          own chrome — following the app's light/dark theme here meant a
          WHITE gradient washed out every photo in light mode ("white shade"
          over the image). Photos are unpredictable in brightness regardless
          of app theme, so — like RailAction below — this stays a fixed dark
          vignette (Instagram/TikTok convention), with the caption/name text
          below staying fixed light to match. */}
      <div
        onClick={handleMediaTap}
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(18,20,28,0.65) 0%, rgba(18,20,28,0.02) 22%, rgba(18,20,28,0.02) 55%, rgba(18,20,28,0.9) 100%)",
        }}
      />

      <AnimatePresence>
        {heartPop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center"
          >
            <Heart size={92} color="#fff" fill="#E11D48" strokeWidth={1.5} style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.35))" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute right-3 flex flex-col items-center gap-4" style={{ bottom: 130 }}>
        <RailAction icon={Heart} count={likes} active={liked} onClick={handleLike} variant="like" />
        <RailAction icon={MessageCircle} count={replies} onClick={() => setShowReplies(true)} />
        <RailAction
          icon={Repeat2}
          count={reposts}
          active={reposted}
          onClick={() => {
            if (reposted) handleRepost("");
            else setShowRepost(true);
          }}
        />
        <RailAction icon={Bookmark} count={saves} active={saved} onClick={handleSave} />
        <RailAction icon={Send} onClick={handleShare} />
      </div>

      {/* Bottom overlay — author row, then caption. */}
      <div className="absolute inset-x-3" style={{ bottom: 20 }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openAuthorProfile} className="shrink-0 active:scale-95">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full text-[11px] font-black" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.35)" }}>
              {avatar && !avatarBroken ? (
                <ImageLoader
                  src={avatar}
                  alt={finalName}
                  eager
                  width={96}
                  wrapperClassName="h-full w-full rounded-full"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <img
                  src={getGenderAvatarIcon(author)}
                  alt={finalName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={openAuthorProfile} className="min-w-0 active:scale-[0.98]">
                <span className="truncate text-[13px] font-black text-white">{finalName}</span>
              </button>

              {!isMe && !following && (
                <button
                  onClick={handleFollow}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black active:scale-95"
                  style={{ background: "#fff", color: INK }}
                >
                  <span className="flex items-center gap-1">
                    <UserPlus size={11} />
                    Follow
                  </span>
                </button>
              )}

              {!isMe && following && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black text-white"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <Check size={11} />
                  Following
                </span>
              )}
            </div>

            {tagline && (
              <p className="truncate text-[11px] font-semibold text-white/75">{tagline}</p>
            )}
          </div>
        </div>

        {activeMedia && (
          <p className="mt-2.5 line-clamp-3 text-[13px] font-semibold leading-5 text-white">
            {finalText}
          </p>
        )}
      </div>

      <CommentSheet
        open={showReplies}
        onClose={() => setShowReplies(false)}
        title="Join conversation"
        subtitle={`${formatCount(replies)} ${replies === 1 ? "reply" : "replies"}`}
        inputPlaceholder="Write a reply..."
        emptyTitle="No replies yet"
        emptySubtitle="Start the conversation with your reply."
        loadComments={loadReplies}
        addComment={addReply}
        onCommentAdded={() => setReplies((prev) => prev + 1)}
      />

      <RepostSheet
        open={showRepost}
        onClose={() => setShowRepost(false)}
        title={type === "learning" ? "Repost Learning" : "Repost Post"}
        previewTitle={post.title || "IMCircle update"}
        previewText={finalText}
        onRepost={() => handleRepost("")}
        onRepostWithThought={(thought) => handleRepost(thought)}
      />
    </div>
  );
}

// This rail floats directly over the media itself, so — unlike the rest of
// this slide — it deliberately stays a fixed dark-glass chip regardless of
// the app's light/dark theme (a photo's own brightness is unpredictable
// either way, so a theme-following chip could just as easily land on top
// of a bright photo in "dark mode" or a dark photo in "light mode"; a
// consistent dark-glass treatment reads reliably against any image).
// `variant="like"` is the one exception: an active heart turns red like
// everywhere else in the app, not just a lighter-glass circle.
function RailAction({ icon: Icon, count, active, onClick, variant }) {
  const isLike = variant === "like";

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90">
      <span
        className="grid h-11 w-11 place-items-center rounded-full border"
        style={{
          borderColor: active ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.14)",
          background: active ? "rgba(255,255,255,0.24)" : "rgba(18,20,28,0.58)",
          backdropFilter: "blur(8px)",
          color: active && isLike ? "#E11D48" : "#fff",
        }}
      >
        <Icon size={20} fill={active ? "currentColor" : "none"} />
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] font-black text-white">{formatCount(count)}</span>
      )}
    </button>
  );
}

export default PostReelSlide;
