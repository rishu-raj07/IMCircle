import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Send,
  UserPlus,
  Check,
  Flame,
  ArrowRight,
  Volume2,
  VolumeX,
} from "lucide-react";

import CommentSheet from "../../components/common/CommentSheet";
import RepostSheet from "../../components/common/RepostSheet";
import ImageLoader from "../../components/common/ImageLoader";

import {
  likeMilestone,
  unlikeMilestone,
  repostMilestone,
  shareMilestone,
  commentMilestone,
  getMilestoneComments,
  saveMilestone,
  unsaveMilestone,
  followJourney,
  unfollowJourney,
} from "../../api/journeyApi";
// Following the journey (its update feed) is a different action from
// following the creator's account — same distinction JourneyCard.jsx makes,
// so this slide needs both, not one button doing double duty.
import { followUserById, unfollowUserById } from "../../api/userApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const INK = "#12141C";

function formatCount(num = 0) {
  const value = Number(num) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value;
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "Builder";
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

function getImageUrl(image) {
  if (!image) return "";

  const url =
    typeof image === "string"
      ? image
      : image?.url || image?.secure_url || image?.path || "";

  return normalizeImageUrl(url);
}

// Milestones can carry either a photo or a short video — the backend tags
// each upload with `type` (via Cloudinary's `resource_type: "auto"`), but we
// also sniff the URL extension as a fallback for older records that predate
// the field.
function getMediaType(image) {
  if (!image) return "image";

  if (typeof image === "object" && image.type === "video") return "video";

  const url =
    typeof image === "string" ? image : image?.url || image?.secure_url || "";

  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}

function getStoredUser() {
  const keys = ["user", "authUser", "currentUser", "bn_user"];

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

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString?.() || value?.id?.toString?.() || "";
}

function JourneyReelSlide({ milestone = {} }) {
  const navigate = useNavigate();
  const creator = milestone.creator || {};
  const journey = milestone.journey || {};

  const milestoneId = getId(milestone);
  const journeyId = getId(journey) || getId(milestone.journey);

  const loggedInUser = getStoredUser();
  const loggedInUserId = getId(loggedInUser);
  const creatorId = getId(creator);
  const journeyCreatorId = getId(journey?.creator);

  const isOwnJourney =
    (loggedInUserId && creatorId && loggedInUserId === creatorId) ||
    (loggedInUserId && journeyCreatorId && loggedInUserId === journeyCreatorId);

  const finalName = getName(creator);
  const avatar = getAvatar(creator);

  const finalTitle = journey.title || milestone.title || "Journey";
  const finalDay = milestone.day || milestone.milestoneDay || 1;

  const finalText =
    milestone.content ||
    milestone.text ||
    milestone.description ||
    "Shared a new journey update.";

  const creatorTagline = (creator?.headline || "").trim();
  const journeyAbout = (journey?.description || "").trim();

  const targetDays =
    journey.targetDays || journey.totalDays || milestone.targetDays || 100;

  const progress = Math.min(
    Math.round((Number(finalDay) / Number(targetDays)) * 100),
    100
  );

  const firstMedia = milestone.images?.[0];
  const bgImage = getImageUrl(firstMedia) || normalizeImageUrl(journey.coverImage);
  const mediaType = firstMedia ? getMediaType(firstMedia) : "image";

  const slideRef = useRef(null);
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  // The discover feed renders every slide at once inside one scroll
  // container (snap-scroll, not virtualized), so without this every video
  // on the page would autoplay simultaneously. Only play the slide that's
  // actually in view, like a real reels feed.
  useEffect(() => {
    if (mediaType !== "video") return;

    const videoEl = videoRef.current;
    const slideEl = slideRef.current;
    if (!videoEl || !slideEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(slideEl);
    return () => observer.disconnect();
  }, [mediaType]);

  const [likes, setLikes] = useState(
    milestone.likesCount || milestone.likes?.length || 0
  );
  const [replies, setReplies] = useState(
    milestone.repliesCount || milestone.commentsCount || 0
  );
  const [reposts, setReposts] = useState(
    milestone.repostsCount || milestone.reposts?.length || 0
  );
  const [saves, setSaves] = useState(
    milestone.savesCount || milestone.saves?.length || 0
  );

  const [liked, setLiked] = useState(Boolean(milestone.likedByMe));
  const [reposted, setReposted] = useState(Boolean(milestone.repostedByMe));
  const [saved, setSaved] = useState(Boolean(milestone.savedByMe));
  const [following, setFollowing] = useState(Boolean(journey.followedByMe));
  const [userFollowing, setUserFollowing] = useState(
    Boolean(
      milestone.isFollowing || milestone.followedByMe || creator?.isFollowing
    )
  );
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);

  const handleLike = async () => {
    if (!milestoneId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    try {
      if (nextLiked) await likeMilestone(milestoneId);
      else await unlikeMilestone(milestoneId);
    } catch {
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(nextLiked ? prev - 1 : prev + 1, 0));
    }
  };

  const handleFollow = async () => {
    if (!journeyId || isOwnJourney) return;

    const nextFollowing = !following;
    setFollowing(nextFollowing);

    try {
      if (nextFollowing) await followJourney(journeyId);
      else await unfollowJourney(journeyId);
    } catch (error) {
      setFollowing(!nextFollowing);
      alert(error?.response?.data?.message || "Failed to update follow");
    }
  };

  const handleFollowUser = async () => {
    if (!creatorId || isOwnJourney) return;

    const nextFollowing = !userFollowing;
    setUserFollowing(nextFollowing);

    try {
      if (nextFollowing) await followUserById(creatorId);
      else await unfollowUserById(creatorId);
    } catch (error) {
      setUserFollowing(!nextFollowing);
      alert(error?.response?.data?.message || "Failed to update follow");
    }
  };

  const handleSave = async () => {
    if (!milestoneId) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(nextSaved ? prev + 1 : prev - 1, 0));

    try {
      if (nextSaved) await saveMilestone(milestoneId);
      else await unsaveMilestone(milestoneId);
    } catch {
      setSaved(!nextSaved);
      setSaves((prev) => Math.max(nextSaved ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRepost = async (caption = "") => {
    if (!milestoneId) return;

    const nextReposted = !reposted;
    setReposted(nextReposted);
    setReposts((prev) => Math.max(nextReposted ? prev + 1 : prev - 1, 0));

    try {
      const data = await repostMilestone(
        milestoneId,
        nextReposted ? caption : ""
      );

      if (typeof data.repostedByMe === "boolean") setReposted(data.repostedByMe);
      if (typeof data.repostsCount === "number") setReposts(data.repostsCount);

      setShowRepost(false);
    } catch {
      setReposted(!nextReposted);
      setReposts((prev) => Math.max(nextReposted ? prev - 1 : prev + 1, 0));
    }
  };

  const handleShare = async () => {
    if (!milestoneId) return;

    try {
      await shareMilestone(milestoneId);

      if (navigator.share) {
        await navigator.share({
          title: finalTitle,
          text: finalText,
          url: window.location.href,
        });
      }
    } catch {
      // silent
    }
  };

  const openCreatorProfile = () => {
    if (loggedInUserId && creatorId && loggedInUserId === creatorId) {
      navigate("/profile");
      return;
    }

    if (creator?.username) {
      navigate(`/profile/${creator.username}`);
      return;
    }

    if (creatorId) {
      navigate(`/profile/user/${creatorId}`);
    }
  };

  const handleViewJourney = () => {
    if (journeyId) navigate(`/journey/${journeyId}`);
  };

  return (
    <div
      ref={slideRef}
      className="relative h-full w-full shrink-0 snap-start overflow-hidden"
      style={{ background: INK }}
    >
      {/* Image now fills nearly the whole slide — a small gap on every side
          (top clears the fixed header, the rest is a thin breathing margin)
          instead of the old large top/side insets, which wasted space now
          that the journey tag/title/day-ring no longer sit on top of it
          (that content moved down into the bottom info panel below). */}
      {bgImage ? (
        mediaType === "video" ? (
          <video
            ref={videoRef}
            src={bgImage}
            className="absolute inset-x-2 top-[58px] bottom-[222px] z-0 m-auto max-h-[calc(100%-280px)] max-w-[calc(100%-16px)] rounded-[18px] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.36)]"
            loop
            muted={muted}
            playsInline
            preload="metadata"
          />
        ) : (
          <ImageLoader
            src={bgImage}
            alt="Journey progress"
            width={900}
            wrapperClassName="absolute inset-x-2 top-[58px] bottom-[222px] z-0 m-auto max-h-[calc(100%-280px)] max-w-[calc(100%-16px)] rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.36)]"
            className="h-full w-full object-contain"
          />
        )
      ) : (
        <div className="imc-lattice absolute inset-0" style={{ background: INK }} />
      )}

      {mediaType === "video" && bgImage && (
        <button
          type="button"
          onClick={() => setMuted((prev) => !prev)}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute right-3 z-[5] grid h-9 w-9 place-items-center rounded-full active:scale-95"
          style={{ top: 68, background: "rgba(18,20,28,0.5)", backdropFilter: "blur(6px)", color: "#fff" }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(18,20,28,0.65) 0%, rgba(18,20,28,0.02) 22%, rgba(18,20,28,0.02) 55%, rgba(18,20,28,0.9) 100%)",
        }}
      />

      {/* Right action rail */}
      <div className="absolute right-3 flex flex-col items-center gap-4" style={{ bottom: 160 }}>
        <RailAction icon={Heart} count={likes} active={liked} onClick={handleLike} />
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

      {/* Bottom overlay — creator row (name + account Follow + tagline)
          first, then the journey row (name + about + Follow Journey) below
          it, per the requested order, followed by the update caption and
          progress. */}
      <div className="absolute inset-x-3" style={{ bottom: 20 }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openCreatorProfile} className="shrink-0 active:scale-95">
            <div className="relative h-9 w-9 shrink-0 rounded-full bg-white p-[1.5px]">
              <div className="grid h-full w-full place-items-center overflow-hidden rounded-full p-[1.5px]" style={{ background: INK }}>
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full text-[11px] font-black" style={{ background: INK, color: "#fff" }}>
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
                    finalName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={openCreatorProfile} className="min-w-0 active:scale-[0.98]">
                <span className="truncate text-[13px] font-black text-white">{finalName}</span>
              </button>

              {/* Follows the CREATOR's account — distinct from the "Follow
                  Journey" button on the journey row below. */}
              {!isOwnJourney && (
                <button
                  onClick={handleFollowUser}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black active:scale-95"
                  style={
                    userFollowing
                      ? { background: "rgba(255,255,255,0.16)", color: "#fff" }
                      : { background: "#fff", color: INK }
                  }
                >
                  <span className="flex items-center gap-1">
                    {userFollowing ? <Check size={11} /> : <UserPlus size={11} />}
                    {userFollowing ? "Following" : "Follow"}
                  </span>
                </button>
              )}
            </div>

            {creatorTagline && (
              <p className="truncate text-[11px] font-semibold text-white/55">
                {creatorTagline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <Flame size={11} style={{ color: "#EC9A1E" }} />
            <span className="truncate text-[11px] font-black text-white">
              {finalTitle}
            </span>
          </span>

          {/* Follows the journey's own update feed — shown any time the
              viewer hasn't already followed it, independent of whether they
              follow the creator's account above. */}
          {!isOwnJourney && (
            <button
              onClick={handleFollow}
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black active:scale-95"
              style={
                following
                  ? { background: "rgba(255,255,255,0.16)", color: "#fff" }
                  : { background: "#4338CA", color: "#fff" }
              }
            >
              <span className="flex items-center gap-1">
                {following ? <Check size={10} /> : <UserPlus size={10} />}
                {following ? "Following" : "Follow Journey"}
              </span>
            </button>
          )}
        </div>

        {journeyAbout && (
          <p className="mt-1 line-clamp-2 text-[11.5px] font-semibold leading-4 text-white/65">
            {journeyAbout}
          </p>
        )}

        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/90">
          {finalText}
        </p>

        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-[10px] font-extrabold text-white/60">
            Day {finalDay} of {targetDays} · {progress}%
          </p>

          <button
            onClick={handleViewJourney}
            className="flex items-center gap-1 text-[11px] font-black active:scale-95"
            style={{ color: "#fff" }}
          >
            View journey
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.18)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: "#fff" }}
          />
        </div>
      </div>

      <CommentSheet
        open={showReplies}
        onClose={() => setShowReplies(false)}
        title="Journey replies"
        subtitle={`${formatCount(replies)} ${replies === 1 ? "reply" : "replies"}`}
        inputPlaceholder="Write a reply..."
        emptyTitle="No replies yet"
        emptySubtitle="Start the journey conversation."
        loadComments={() => getMilestoneComments(milestoneId)}
        addComment={(text) => commentMilestone(milestoneId, text)}
        onCommentAdded={() => setReplies((prev) => prev + 1)}
      />

      <RepostSheet
        open={showRepost}
        onClose={() => setShowRepost(false)}
        title="Repost Journey"
        previewTitle={finalTitle}
        previewText={finalText}
        onRepost={() => handleRepost("")}
        onRepostWithThought={(thought) => handleRepost(thought)}
      />
    </div>
  );
}

function RailAction({ icon: Icon, count, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90">
      <span
        className="grid h-11 w-11 place-items-center rounded-full border"
        style={{
          borderColor: active ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.14)",
          background: active ? "rgba(255,255,255,0.24)" : "rgba(18,20,28,0.58)",
          backdropFilter: "blur(8px)",
          color: "#fff",
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

export default JourneyReelSlide;
