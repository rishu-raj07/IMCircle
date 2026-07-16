import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bookmark,
  Check,
  Flame,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  UserPlus,
  X,
} from "lucide-react";

import CommentSheet from "../common/CommentSheet";
import RepostSheet from "../common/RepostSheet";
import ImageLoader from "../common/ImageLoader";
import ResponsivePostMedia from "../common/ResponsivePostMedia";
import MediaLightbox from "../common/MediaLightbox";
import CircleAction from "../common/CircleAction";
import JourneyMenu from "./JourneyMenu";
import { getGenderAvatarIcon } from "../../utils/avatar";

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
import { formatRelativeTime } from "../../utils/relativeTime";

function formatCount(num = 0) {
  const value = Number(num) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value;
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "Builder";
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

  return typeof url === "string" ? url : "";
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString?.() || value?.id?.toString?.() || "";
}

// Delegates to the shared PART-12 formatter (utils/relativeTime.js) — kept
// as a thin named wrapper so every call site in this file stays unchanged.
function formatTime(date) {
  return formatRelativeTime(date) || "now";
}

// Instagram-post-style "open milestone" view for JourneyCard's tap-through
// (NOT the Discover reels feed — that's still JourneyReelSlide.jsx, a
// deliberately different swipeable, full-bleed browsing experience). This
// one shows the creator's profile row, the big uncropped media, then
// like/comment/repost/save/share BELOW it, plus the Follow Journey action
// and a report/copy-link menu — matching the single-post detail layout
// used for regular posts (PostDetailOverlay).
function JourneyMilestoneDetail({ milestone = {}, onClose, onDeleted }) {
  const navigate = useNavigate();
  const creator = milestone.creator || {};
  const journey = milestone.journey || {};

  const milestoneId = getId(milestone);
  const journeyId = getId(journey) || getId(milestone.journey);
  const creatorId = getId(creator);
  const journeyCreatorId = getId(journey?.creator);

  const isOwnJourney = Boolean(milestone.isMine || milestone.isOwn) ||
    (creator?.isMe === true);

  const finalName = getName(creator);
  const finalTitle = journey.title || milestone.title || "Journey";
  const finalDay = milestone.day || milestone.milestoneDay || 1;
  const targetDays = journey.targetDays || journey.totalDays || milestone.targetDays || 100;
  const progress = Math.min(Math.round((Number(finalDay) / Number(targetDays)) * 100), 100);

  const finalText =
    milestone.content || milestone.text || milestone.description || "Shared a new journey update.";

  const firstMedia = milestone.images?.[0];
  const firstMediaType =
    typeof firstMedia === "object" && firstMedia?.type === "video"
      ? "video"
      : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(
          typeof firstMedia === "string" ? firstMedia : firstMedia?.url || ""
        )
      ? "video"
      : "image";

  const [avatarBroken, setAvatarBroken] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [likes, setLikes] = useState(milestone.likesCount || milestone.likes?.length || 0);
  const [replies, setReplies] = useState(milestone.repliesCount || milestone.commentsCount || 0);
  const [reposts, setReposts] = useState(milestone.repostsCount || milestone.reposts?.length || 0);
  const [saves, setSaves] = useState(milestone.savesCount || milestone.saves?.length || 0);
  const [liked, setLiked] = useState(Boolean(milestone.likedByMe));
  const [reposted, setReposted] = useState(Boolean(milestone.repostedByMe));
  const [saved, setSaved] = useState(Boolean(milestone.savedByMe));
  const [following, setFollowing] = useState(Boolean(journey.followedByMe));
  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);

  const inCreatorCircle = Boolean(milestone.inCircle || creator?.inCircle || milestone.viewerState?.inCircle);
  const creatorCircleRequested = Boolean(milestone.circleRequested || creator?.circleRequested);

  const handleLike = async () => {
    if (!milestoneId) return;
    const next = !liked;
    setLiked(next);
    setLikes((prev) => Math.max(next ? prev + 1 : prev - 1, 0));
    try {
      if (next) await likeMilestone(milestoneId);
      else await unlikeMilestone(milestoneId);
    } catch {
      setLiked(!next);
      setLikes((prev) => Math.max(next ? prev - 1 : prev + 1, 0));
    }
  };

  const handleSave = async () => {
    if (!milestoneId) return;
    const next = !saved;
    setSaved(next);
    setSaves((prev) => Math.max(next ? prev + 1 : prev - 1, 0));
    try {
      if (next) await saveMilestone(milestoneId);
      else await unsaveMilestone(milestoneId);
    } catch {
      setSaved(!next);
      setSaves((prev) => Math.max(next ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRepost = async (caption = "") => {
    if (!milestoneId) return;
    const next = !reposted;
    setReposted(next);
    setReposts((prev) => Math.max(next ? prev + 1 : prev - 1, 0));
    try {
      const data = await repostMilestone(milestoneId, next ? caption : "");
      if (typeof data.repostedByMe === "boolean") setReposted(data.repostedByMe);
      if (typeof data.repostsCount === "number") setReposts(data.repostsCount);
      setShowRepost(false);
    } catch {
      setReposted(!next);
      setReposts((prev) => Math.max(next ? prev - 1 : prev + 1, 0));
    }
  };

  const handleShare = async () => {
    if (!milestoneId) return;
    try {
      await shareMilestone(milestoneId);
      if (navigator.share) {
        await navigator.share({ title: finalTitle, text: finalText, url: window.location.href });
      }
    } catch {
      // silent
    }
  };

  const handleFollowJourney = async () => {
    if (!journeyId || isOwnJourney) return;
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followJourney(journeyId);
      else await unfollowJourney(journeyId);
    } catch (error) {
      setFollowing(!next);
    }
  };

  const openCreatorProfile = () => {
    if (isOwnJourney) {
      navigate("/profile");
      return;
    }
    if (creator?.username) navigate(`/profile/${creator.username}`);
    else if (creatorId) navigate(`/profile/user/${creatorId}`);
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
          <span className="text-[13px] font-black" style={{ color: "var(--imc-indigo-text)" }}>Journey update</span>
          <span className="w-9" />
        </div>

        <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
          <button type="button" onClick={openCreatorProfile} className="flex min-w-0 items-center gap-2.5 text-left active:scale-[0.99]">
            {getImageUrl(creator?.avatar || creator?.profileImage || creator?.profilePicture || creator?.photo || creator?.picture) && !avatarBroken ? (
              <ImageLoader
                src={getImageUrl(creator?.avatar || creator?.profileImage || creator?.profilePicture || creator?.photo || creator?.picture)}
                alt={finalName}
                className="h-10 w-10 rounded-full object-cover"
                wrapperClassName="h-10 w-10 rounded-full"
                width={96}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <img
                src={getGenderAvatarIcon(creator)}
                alt={finalName}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>{finalName}</span>
                {creator?.verification?.isVerified && <BadgeCheck size={13} style={{ color: "var(--imc-indigo)" }} />}
              </div>
              <p className="text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                Day {finalDay} of {targetDays} · {formatTime(milestone.createdAt)}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {!isOwnJourney && creatorId && (
              <CircleAction userId={creatorId} isCircleMember={inCreatorCircle} isRequested={creatorCircleRequested} />
            )}
            <JourneyMenu journeyId={journeyId} isMine={isOwnJourney} onDeleted={() => { onDeleted?.(); onClose?.(); }} />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "var(--imc-surface-2)" }}>
            <Flame size={11} style={{ color: "#EC9A1E" }} />
            <span className="truncate text-[11px] font-black" style={{ color: "var(--imc-text)" }}>{finalTitle}</span>
          </span>

          {!isOwnJourney && (
            <button
              type="button"
              onClick={handleFollowJourney}
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black active:scale-95"
              style={
                following
                  ? { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                  : { background: "var(--imc-indigo)", color: "#fff" }
              }
            >
              <span className="flex items-center gap-1">
                {following ? <Check size={10} /> : <UserPlus size={10} />}
                {following ? "Following" : "Follow Journey"}
              </span>
            </button>
          )}
        </div>

        {finalText && (
          <p className="whitespace-pre-line px-3.5 pt-2.5 text-[13.5px] leading-5" style={{ color: "var(--imc-text)" }}>
            {finalText}
          </p>
        )}

        {firstMedia && (
          <div className="mt-3">
            <ResponsivePostMedia
              src={firstMedia}
              type={firstMediaType}
              alt="Journey progress"
              onClick={() => setLightboxOpen(true)}
              rounded="rounded-none"
              maxHeightVh={62}
              maxHeightPx={620}
              eager
            />
          </div>
        )}

        <div className="px-3.5 pb-8">
          <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "var(--imc-border)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--imc-indigo)" }} />
          </div>
          <p className="mt-1.5 text-[10px] font-extrabold" style={{ color: "var(--imc-text-muted)" }}>
            Day {finalDay} of {targetDays} · {progress}% complete
          </p>

          <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--imc-border)" }}>
            <DetailAction icon={Heart} count={likes} active={liked} onClick={handleLike} tone="like" />
            <DetailAction icon={MessageCircle} count={replies} onClick={() => setShowReplies(true)} />
            <DetailAction
              icon={Repeat2}
              count={reposts}
              active={reposted}
              onClick={() => (reposted ? handleRepost("") : setShowRepost(true))}
            />
            <DetailAction icon={Bookmark} count={saves} active={saved} onClick={handleSave} />
            <button
              onClick={handleShare}
              className="grid h-10 min-w-10 place-items-center rounded-full border active:scale-95"
              style={{ borderColor: "var(--imc-border)", background: "var(--imc-surface)", color: "var(--imc-text-muted)" }}
            >
              <Send size={18} />
            </button>
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

      {lightboxOpen && firstMedia && (
        <MediaLightbox
          media={[{ url: getImageUrl(firstMedia), type: firstMediaType }]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

function DetailAction({ icon: Icon, count, active, onClick, tone }) {
  const isLike = tone === "like";
  return (
    <button
      onClick={onClick}
      className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-[12px] font-black active:scale-95"
      style={{
        borderColor: active ? (isLike ? "rgba(217,45,32,0.38)" : "rgba(67,56,202,0.42)") : "var(--imc-border)",
        background: active ? (isLike ? "rgba(217,45,32,0.12)" : "rgba(67,56,202,0.12)") : "var(--imc-surface)",
        color: active ? (isLike ? "var(--imc-danger)" : "var(--imc-indigo-text)") : "var(--imc-text-muted)",
      }}
    >
      <Icon size={18} fill={active ? "currentColor" : "none"} />
      {typeof count === "number" && count > 0 ? <span>{formatCount(count)}</span> : null}
    </button>
  );
}

export default JourneyMilestoneDetail;
