import { useEffect, useState } from "react";

import CommentSheet from "../common/CommentSheet";
import RepostSheet from "../common/RepostSheet";
import LikersSheet from "../common/LikersSheet";
import SocialActionBar from "./SocialActionBar";

import { formatRelativeTime } from "../../utils/relativeTime";

import {
  likePost,
  repostPost,
  sharePost,
  savePost,
  commentOnPost,
  getPostComments,
  getPostLikers,
  replyPostComment,
  likePostComment,
  deletePostComment,
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

import { trackEvent } from "../../utils/analyticsTracker";
import { shareLink } from "../../utils/shareLink";

function formatCount(num = 0) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
}

function getPayloadText(payload) {
  if (typeof payload === "string") return payload.trim();

  return (
    payload?.text ||
    payload?.repostText ||
    payload?.caption ||
    payload?.quote ||
    ""
  ).trim();
}

function PostActions({ post = {}, type = "post" }) {
  const itemId = post?._id;

  const [likes, setLikes] = useState(post.likesCount || post.likes?.length || 0);
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

  const [showReplies, setShowReplies] = useState(false);
  const [showRepost, setShowRepost] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  useEffect(() => {
    setLikes(post.likesCount || post.likes?.length || 0);
    setReplies(post.repliesCount || post.commentsCount || post.comments?.length || 0);
    setReposts(post.repostsCount || post.reposts?.length || 0);
    setSaves(post.savesCount || post.saves?.length || 0);
    setLiked(Boolean(post.likedByMe ?? post.viewerState?.liked));
    setReposted(Boolean(post.repostedByMe ?? post.viewerState?.reposted));
    setSaved(Boolean(post.savedByMe ?? post.viewerState?.saved));
  }, [
    itemId,
    post.likesCount,
    post.repliesCount,
    post.commentsCount,
    post.repostsCount,
    post.savesCount,
    post.likedByMe,
    post.repostedByMe,
    post.savedByMe,
    post.viewerState?.liked,
    post.viewerState?.reposted,
    post.viewerState?.saved,
  ]);

  const loadReplies = async () => {
    if (!itemId) return { comments: [] };

    if (type === "learning") {
      return getLearningComments(itemId);
    }

    return getPostComments(itemId);
  };

  const addReply = async (text) => {
    if (!itemId) return null;

    trackEvent("comment", { entityType: type, entityId: itemId }).catch(() => {});

    if (type === "learning") {
      return commentLearning(itemId, text);
    }

    return commentOnPost(itemId, text);
  };

  const replyToComment = async (commentId, text, replyingToUserId) => {
    if (!itemId) return null;

    if (type === "learning") {
      return commentLearning(itemId, `@${replyingToUserId || ""} ${text}`);
    }

    return replyPostComment(itemId, commentId, text, replyingToUserId);
  };

  const likeSingleComment = async (commentId) => {
    if (!itemId) return null;

    if (type === "learning") return null;

    return likePostComment(itemId, commentId);
  };

  const deleteSingleComment = async (commentId) => {
    if (!itemId) return null;

    if (type === "learning") return null;

    return deletePostComment(itemId, commentId);
  };

  const handleLike = async () => {
    if (!itemId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    if (nextLiked) {
      trackEvent("like", { entityType: type, entityId: itemId }).catch(() => {});
    }

    try {
      if (type === "learning") {
        const data = nextLiked
          ? await likeLearning(itemId)
          : await unlikeLearning(itemId);

        if (typeof data.likesCount === "number") setLikes(data.likesCount);
        if (typeof data.likedByMe === "boolean") setLiked(data.likedByMe);
        else if (typeof data.isLikedByMe === "boolean") setLiked(data.isLikedByMe);
      } else {
        const data = await likePost(itemId);
        if (typeof data.likesCount === "number") setLikes(data.likesCount);
        if (typeof data.likedByMe === "boolean") setLiked(data.likedByMe);
        else if (typeof data.isLikedByMe === "boolean") setLiked(data.isLikedByMe);
      }
    } catch {
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(nextLiked ? prev - 1 : prev + 1, 0));
    }
  };

  const handleSave = async () => {
    if (!itemId) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(nextSaved ? prev + 1 : prev - 1, 0));

    if (nextSaved) {
      trackEvent("save", { entityType: type, entityId: itemId }).catch(() => {});
    }

    try {
      if (type === "learning") {
        const data = nextSaved
          ? await saveLearning(itemId)
          : await unsaveLearning(itemId);
        if (typeof data.savesCount === "number") setSaves(data.savesCount);
        if (typeof data.savedByMe === "boolean") setSaved(data.savedByMe);
      } else {
        const data = await savePost(itemId);
        if (typeof data.savesCount === "number") setSaves(data.savesCount);
        if (typeof data.savedByMe === "boolean") setSaved(data.savedByMe);
        else if (typeof data.isSavedByMe === "boolean") setSaved(data.isSavedByMe);
      }
    } catch {
      setSaved(!nextSaved);
      setSaves((prev) => Math.max(nextSaved ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRepost = async (payload = {}) => {
    if (!itemId) return;

    const thought = getPayloadText(payload);
    const nextReposted = !reposted || Boolean(thought);

    setReposted(nextReposted);
    setReposts((prev) => Math.max(nextReposted ? prev + 1 : prev - 1, 0));

    if (nextReposted) {
      trackEvent("repost", { entityType: type, entityId: itemId, metadata: { withThought: Boolean(thought) } }).catch(() => {});
    }

    try {
      let data;

      if (type === "learning") {
        data = await repostLearning(itemId, thought);
      } else {
        data = await repostPost(itemId, {
          text: thought,
          repostText: thought,
          caption: thought,
          quote: thought,
        });
      }

      if (typeof data.repostsCount === "number") {
        setReposts(data.repostsCount);
      }

      if (typeof data.reposted === "boolean") {
        setReposted(data.reposted);
      } else {
        setReposted(nextReposted);
      }

      setShowRepost(false);
    } catch {
      setReposted(!nextReposted);
      setReposts((prev) => Math.max(nextReposted ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRemoveRepost = async () => {
    if (!itemId) return;

    setReposted(false);
    setReposts((prev) => Math.max(prev - 1, 0));

    try {
      let data;

      if (type === "learning") {
        data = await repostLearning(itemId, "");
      } else {
        data = await repostPost(itemId, {
          text: "",
          repostText: "",
          caption: "",
          quote: "",
        });
      }

      if (typeof data.repostsCount === "number") {
        setReposts(data.repostsCount);
      }

      if (typeof data.reposted === "boolean") {
        setReposted(data.reposted);
      }
    } catch {
      setReposted(true);
      setReposts((prev) => prev + 1);
    }
  };

  const handleShare = async () => {
    if (!itemId) return;

    trackEvent("share", { entityType: type, entityId: itemId }).catch(() => {});

    // Recording a share must never block the actual system share sheet. If
    // counting is temporarily unavailable, the user can still share.
    if (type === "post") sharePost(itemId).catch(() => {});

    try {
      // shareLink() tries the native Capacitor share sheet first (works
      // inside the Android/iOS app), then navigator.share (web/mobile
      // browsers), then falls back to a clipboard copy — navigator.share
      // alone (the old code here) is undefined inside the app's Android
      // WebView, so this button silently did nothing on native while
      // still appearing to work in a real browser.
      await shareLink({
        kind: type === "learning" ? "learning" : "post",
        id: itemId,
        title: "IMCircle",
        text: post.content || post.title || "Check this update on IMCircle",
      });
    } catch {
      // silent
    }
  };

  return (
    <>
      <SocialActionBar
        liked={liked}
        likesCount={likes}
        onLike={handleLike}
        commentsCount={replies}
        reposted={reposted}
        repostsCount={reposts}
        onRepost={() => {
          if (reposted) handleRemoveRepost();
          else setShowRepost(true);
        }}
        saved={saved}
        savesCount={saves}
        onSave={handleSave}
        onShare={handleShare}
        onOpenComments={() => setShowReplies(true)}
        onOpenLikers={() => setShowLikers(true)}
        likeProof={post.likeProof}
        timestamp={formatRelativeTime(post.createdAt || post.updatedAt)}
        onQuickComment={(text) =>
          addReply(text).then((res) => {
            setReplies((prev) => prev + 1);
            return res;
          })
        }
      />

      <LikersSheet
        open={showLikers}
        onClose={() => setShowLikers(false)}
        title="Liked by"
        loadLikers={() => getPostLikers(itemId)}
      />

      <CommentSheet
        open={showReplies}
        onClose={() => setShowReplies(false)}
        title="Join conversation"
        subtitle={`${formatCount(replies)} ${
          replies === 1 ? "reply" : "replies"
        }`}
        inputPlaceholder="Write a reply..."
        emptyTitle="No replies yet"
        emptySubtitle="Start the conversation with your reply."
        loadComments={loadReplies}
        addComment={addReply}
        replyComment={replyToComment}
        likeComment={likeSingleComment}
        deleteComment={deleteSingleComment}
        onCommentAdded={() => setReplies((prev) => prev + 1)}
      />

      <RepostSheet
        open={showRepost}
        onClose={() => setShowRepost(false)}
        title={type === "learning" ? "Repost Learning" : "Repost Post"}
        previewTitle={post.title || "IMCircle update"}
        previewText={post.content || post.description || ""}
        onRepost={(payload) => handleRepost(payload)}
        onRepostWithThought={(payload) => handleRepost(payload)}
      />
    </>
  );
}

export default PostActions;
