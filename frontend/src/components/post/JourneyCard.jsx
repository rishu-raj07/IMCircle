import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  ArrowRight,
  Trophy,
  UserPlus,
  Check,
  Flame,
  AlertTriangle,
  X,
} from "lucide-react";

import CommentSheet from "../common/CommentSheet";
import RepostSheet from "../common/RepostSheet";
import LikersSheet from "../common/LikersSheet";
import SocialActionBar from "./SocialActionBar";
import SocialProofBanner from "./SocialProofBanner";
import ViewInfoSheet from "../common/ViewInfoSheet";
import ImageLoader from "../common/ImageLoader";
import ResponsivePostMedia from "../common/ResponsivePostMedia";
import CircleAction from "../common/CircleAction";
import ProfileCompleteBadge from "../badges/ProfileCompleteBadge";
import JourneyMenu from "./JourneyMenu";
import JourneyMilestoneDetail from "./JourneyMilestoneDetail";
import { shareLink } from "../../utils/shareLink";
import { formatRelativeTime as formatSharedRelativeTime } from "../../utils/relativeTime";

import {
  likeMilestone,
  unlikeMilestone,
  getMilestoneLikers,
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
// requesting the creator's Circle, so this card shows two distinct
// actions: one near the title for the journey, one near the creator's
// name for the person (via the shared CircleAction component).
import { trackEvent } from "../../utils/analyticsTracker";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getJourneyCoverIcon } from "../../utils/media";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// Fixed brand hues (same in both themes). The journey header banner below is
// a deliberate "signature moment" (ink + marigold/indigo) and stays literal
// regardless of theme — everything else reads mode-aware CSS vars.
const INK = "#12141C";
const MARIGOLD = "#EC9A1E";
const MARIGOLD_DARK = "var(--imc-marigold-text)";
const INDIGO = "#4338CA";
// A very faint wash of the brand indigo over the card's surface — not a
// "colored" card, just enough of a shade that a Journey card reads
// differently from a plain white Post card at a glance while scrolling the
// feed. Kept as a literal low-alpha overlay (rather than a flat color) so it
// blends naturally with whatever page background sits behind it in either
// theme.
const JOURNEY_TINT = "rgba(67, 56, 202, 0.035)";

