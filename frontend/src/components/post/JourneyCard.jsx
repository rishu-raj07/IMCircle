import { memo, useState } from "react";
import {
  Eye,
  Heart,
  Repeat2,
  Send,
  ArrowRight,
  Bookmark,
  Trophy,
  UserPlus,
  Check,
  Flame,
  BadgeCheck,
  CalendarDays,
  Target,
} from "lucide-react";

import CommentSheet from "../common/CommentSheet";
import RepostSheet from "../common/RepostSheet";
import SocialProofBanner from "./SocialProofBanner";
import ReplyPreview from "./ReplyPreview";
import ViewInfoSheet from "../common/ViewInfoSheet";
import ImageLoader from "../common/ImageLoader";
import JourneyMenu from "./JourneyMenu";
import FullScreenReel from "./FullScreenReel";
import JourneyReelSlide from "../../pages/discover/JourneyReelSlide";

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
// following the creator's account, so this card shows two distinct
// buttons: one near the title for the journey, one near the creator's
// name for the person.
import { followUserById, unfollowUserById } from "../../api/userApi";
import { trackEvent } from "../../utils/analyticsTracker";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// Fixed brand hues (same in both themes). The journey header banner below is
// a deliberate "signature moment" (ink + marigold/indigo) and stays literal
// regardless of theme — everything else reads mode-aware CSS vars.
const INK = "#12141C";
const MARIGOLD = "#EC9A1E";
const MARIGOLD_DARK = "#8A5A12";
const INDIGO = "#4338CA";

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  try {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function hasAnyVerification(user) {
  const v = user?.verification;
  if (!v || typeof v !== "object") return false;
  return Object.values(v).some(Boolean);
}

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

function JourneyCard({ milestone = {} }) {
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

  const isJourneyInactive =
    journey.status === "uncompleted" ||
    journey.status === "completed" ||
    journey.isActive === false;

  const finalName = getName(creator);
  const avatar = getAvatar(creator);

  const finalTitle = journey.title || milestone.title || "Journey";
  const finalDay = milestone.day || milestone.milestoneDay || 1;

  const finalText =
    milestone.content ||
    milestone.text ||
    milestone.description ||
    "Shared a new journey update.";

  // The journey's "About" text (distinct from finalText above, which is
  // this specific milestone's update caption) — this is what the card
  // shows with a 50-char preview + "read more" toggle.
  const aboutText = (journey.description || "").trim();
  const aboutPreview =
    aboutText.length > 50 ? `${aboutText.slice(0, 50).trimEnd()}...` : aboutText;

  const targetDays =
    journey.targetDays || journey.totalDays || milestone.targetDays || 100;

  const progress = Math.min(
    Math.round((Number(finalDay) / Number(targetDays)) * 100),
    100
  );

  const firstImage = getImageUrl(milestone.images?.[0]);

  const impressions =
    milestone.impressionsCount ||
    milestone.viewsCount ||
    milestone.impressions ||
    0;

  const [likes, setLikes] = useState(
    milestone.likesCount || milestone.likes?.length || 0
  );
  const [replies, setReplies] = useState(
    milestone.repliesCount ||
      milestone.commentsCount ||
      milestone.comments?.length ||
      0
  );
  const [reposts, setReposts] = useState(
    milestone.repostsCount || milestone.reposts?.length || 0
  );
  const [saves, setSaves] = useState(
    milestone.savesCount || milestone.saves?.length || 0
  );
  const [followers, setFollowers] = useState(journey.followersCount || 0);

  const [liked, setLiked] = useState(Boolean(milestone.likedByMe));
  const [reposted, setReposted] = useState(Boolean(milestone.repostedByMe));
  const [saved, setSaved] = useState(Boolean(milestone.savedByMe));
  const [following, setFollowing] = useState(Boolean(journey.followedByMe));
  // The real combined feed (feed.controller.js's getUniversalFeed, used by
  // Home.jsx) reports creator-follow state via addAuthorState as
  // milestone.isFollowing / milestone.followedByMe / creator.isFollowing —
  // there is no "creatorFollowedByMe" field from that endpoint.
  const [userFollowing, setUserFollowing] = useState(
    Boolean(
      milestone.isFollowing ||
        milestone.followedByMe ||
        creator?.isFollowing
    )
  );
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showReel, setShowReel] = useState(false);

  const handleLike = async () => {
    if (!milestoneId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    try {
      if (nextLiked) {
        await likeMilestone(milestoneId);
        trackEvent("like", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
      } else {
        await unlikeMilestone(milestoneId);
      }
    } catch {
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(nextLiked ? prev - 1 : prev + 1, 0));
    }
  };

  const handleFollow = async () => {
    if (!journeyId || isOwnJourney || isJourneyInactive) return;

    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setFollowers((prev) => Math.max(nextFollowing ? prev + 1 : prev - 1, 0));

    try {
      if (nextFollowing) {
        await followJourney(journeyId);
        trackEvent("follow", { entityType: "journey", entityId: journeyId }).catch(() => {});
      } else {
        await unfollowJourney(journeyId);
      }
    } catch (error) {
      setFollowing(!nextFollowing);
      setFollowers((prev) => Math.max(nextFollowing ? prev - 1 : prev + 1, 0));
      alert(error?.response?.data?.message || "Failed to update follow");
    }
  };

  const handleFollowUser = async () => {
    if (!creatorId || isOwnJourney) return;

    const nextFollowing = !userFollowing;
    setUserFollowing(nextFollowing);

    try {
      if (nextFollowing) {
        await followUserById(creatorId);
        trackEvent("follow", { entityType: "user", entityId: creatorId }).catch(() => {});
      } else {
        await unfollowUserById(creatorId);
      }
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
      if (nextSaved) {
        await saveMilestone(milestoneId);
        trackEvent("save", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
      } else {
        await unsaveMilestone(milestoneId);
      }
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

    if (nextReposted) {
      trackEvent("repost", { entityType: "journey_milestone", entityId: milestoneId, metadata: { withThought: Boolean(caption) } }).catch(() => {});
    }

    try {
      const data = await repostMilestone(
        milestoneId,
        nextReposted ? caption : ""
      );

      if (typeof data.repostedByMe === "boolean") {
        setReposted(data.repostedByMe);
      }

      if (typeof data.repostsCount === "number") {
        setReposts(data.repostsCount);
      }

      setShowRepost(false);
    } catch {
      setReposted(!nextReposted);
      setReposts((prev) => Math.max(nextReposted ? prev - 1 : prev + 1, 0));
    }
  };

  const handleShare = async () => {
    if (!milestoneId) return;

    trackEvent("share", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});

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

  const handleViewJourney = () => {
    if (journeyId) window.location.href = `/journey/${journeyId}`;
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

  return (
    <>
      <article className="imc-enter">
        <SocialProofBanner proof={milestone.circleProof} />

        <div
          className="overflow-hidden"
          style={{
            background: "var(--imc-surface)",
            border: "1px solid var(--imc-border)",
          }}
        >
          <div
            className="relative z-20 px-3 py-2.5"
            style={{ background: "var(--imc-surface)" }}
          >
            {/* Creator header: avatar, name + verified badge + account
                Follow button (inline), @handle, timestamp + menu. */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={openCreatorProfile} className="shrink-0 active:scale-95">
                  <div className="h-9 w-9 overflow-hidden rounded-full" style={{ background: "var(--imc-surface-2)" }}>
                    {avatar && !avatarBroken ? (
                      <ImageLoader
                        src={avatar}
                        alt={finalName}
                        className="h-full w-full object-cover"
                        wrapperClassName="h-full w-full rounded-full"
                        width={96}
                        onError={() => setAvatarBroken(true)}
                      />
                    ) : (
                      <div
                        className="grid h-full w-full place-items-center text-[13px] font-black"
                        style={{ color: "var(--imc-text)" }}
                      >
                        {finalName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={openCreatorProfile}
                      className="flex min-w-0 items-center gap-1 text-left active:scale-[0.98]"
                    >
                      <p className="truncate text-[13px] font-black" style={{ color: "var(--imc-text)" }}>
                        {finalName}
                      </p>
                      {hasAnyVerification(creator) && (
                        <BadgeCheck size={12} className="shrink-0" style={{ color: INDIGO }} />
                      )}
                    </button>

                    {/* Follows the CREATOR's account — distinct from the
                        "Follow Journey" button next to the title below. */}
                    {!isOwnJourney && (
                      <button
                        onClick={handleFollowUser}
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95"
                        style={
                          userFollowing
                            ? { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                            : { background: "#12141C", color: "#ffffff" }
                        }
                      >
                        <span className="flex items-center gap-1">
                          {userFollowing ? <Check size={9} /> : <UserPlus size={9} />}
                          {userFollowing ? "Following" : "Follow"}
                        </span>
                      </button>
                    )}
                  </div>
                  {creator?.username && (
                    <p className="truncate text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                      @{creator.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {milestone.createdAt && (
                  <p className="text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                    {formatRelativeTime(milestone.createdAt)}
                  </p>
                )}
                <JourneyMenu journeyId={journeyId} />
              </div>
            </div>

            {/* Journey title + the journey-updates Follow button. */}
            <div className="mt-1.5 flex items-center gap-2">
              <h2 className="line-clamp-1 min-w-0 text-[14px] font-black leading-5" style={{ color: "var(--imc-text)" }}>
                {finalTitle}
              </h2>

              {!isOwnJourney && !isJourneyInactive && (
                <button
                  type="button"
                  onClick={handleFollow}
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95"
                  style={
                    following
                      ? { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                      : { background: INDIGO, color: "#ffffff" }
                  }
                >
                  <span className="flex items-center gap-1">
                    {following ? <Check size={9} /> : <UserPlus size={9} />}
                    {following ? "Following" : "Follow Journey"}
                  </span>
                </button>
              )}

              {isJourneyInactive && (
                <span className="shrink-0 rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[9px] font-black text-[#D92D20]">
                  Incompleted
                </span>
              )}
            </div>

            {/* About this journey — 50-char preview, expandable up to the
                100-char cap enforced on the create/edit forms. */}
            {aboutText && (
              <div className="mt-1">
                <p className="text-[11.5px] font-semibold leading-4" style={{ color: "var(--imc-text)" }}>
                  {descExpanded ? aboutText : aboutPreview}
                </p>
                {aboutText.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((prev) => !prev)}
                    className="text-[10.5px] font-black"
                    style={{ color: "var(--imc-indigo-text)" }}
                  >
                    {descExpanded ? "Show less" : "...read more"}
                  </button>
                )}
              </div>
            )}
          </div>

          {firstImage ? (
            <button
              type="button"
              onClick={() => setShowReel(true)}
              className="relative block w-full text-left active:opacity-95"
              style={{ background: "var(--imc-surface)" }}
            >
              <ImageLoader
                src={firstImage}
                alt="Journey progress"
                className="h-full w-full object-cover"
                wrapperClassName="aspect-[16/9] w-full"
                width={800}
              />

              <div
                className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black text-white"
                style={{ background: "rgba(18,20,28,0.62)", backdropFilter: "blur(6px)" }}
              >
                <Flame size={11} style={{ color: MARIGOLD }} />
                Day {finalDay}
              </div>

              <div
                className="absolute right-2.5 top-2.5 grid h-14 w-14 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${INDIGO} ${progress * 3.6}deg, rgba(255,255,255,0.35) 0deg)`,
                }}
              >
                <div
                  className="grid h-[46px] w-[46px] place-items-center rounded-full text-center"
                  style={{ background: "rgba(18,20,28,0.72)", backdropFilter: "blur(6px)" }}
                >
                  <div>
                    <p className="text-[12px] font-black leading-3 text-white">{progress}%</p>
                    <p className="text-[6px] font-black uppercase leading-none text-white/75">Completed</p>
                  </div>
                </div>
              </div>

              {milestone.achievement && (
                <div
                  className="absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-20px)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black"
                  style={{ background: "rgba(18,20,28,0.62)", color: MARIGOLD, backdropFilter: "blur(6px)" }}
                >
                  <Trophy size={12} />
                  <span className="truncate">{milestone.achievement}</span>
                </div>
              )}
            </button>
          ) : (
            <div
              className="imc-lattice flex h-14 items-center justify-center"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
              >
                <Flame size={12} style={{ color: MARIGOLD }} />
                <span className="text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  No proof photo yet
                </span>
              </div>
            </div>
          )}

          <div className="px-3 py-2">
            {milestone.achievement && !firstImage && (
              <div
                className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black"
                style={{ background: "rgba(18,20,28,0.06)", color: MARIGOLD_DARK }}
              >
                <Trophy size={12} />
                <span className="truncate">{milestone.achievement}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5" style={{ background: "var(--imc-surface-2)" }}>
              <div className="flex items-center gap-1.5">
                <CalendarDays size={12} style={{ color: "var(--imc-indigo-text)" }} />
                <p className="text-[10.5px] font-black" style={{ color: "var(--imc-text)" }}>
                  {targetDays} Days
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Flame size={12} style={{ color: MARIGOLD_DARK }} />
                <p className="text-[10.5px] font-black" style={{ color: "var(--imc-text)" }}>
                  Day {finalDay}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Target size={12} style={{ color: "var(--imc-indigo-text)" }} />
                <p className="text-[10.5px] font-black" style={{ color: "var(--imc-text)" }}>
                  {progress}%
                </p>
              </div>

              <button
                onClick={() => setShowViews(true)}
                className="flex items-center gap-1 text-[10px] font-bold active:scale-95"
                style={{ color: "var(--imc-text-muted)" }}
              >
                <Eye size={12} />
                <span>{formatCount(impressions)}</span>
              </button>
            </div>

            <div
              className="mt-1.5 flex items-center justify-between pt-1.5"
              style={{ borderTop: "1px solid var(--imc-border)" }}
            >
              <Action
                icon={Heart}
                count={likes}
                active={liked}
                onClick={handleLike}
              />

              <Action
                icon={Repeat2}
                count={reposts}
                active={reposted}
                onClick={() => {
                  if (reposted) handleRepost("");
                  else setShowRepost(true);
                }}
              />

              <Action
                icon={Bookmark}
                count={saves}
                active={saved}
                onClick={handleSave}
              />

              <button
                onClick={handleShare}
                className="rounded-full p-1.5 active:scale-95"
                style={{ color: "var(--imc-text-muted)" }}
              >
                <Send size={16} />
              </button>
            </div>

            <ReplyPreview
              count={replies}
              topComment={milestone.topComment}
              onOpen={() => setShowReplies(true)}
            />

            <button
              onClick={handleViewJourney}
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2 active:scale-[0.98]"
              style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
            >
              <span className="text-[11px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                View full journey · {progress}% complete
              </span>
              <ArrowRight size={14} style={{ color: "var(--imc-indigo-text)" }} />
            </button>
          </div>
        </div>
      </article>

      <CommentSheet
        open={showReplies}
        onClose={() => setShowReplies(false)}
        title="Journey replies"
        subtitle={`${formatCount(replies)} ${
          replies === 1 ? "reply" : "replies"
        }`}
        inputPlaceholder="Write a reply..."
        emptyTitle="No replies yet"
        emptySubtitle="Start the journey conversation."
        loadComments={() => getMilestoneComments(milestoneId)}
        addComment={(text) => {
          trackEvent("comment", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
          return commentMilestone(milestoneId, text);
        }}
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

      <ViewInfoSheet
        open={showViews}
        onClose={() => setShowViews(false)}
        title="Journey Impressions"
      />

      {showReel && (
        <FullScreenReel onClose={() => setShowReel(false)}>
          <JourneyReelSlide milestone={milestone} />
        </FullScreenReel>
      )}
    </>
  );
}

function Action({ icon: Icon, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-black active:scale-95"
      style={{
        borderColor: active ? "rgba(67,56,202,0.42)" : "var(--imc-border)",
        background: active ? "rgba(67,56,202,0.12)" : "var(--imc-surface)",
        color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)",
      }}
    >
      <Icon size={16} fill={active ? "currentColor" : "none"} />
      {typeof count === "number" && count > 0 && (
        <span>{formatCount(count)}</span>
      )}
    </button>
  );
}

export default memo(JourneyCard);
