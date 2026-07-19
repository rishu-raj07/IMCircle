import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  MessageCirclePlus,
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
import { AnimatePresence, motion } from "framer-motion";

import CommentSheet from "../../components/common/CommentSheet";
import RepostSheet from "../../components/common/RepostSheet";
import ImageLoader from "../../components/common/ImageLoader";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getJourneyCoverIcon } from "../../utils/media";

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

// Username, no "@" — same convention as every other card in the app
// (PostCard/JourneyCard show username instead of display name).
function getUsername(user) {
  return user?.username || user?.fullName || user?.name || "Builder";
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
  // Portrait/near-square media fills the whole slide edge-to-edge (like an
  // Instagram/TikTok story — that's what a phone screen naturally is).
  // Genuinely landscape media does NOT get force-cropped to fill a portrait
  // screen anymore — it's shown whole (object-contain, letterboxed) so nothing
  // is cropped; seeing it large means turning the phone to landscape, same as
  // Instagram does for widescreen photos/video instead of always cropping.
  const [mediaRatio, setMediaRatio] = useState(null);
  const isLandscapeMedia = Boolean(mediaRatio && mediaRatio > 1.05);

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
      milestone.creatorFollowedByMe ||
        milestone.isFollowing ||
        creator?.isFollowing ||
        creator?.followedByMe
    )
  );
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    setFollowing(Boolean(journey.followedByMe));
  }, [journeyId, journey.followedByMe]);

  useEffect(() => {
    setUserFollowing(
      Boolean(
        milestone.creatorFollowedByMe ||
          milestone.isFollowing ||
          creator?.isFollowing ||
          creator?.followedByMe
      )
    );
  }, [creatorId, milestone.creatorFollowedByMe, milestone.isFollowing, creator?.isFollowing, creator?.followedByMe]);

  useEffect(() => {
    const syncUserFollow = (event) => {
      if (String(event.detail?.userId || "") === creatorId) {
        setUserFollowing(Boolean(event.detail?.following));
      }
    };
    const syncJourneyFollow = (event) => {
      if (String(event.detail?.journeyId || "") === journeyId) {
        setFollowing(Boolean(event.detail?.following));
      }
    };

    window.addEventListener("imcircle:user-follow-changed", syncUserFollow);
    window.addEventListener("imcircle:journey-follow-changed", syncJourneyFollow);
    return () => {
      window.removeEventListener("imcircle:user-follow-changed", syncUserFollow);
      window.removeEventListener("imcircle:journey-follow-changed", syncJourneyFollow);
    };
  }, [creatorId, journeyId]);

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);

  // Double-tap-to-like (Instagram convention) — see PostReelSlide.jsx for
  // the identical pattern. Always pops the heart; only ever likes, never
  // unlikes, no matter how many extra taps land after it's already liked.
  const lastTapRef = useRef(0);
  const heartPopTimeoutRef = useRef(null);
  const [heartPop, setHeartPop] = useState(false);

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

  const handleFollow = async () => {
    if (!journeyId || isOwnJourney) return;

    const nextFollowing = !following;
    setFollowing(nextFollowing);

    try {
      if (nextFollowing) await followJourney(journeyId);
      else await unfollowJourney(journeyId);
      window.dispatchEvent(new CustomEvent("imcircle:journey-follow-changed", {
        detail: { journeyId, following: nextFollowing },
      }));
    } catch {
      setFollowing(!nextFollowing);
      alert("Couldn't update this journey. Please try again.");
    }
  };

  const handleFollowUser = async () => {
    if (!creatorId || isOwnJourney) return;

    const nextFollowing = !userFollowing;
    setUserFollowing(nextFollowing);

    try {
      if (nextFollowing) await followUserById(creatorId);
      else await unfollowUserById(creatorId);
      window.dispatchEvent(new CustomEvent("imcircle:user-follow-changed", {
        detail: { userId: creatorId, following: nextFollowing },
      }));
    } catch {
      setUserFollowing(!nextFollowing);
      alert("Couldn't update this follow. Please try again.");
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
      style={{ background: "var(--imc-bg)" }}
    >
      {/* Portrait fills the slide edge-to-edge; landscape is shown whole
          (contain, letterboxed) instead of being force-cropped to fit a
          portrait screen — see mediaRatio/isLandscapeMedia above. */}
      {bgImage ? (
        mediaType === "video" ? (
          <video
            ref={videoRef}
            src={bgImage}
            className={`absolute inset-0 z-0 h-full w-full ${isLandscapeMedia ? "object-contain" : "object-cover"}`}
            style={isLandscapeMedia ? { background: "#000" } : undefined}
            loop
            muted={muted}
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.target;
              if (videoWidth && videoHeight) setMediaRatio(videoWidth / videoHeight);
            }}
          />
        ) : (
          <img
            src={bgImage}
            alt="Journey progress"
            className={`absolute inset-0 z-0 h-full w-full ${isLandscapeMedia ? "object-contain" : "object-cover"}`}
            style={isLandscapeMedia ? { background: "#000" } : undefined}
            loading="eager"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.target;
              if (naturalWidth && naturalHeight) setMediaRatio(naturalWidth / naturalHeight);
            }}
          />
        )
      ) : (
        <div className="imc-lattice absolute inset-0" style={{ background: "var(--imc-bg)" }}>
          <img
            src={getJourneyCoverIcon()}
            alt=""
            className="absolute inset-0 m-auto h-32 w-32 rounded-full object-cover opacity-90"
          />
        </div>
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

      {/* Also doubles as the double-tap-to-like hit area. This scrim sits
          directly on the user's photo, not the app's own chrome — a
          theme-following white gradient washed every photo out in light
          mode, so like RailAction below, it stays a fixed dark vignette
          (Instagram/TikTok convention) regardless of app theme, with the
          caption/name text below staying fixed light to match. */}
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
      <div className="absolute right-3 flex flex-col items-center gap-4" style={{ bottom: 110 }}>
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

      {/* Bottom overlay — creator row (name + account Follow + tagline)
          first, then the journey row (name + about + Follow Journey) below
          it, per the requested order, followed by the update caption and
          progress. */}
      {/* `20px` alone didn't account for the gesture-nav/home-indicator
          strip on modern phones (env(safe-area-inset-bottom)) — on devices
          where that's non-zero, the lowest rows in this block (the
          Day X of Y / View journey row + progress bar) rendered partially
          or fully behind/under it, which is what showed up as "the lower
          text won't show". */}
      <div className="absolute inset-x-3" style={{ bottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openCreatorProfile} className="shrink-0 active:scale-95">
            <div className="relative h-9 w-9 shrink-0 rounded-full bg-white p-[1.5px]">
              <div className="grid h-full w-full place-items-center overflow-hidden rounded-full p-[1.5px]" style={{ background: "var(--imc-bg)" }}>
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full text-[11px] font-black" style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
                  {avatar && !avatarBroken ? (
                    <ImageLoader
                      src={avatar}
                      alt={finalName}
                      eager
                      width={96}
                      variant="avatar"
                      wrapperClassName="h-full w-full rounded-full"
                      className="h-full w-full object-cover"
                      // Without this, ImageLoader's own loading/failed state
                      // shows a plain generic UserRound icon instead of the
                      // gender-appropriate fallback, which is what actually
                      // made the avatar look "not visible" — this is the
                      // real fix, in addition to the outer avatarBroken swap
                      // below for when there's no avatar URL at all.
                      fallbackSrc={getGenderAvatarIcon(creator)}
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : (
                    <img
                      src={getGenderAvatarIcon(creator)}
                      alt={finalName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={openCreatorProfile} className="min-w-0 active:scale-[0.98]">
                <span className="truncate text-[13px] font-semibold text-white">{getUsername(creator)}</span>
              </button>

              {/* Follows the CREATOR's account — distinct from the "Follow
                  Journey" button on the journey row below. */}
              {!isOwnJourney && (
                <button
                  onClick={handleFollowUser}
                  className="h-8 shrink-0 rounded-full border border-white/35 px-3 text-[10px] font-bold text-white active:scale-95"
                  style={
                    userFollowing
                      ? { background: "rgba(255,255,255,0.16)" }
                      : { background: "rgba(0,0,0,0.20)" }
                  }
                >
                  <span className="flex items-center gap-1">
                    {userFollowing ? <Check size={11} /> : <UserPlus size={11} />}
                    {userFollowing ? "Following" : "Follow"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* pl-11 = avatar width (h-9 = 36px) + the gap-2 next to it (8px)
            above, so this row's text starts directly under the username
            instead of flush with the screen edge — the two rows read as one
            aligned block instead of a jagged left edge.

            The journey title used to share this row with the Follow
            Journey button — on a long title ("Weight loss journey-21 days
            challenge") there wasn't enough room left for the button even
            with truncate + whitespace-nowrap, so it visibly squashed. Title
            now gets the row entirely to itself so it can truncate freely
            with zero pressure from anything sharing the line. */}
        <div className="mt-1.5 flex min-w-0 items-center gap-1 pl-11">
          <Flame size={12} className="shrink-0" style={{ color: "#EC9A1E" }} />
          <span className="min-w-0 truncate text-[12px] font-semibold text-white/90">
            {finalTitle}
          </span>
        </div>

        {/* Action row — Follow Journey and the new Add Thought button live
            here together, now that the title isn't sharing space with
            anything. Both are shrink-0 + whitespace-nowrap so neither can
            ever collapse regardless of label length. */}
        <div className="mt-2 flex min-w-0 items-center gap-2 pl-11">
          {!isOwnJourney && (
            <button
              onClick={handleFollow}
              className="h-8 shrink-0 whitespace-nowrap rounded-full border border-white/35 px-3 text-[10px] font-bold text-white active:scale-95"
              style={
                following
                  ? { background: "rgba(255,255,255,0.16)" }
                  : { background: "rgba(0,0,0,0.20)" }
              }
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                {following ? <Check size={11} /> : <UserPlus size={11} />}
                {following ? "Following" : "Follow Journey"}
              </span>
            </button>
          )}

          {/* Opens the same comment sheet the message-circle rail icon
              does — a second, more inviting entry point for leaving a
              reply, worded to match what you're actually doing here
              ("adding a thought" on someone's journey update) rather than
              the generic "Reply". flex-1 (instead of shrink-0) so it fills
              whatever width Follow Journey doesn't use — and when there's
              no Follow Journey button at all (own journey), it's the only
              child in the row and naturally spans the full width. */}
          <button
            onClick={() => setShowReplies(true)}
            className="h-9 min-w-0 flex-1 whitespace-nowrap rounded-full border border-white/35 px-3 text-[11px] font-bold text-white active:scale-95"
            style={{ background: "rgba(0,0,0,0.20)" }}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <MessageCirclePlus size={13} />
              Add thought
            </span>
          </button>
        </div>

        {/* Journey description dropped here — the update caption below
            already carries the same context, and a reel view only needs one
            line of text, not two stacked paragraphs. */}
        <p className="mt-2 line-clamp-1 text-[13px] font-semibold leading-5 text-white">
          {finalText}
        </p>

        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-white/75">
            Day {finalDay} of {targetDays} · {progress}%
          </p>

          <button
            onClick={handleViewJourney}
            className="flex items-center gap-1 text-[11px] font-bold text-white active:scale-95"
          >
            View journey
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${progress}%` }}
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

// This rail floats directly over the media/canvas — see PostReelSlide.jsx's
// RailAction for why it deliberately stays a fixed dark-glass chip
// regardless of app theme, with the like heart as the one exception.
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

export default JourneyReelSlide;
