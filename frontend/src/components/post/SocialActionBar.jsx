import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Send, Bookmark, Smile } from "lucide-react";

import { getAvatarUrl, getGenderAvatarIcon } from "../../utils/avatar";

function formatCount(num = 0) {
  const value = Number(num) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value;
}

// Shared "Instagram-style" action strip used by both JourneyCard.jsx and
// PostActions.jsx (posts + learnings) — icon row (like/comment/repost/share
// on the left, save pinned right), an avatar-stack "Liked by X and N
// others" line, a timestamp, and an always-available inline quick-comment
// composer, distinct from the full CommentSheet the comment icon opens.
//
// This component owns none of the actual like/repost/save/comment API
// calls — callers keep their own state and handlers (unchanged from
// before), and just pass them in here as props, so nothing about how
// journeys vs. posts/learnings actually persist changes.
function SocialActionBar({
  liked,
  likesCount,
  onLike,
  commentsCount,
  reposted,
  repostsCount,
  onRepost,
  saved,
  savesCount,
  onSave,
  onShare,
  onOpenComments,
  onOpenLikers,
  likeProof,
  timestamp,
  onQuickComment,
  commentPlaceholder = "Add a comment...",
  // Optional extra row rendered right under the icon strip (e.g. JourneyCard's
  // view count) — before "Liked by ..." and the comment composer. Undefined
  // by default so PostActions.jsx's usage is completely unaffected.
  afterActions = null,
}) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    const text = draft.trim();
    if (!text || posting || !onQuickComment) return;

    setPosting(true);
    try {
      await onQuickComment(text);
      setDraft("");
    } catch {
      // best-effort — the input keeps whatever was typed so the person can
      // retry instead of silently losing their comment
    } finally {
      setPosting(false);
    }
  };

  const avatars = Array.isArray(likeProof?.avatars) ? likeProof.avatars : [];

  return (
    <div>
      <div
        className="mt-2.5 flex items-center gap-6 pt-2.5"
        style={{ borderTop: "1px solid var(--imc-border)" }}
      >
        <button
          type="button"
          onClick={onLike}
          className="flex items-center gap-1.5 active:scale-95"
          style={{ color: liked ? "var(--imc-danger)" : "var(--imc-text-muted)" }}
        >
          <Heart size={21} fill={liked ? "currentColor" : "none"} />
          {likesCount > 0 && (
            <span className="text-[12.5px] font-semibold">{formatCount(likesCount)}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenComments}
          className="flex items-center gap-1.5 active:scale-95"
          style={{ color: "var(--imc-text-muted)" }}
        >
          <MessageCircle size={21} />
          {commentsCount > 0 && (
            <span className="text-[12.5px] font-semibold">{formatCount(commentsCount)}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onRepost}
          className="flex items-center gap-1.5 active:scale-95"
          style={{ color: reposted ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
        >
          <Repeat2 size={21} fill={reposted ? "currentColor" : "none"} />
          {repostsCount > 0 && (
            <span className="text-[12.5px] font-semibold">{formatCount(repostsCount)}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 active:scale-95"
          style={{ color: "var(--imc-text-muted)" }}
        >
          <Send size={20} />
        </button>

        <button
          type="button"
          onClick={onSave}
          className="ml-auto flex items-center gap-1.5 active:scale-95"
          style={{ color: saved ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
        >
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
          {savesCount > 0 && (
            <span className="text-[12.5px] font-semibold">{formatCount(savesCount)}</span>
          )}
        </button>
      </div>

      {afterActions}

      {likesCount > 0 && (
        <button
          type="button"
          onClick={onOpenLikers}
          className="mt-2 flex items-center gap-2 active:opacity-70"
        >
          {avatars.length > 0 && (
            <div className="flex shrink-0 -space-x-2">
              {avatars.map((user, index) => (
                <div
                  key={user?._id || index}
                  className="h-5 w-5 overflow-hidden rounded-full"
                  style={{ border: "1.5px solid var(--imc-surface)" }}
                >
                  <img
                    src={getAvatarUrl(user) || getGenderAvatarIcon(user)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <p className="text-left text-[12px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
            Liked by{" "}
            <span className="font-bold" style={{ color: "var(--imc-text)" }}>
              {likeProof?.primaryUser?.fullName || (liked ? "me" : "someone")}
            </span>
            {likeProof?.othersCount > 0 ? (
              <>
                {" "}
                and{" "}
                <span className="font-bold" style={{ color: "var(--imc-text)" }}>
                  {formatCount(likeProof.othersCount)} other{likeProof.othersCount === 1 ? "" : "s"}
                </span>
              </>
            ) : likesCount > 1 ? (
              <> and {formatCount(likesCount - 1)} others</>
            ) : null}
          </p>
        </button>
      )}

      {timestamp && (
        <p className="mt-1 text-[10.5px] font-medium tracking-wide" style={{ color: "var(--imc-text-faint)" }}>
          {timestamp}
        </p>
      )}

      {onQuickComment && (
        <div className="mt-2.5 flex items-center gap-2.5 pt-2.5" style={{ borderTop: "1px solid var(--imc-border)" }}>
          <Smile size={18} className="shrink-0" style={{ color: "var(--imc-text-faint)" }} />

          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handlePost();
            }}
            placeholder={commentPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none"
            style={{ color: "var(--imc-text)" }}
          />

          {draft.trim() && (
            <button
              type="button"
              onClick={handlePost}
              disabled={posting}
              className="shrink-0 text-[12.5px] font-black disabled:opacity-50"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {posting ? "..." : "Post"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SocialActionBar;