// Delegates to the shared PART-12 formatter (utils/relativeTime.js) — kept
// as a thin named wrapper (matching PostCard.jsx/CommentSheet.jsx's pattern)
// so the one call site below stays unchanged. This used to have its own
// separate logic that fell back to an absolute "26 Jun" date past 7 days;
// the shared formatter now stays relative indefinitely (days -> months ->
// years), which is what fixes that.
function formatRelativeTime(value) {
  return formatSharedRelativeTime(value);
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

function cleanText(value) {
  if (!value || typeof value !== "string") return "";
  if (value === "[object Object]") return "";
  return value;
}

// Same shape/lookup order as PostCard.jsx's getRepostText — kept as its own
// copy here (rather than a shared import) since milestone.myRepost/repost
// use the same field names as post.myRepost/repost but live on a different
// model. Only matters when milestone.isRepostView is true, set by whichever
// screen renders a reposted journey (see Profile.jsx's repost transform).
function getRepostText(milestone) {
  return cleanText(
    milestone?.repostText ||
      milestone?.repostCaption ||
      milestone?.quoteText ||
      milestone?.quote ||
      milestone?.caption ||
      milestone?.myRepost?.caption ||
      milestone?.myRepost?.text ||
      milestone?.myRepost?.thought ||
      milestone?.repost?.text ||
      milestone?.repost?.caption ||
      ""
  );
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

  // No parent-list plumbing needed for this — the backend soft-deletes
  // (Journey.isDeleted) and future feed loads already exclude it, so this
  // just has to make the card disappear from the CURRENT view the instant
  // the delete succeeds.
  const [journeyDeleted, setJourneyDeleted] = useState(false);

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
  const isMissed = journey.status === "uncompleted";
  const missedNote = (journey.finalNote || journey.uncompletedReason || "").trim();

  const finalName = getName(creator);
  const avatar = getAvatar(creator);
  const isMe = Boolean(loggedInUserId && creatorId && loggedInUserId === creatorId);
  const isProfileComplete =
    creator?.isProfileCompleted === true || Number(creator?.profileCompletionPercent || 0) >= 100;

  const finalTitle = journey.title || milestone.title || "Journey";
  const finalDay = milestone.day || milestone.milestoneDay || 1;

  const finalText =
    milestone.content ||
    milestone.text ||
    milestone.description ||
    "Shared a new journey update.";

  const repostText = getRepostText(milestone);

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

  const firstImage = getImageUrl(milestone.images?.[0]) || getImageUrl(journey.coverImage);

  // ResponsivePostMedia defaults to type="image" and renders an <img> —
  // pointing that at a video file just fails to load (which is exactly
  // what showed up as "Media unavailable" on video milestones: the upload
  // itself worked fine, and JourneyMilestoneDetail's "reel" popup already
  // plays it correctly, but this card never told ResponsivePostMedia it
  // was a video). Mirrors JourneyMilestoneDetail.jsx's firstMediaType
  // detection exactly — same milestone.images[0].type field, same file
  // -extension fallback for any older records saved before that type field
  // existed.
  const firstMediaRaw = milestone.images?.[0];
  const firstMediaType =
    typeof firstMediaRaw === "object" && firstMediaRaw?.type === "video"
      ? "video"
      : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(
          typeof firstMediaRaw === "string" ? firstMediaRaw : firstMediaRaw?.url || ""
        )
      ? "video"
      : "image";

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
  // Home.jsx) reports circle state via viewerState.inCircle / creator.inCircle.
  const inCreatorCircle = Boolean(
    milestone.inCircle || creator?.inCircle || milestone.viewerState?.inCircle
  );
  const creatorCircleRequested = Boolean(
    milestone.circleRequested ||
      creator?.circleRequested ||
      milestone.viewerState?.circleRequested
  );
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showReel, setShowReel] = useState(false);
  // Replaces the old always-visible "Why it was missed" card — now a
  // compact chip up top that opens this bottom sheet on demand, saving
  // vertical space while keeping the exact same underlying data/logic.
  const [showMissedSheet, setShowMissedSheet] = useState(false);

  useEffect(() => {
    setLikes(milestone.likesCount || milestone.likes?.length || 0);
    setReplies(milestone.repliesCount || milestone.commentsCount || milestone.comments?.length || 0);
    setReposts(milestone.repostsCount || milestone.reposts?.length || 0);
    setSaves(milestone.savesCount || milestone.saves?.length || 0);
    setLiked(Boolean(milestone.likedByMe ?? milestone.viewerState?.liked));
    setReposted(Boolean(milestone.repostedByMe ?? milestone.viewerState?.reposted));
    setSaved(Boolean(milestone.savedByMe ?? milestone.viewerState?.saved));
    setFollowing(Boolean(journey.followedByMe ?? milestone.viewerState?.followingJourney));
  }, [
    milestoneId,
    milestone.likesCount,
    milestone.repliesCount,
    milestone.commentsCount,
    milestone.repostsCount,
    milestone.savesCount,
    milestone.likedByMe,
    milestone.repostedByMe,
    milestone.savedByMe,
    milestone.viewerState?.liked,
    milestone.viewerState?.saved,
    milestone.viewerState?.followingJourney,
    journey.followedByMe,
  ]);

  const handleLike = async () => {
    if (!milestoneId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    try {
      let data;
      if (nextLiked) {
        data = await likeMilestone(milestoneId);
        trackEvent("like", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
      } else {
        data = await unlikeMilestone(milestoneId);
      }

      if (typeof data?.likesCount === "number") setLikes(data.likesCount);
      if (typeof data?.likedByMe === "boolean") setLiked(data.likedByMe);
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
    } catch {
      setFollowing(!nextFollowing);
      setFollowers((prev) => Math.max(nextFollowing ? prev - 1 : prev + 1, 0));
      alert("Couldn't update this journey. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!milestoneId) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(nextSaved ? prev + 1 : prev - 1, 0));

    try {
      let data;
      if (nextSaved) {
        data = await saveMilestone(milestoneId);
        trackEvent("save", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
      } else {
        data = await unsaveMilestone(milestoneId);
      }

      if (typeof data?.savesCount === "number") setSaves(data.savesCount);
      if (typeof data?.savedByMe === "boolean") setSaved(data.savedByMe);
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
    shareMilestone(milestoneId).catch(() => {});

    try {
      await shareLink({
        kind: "journey",
        id: journeyId || milestoneId,
        title: finalTitle,
        text: finalText,
      });
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

  if (journeyDeleted) return null;

  const statusChip = isJourneyInactive
    ? isMissed
      ? { label: "Journey Missed", icon: AlertTriangle, onClick: () => setShowMissedSheet(true) }
      : { label: "Completed", icon: Check, onClick: () => setShowReel(true) }
    : { label: `Day ${finalDay}`, icon: Flame, onClick: () => setShowReel(true), marigold: true };

  return (
    <>
      <article className="imc-enter -mx-4">
        <SocialProofBanner proof={milestone.circleProof} background={JOURNEY_TINT} />

        <div
          className="cursor-pointer overflow-hidden"
          style={{
            background: JOURNEY_TINT,
          }}
          onClick={handleViewJourney}
        >
          <div
            className="relative z-20 px-3.5 pt-3 pb-2.5"
            style={{ background: JOURNEY_TINT }}
          >
            {/* Compressed creator header: avatar, name (+ badges) on the
                left, timestamp + three-dot menu pinned top-right. No
                @handle line — just the name. Stops propagation so tapping
                the avatar/name/menu opens that, not the journey page. */}
            <div className="flex items-start gap-2.5" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={openCreatorProfile} className="shrink-0 active:scale-95">
                <div className="h-10 w-10 overflow-hidden rounded-full" style={{ background: "var(--imc-surface-2)" }}>
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
                    <img
                      src={getGenderAvatarIcon(creator)}
                      alt={finalName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </button>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openCreatorProfile}
                    className="flex min-w-0 items-center gap-1 text-left active:scale-[0.98]"
                  >
                    <p className="truncate text-[14px] font-bold" style={{ color: "var(--imc-text)" }}>
                      {creator?.username || finalName}
                    </p>
                    {isMe && (
                      <span className="shrink-0 text-[11px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
                        · You
                      </span>
                    )}
                    {isProfileComplete && (
                      <ProfileCompleteBadge name={finalName} size="sm" />
                    )}
                  </button>

                  {/* Circle-requests the CREATOR's account — distinct from
                      the "Follow Journey" chip further below. */}
                  {!isOwnJourney && creatorId && (
                    <CircleAction
                      userId={creatorId}
                      isCircleMember={inCreatorCircle}
                      isRequested={creatorCircleRequested}
                      size="xs"
                    />
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/* Falls back to updatedAt so a milestone whose createdAt
                    didn't survive a particular API projection still shows a
                    real time instead of this slot silently disappearing. */}
                <p className="text-[11px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
                  {formatRelativeTime(milestone.createdAt || milestone.updatedAt) || "now"}
                </p>
                <JourneyMenu
                  journeyId={journeyId}
                  isMine={isOwnJourney}
                  onDeleted={() => setJourneyDeleted(true)}
                />
              </div>
            </div>

            {/* Mirrors PostCard's "Your repost note" box — only renders
                when this milestone is being shown as a repost (see
                milestone.isRepostView, set by the profile screens' repost
                transform), so a plain journey card is unaffected. */}
            {milestone?.isRepostView && repostText && (
              <div
                className="mt-3 rounded-[18px] px-4 py-3"
                style={{ background: "rgba(67,56,202,0.06)" }}
              >
                <p className="text-[12px] font-bold" style={{ color: "var(--imc-indigo-text)" }}>
                  Your repost note
                </p>
                <p className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
                  {repostText}
                </p>
              </div>
            )}

            {/* Journey title — large but clean, one line, semibold (not
                the heaviest weight in the card; that's reserved for the
                name above and key numbers below). Description underneath in
                lighter, regular-weight type, only when it exists. */}
            <div className="mt-1.5">
              <h2 className="truncate text-[16px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
                {finalTitle}
              </h2>

              {aboutText && (
                <p className="mt-1 text-[12.5px] font-normal leading-5" style={{ color: "var(--imc-text-muted)" }}>
                  {descExpanded ? aboutText : aboutPreview}
                  {aboutText.length > 50 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescExpanded((prev) => !prev);
                      }}
                      className="ml-1 font-semibold"
                      style={{ color: "var(--imc-indigo-text)" }}
                    >
                      {descExpanded ? "Show less" : "more"}
                    </button>
                  )}
                </p>
              )}
            </div>

            {/* Status chips — a 2-second scan of where this journey stands.
                Neutral gray for a paused journey (never alarming red); tap
                opens the missed-day detail as a bottom sheet instead of a
                permanent, space-hogging card. Follow Journey lives here too
                as a chip instead of crowding the title line. */}
            <div
              className="mt-2.5 flex flex-wrap items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tapping either chip opens the same journey-detail popup as
                  tapping the hero image — the paused chip is the one
                  exception, since that one specifically explains why the
                  journey stalled. */}
              <button
                type="button"
                onClick={statusChip.onClick}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold active:scale-95"
                style={
                  statusChip.marigold
                    ? { background: "var(--imc-marigold-soft)", color: MARIGOLD_DARK }
                    : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                }
              >
                <statusChip.icon size={11} />
                {statusChip.label}
              </button>

              {!isOwnJourney && !isJourneyInactive && (
                <button
                  type="button"
                  onClick={handleFollow}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold transition active:scale-95"
                  style={
                    following
                      ? { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                      : { background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }
                  }
                >
                  {following ? <Check size={11} /> : <UserPlus size={11} />}
                  {following ? "Following" : "Follow Journey"}
                </button>
              )}
            </div>
          </div>

          {/* Hero image — full width, edge-to-edge, no cropping (portrait
              stays portrait, landscape stays landscape via
              ResponsivePostMedia's own aspect-ratio logic). The floating %
              bubble that used to sit on top of it is gone; progress now
              lives in the thin bar directly underneath, connected instead
              of disconnected. */}
          {firstImage ? (
            <div onClick={(e) => e.stopPropagation()}>
              <ResponsivePostMedia
                src={firstImage}
                type={firstMediaType}
                alt="Journey progress"
                onClick={() => setShowReel(true)}
                rounded="rounded-none"
              >
                {milestone.achievement && (
                  <div
                    className="absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-20px)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold"
                    style={{ background: "rgba(18,20,28,0.55)", color: MARIGOLD, backdropFilter: "blur(6px)" }}
                  >
                    <Trophy size={12} />
                    <span className="truncate">{milestone.achievement}</span>
                  </div>
                )}
              </ResponsivePostMedia>
            </div>
          ) : (
            <div
              className="imc-lattice flex h-14 items-center justify-center"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
              >
                <img src={getJourneyCoverIcon()} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                <span className="text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  No proof photo yet
                </span>
              </div>
            </div>
          )}

          <div className="px-3.5">
            {milestone.achievement && !firstImage && (
              <div
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold"
                style={{ background: "var(--imc-marigold-soft)", color: MARIGOLD_DARK }}
              >
                <Trophy size={12} />
                <span className="truncate">{milestone.achievement}</span>
              </div>
            )}

            <div onClick={(e) => e.stopPropagation()}>
              <SocialActionBar
                liked={liked}
                likesCount={likes}
                onLike={handleLike}
                commentsCount={replies}
                reposted={reposted}
                repostsCount={reposts}
                onRepost={() => {
                  if (reposted) handleRepost("");
                  else setShowRepost(true);
                }}
                saved={saved}
                savesCount={saves}
                onSave={handleSave}
                onShare={handleShare}
                onOpenComments={() => setShowReplies(true)}
                onOpenLikers={() => setShowLikers(true)}
                likeProof={milestone.likeProof}
                timestamp={formatRelativeTime(milestone.createdAt || milestone.updatedAt)}
                onQuickComment={(text) => {
                  trackEvent("comment", { entityType: "journey_milestone", entityId: milestoneId }).catch(() => {});
                  return commentMilestone(milestoneId, text).then((res) => {
                    setReplies((prev) => prev + 1);
                    return res;
                  });
                }}
                afterActions={
                  // Views — sits right under the icon row (below the save
                  // button), before "Liked by ..." and the comment box.
                  <div className="mt-1.5 flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowViews(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold active:scale-95"
                      style={{ color: "var(--imc-text-muted)" }}
                    >
                      <Eye size={13} />
                      <span>{formatCount(impressions)}</span>
                    </button>
                  </div>
                }
              />
            </div>

            {/* Clean inline CTA — plain text + arrow, no button chrome — so
                it reads as part of the same continuous card. */}
            <button
              onClick={handleViewJourney}
              className="mt-1.5 flex w-full items-center justify-between gap-2 pb-1 pt-2 active:opacity-70"
              style={{ borderTop: "1px solid var(--imc-border)" }}
            >
              <span className="text-[11.5px] font-semibold" style={{ color: "var(--imc-indigo-text)" }}>
                View Full Journey
              </span>
              <ArrowRight size={14} style={{ color: "var(--imc-indigo-text)" }} />
            </button>
          </div>
        </div>
      </article>

      <MissedJourneySheet
        open={showMissedSheet}
        onClose={() => setShowMissedSheet(false)}
        title={journey.finalNote ? "Creator's final note" : "Journey missed"}
        note={missedNote || "No update was posted, so this journey was missed automatically."}
        onContinue={() => {
          setShowMissedSheet(false);
          handleViewJourney();
        }}
      />

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

      <LikersSheet
        open={showLikers}
        onClose={() => setShowLikers(false)}
        title="Liked by"
        loadLikers={() => getMilestoneLikers(milestoneId)}
      />

      <ViewInfoSheet
        open={showViews}
        onClose={() => setShowViews(false)}
        title="Journey Impressions"
      />

      {showReel && (
        <JourneyMilestoneDetail
          milestone={milestone}
          onClose={() => setShowReel(false)}
          onDeleted={() => setJourneyDeleted(true)}
        />
      )}
    </>
  );
}

// "tone" lets the like button break from the shared indigo "active" look —
// same reasoning/values as PostActions.jsx's Action component: a heart
// turning indigo doesn't read as "liked" the way red universally does
// (Instagram, Twitter/X, etc.), so `tone="like"` swaps in the danger/red
// token for just this one action while repost/save keep the indigo style.
// Flat icon + count (no border/background chip) — matches PostActions.jsx's
// row so Post and Journey cards read as one consistent design language.
// Bottom sheet for the "Journey Missed" chip — replaces the old always-on
// "Why it was missed" card. Same data (journey.finalNote /
// journey.uncompletedReason), just revealed on demand so the card itself
// stays short. Mirrors the existing ViewInfoSheet.jsx portal pattern so it
// behaves consistently with the app's other bottom sheets (fade + slide up
// via CSS transition, tap-outside-to-dismiss backdrop).
function MissedJourneySheet({ open, onClose, title, note, onContinue }) {
  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7 shadow-2xl imc-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-[16px] font-bold" style={{ color: "var(--imc-text)" }}>
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <p className="text-[13.5px] leading-6" style={{ color: "var(--imc-text-muted)" }}>
          {note}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-full text-[13px] font-semibold active:scale-[0.98]"
          style={{ background: "var(--imc-indigo)", color: "#fff" }}
        >
          Continue Journey
        </button>
      </div>
    </div>,
    document.body
  );
}

export default memo(JourneyCard);
