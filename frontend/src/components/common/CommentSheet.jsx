import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Send, X, ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSessionUser } from "../../utils/sessionUser";

function getUser(comment) {
  if (comment?.user && typeof comment.user === "object") return comment.user;
  if (comment?.creator && typeof comment.creator === "object") return comment.creator;
  return {};
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "IMCircle Builder";
}

function getUsername(user) {
  return user?.username || getName(user).toLowerCase().replace(/\s+/g, "");
}

function getUserId(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user?._id || user?.id || "";
}

function getAvatar(user) {
  return (
    user?.avatar ||
    user?.profilePicture ||
    user?.profileImage ||
    user?.photo ||
    user?.photoURL ||
    user?.picture ||
    ""
  );
}

function getInitial(name) {
  return name?.charAt(0)?.toUpperCase() || "B";
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

function Avatar({ user, onClick }) {
  const name = getName(user);
  const avatar = getAvatar(user);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 active:scale-95"
    >
      {avatar && !failed ? (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-10 w-10 rounded-full bg-[var(--imc-surface-2)] object-cover ring-2 ring-[var(--imc-surface)]"
        />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#12141C] text-[13px] font-black text-[#EC9A1E] ring-2 ring-[var(--imc-surface)]">
          {getInitial(name)}
        </div>
      )}
    </button>
  );
}

function CommentSheet({
  open,
  onClose,
  title = "Join conversation",
  inputPlaceholder = "Write a reply...",
  emptyTitle = "No replies yet",
  emptySubtitle = "Start the conversation with your reply.",

  loadComments,
  addComment,
  likeComment,
  deleteComment,
  replyComment,

  onCommentAdded,
}) {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [rootReplyId, setRootReplyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const currentUserId = getUserId(getSessionUser());

  const normalizeOne = (item) => ({
    ...item,
    replies: Array.isArray(item.replies) ? item.replies.map(normalizeOne) : [],
    likesCount: item.likesCount ?? item.likes?.length ?? item.likedBy?.length ?? 0,
    isLiked: Boolean(item.isLiked || item.liked),
  });

  const normalizeComments = (list = []) => list.map(normalizeOne);

  const getTotalCount = (list = []) => {
    return list.reduce(
      (total, item) => total + 1 + getTotalCount(item.replies || []),
      0
    );
  };

  const fetchComments = async () => {
    if (!loadComments) return;

    try {
      setLoading(true);
      const data = await loadComments();

      const list =
        data?.comments ||
        data?.post?.comments ||
        data?.learning?.comments ||
        data?.milestone?.comments ||
        [];

      setComments(normalizeComments(Array.isArray(list) ? list : []));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchComments();
  }, [open]);

  const updateCommentInTree = (list, commentId, updater) => {
    return list.map((comment) => {
      if ((comment._id || comment.id) === commentId) {
        return updater(comment);
      }

      return {
        ...comment,
        replies: updateCommentInTree(comment.replies || [], commentId, updater),
      };
    });
  };

  const removeCommentFromTree = (list, commentId) => {
    return list
      .filter((comment) => (comment._id || comment.id) !== commentId)
      .map((comment) => ({
        ...comment,
        replies: removeCommentFromTree(comment.replies || [], commentId),
      }));
  };

  const appendReplyToRoot = (list, rootId, reply) => {
    return list.map((comment) => {
      const id = comment._id || comment.id;

      if (id === rootId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), normalizeOne(reply)],
        };
      }

      return {
        ...comment,
        replies: appendReplyToRoot(comment.replies || [], rootId, reply),
      };
    });
  };

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;

    try {
      setSending(true);

      if (replyTo) {
        const replyUser = getUser(replyTo);
        const replyUserId = getUserId(replyUser);
        const replyUserName = getUsername(replyUser);
        const rootId = rootReplyId || replyTo.parentComment || replyTo._id;

        const data = replyComment
          ? await replyComment(replyTo._id, text.trim(), replyUserId)
          : await addComment(`@${replyUserName} ${text.trim()}`, replyTo._id);

        if (Array.isArray(data?.comments)) {
          setComments(normalizeComments(data.comments));
        } else {
          const newReply =
            data?.reply ||
            data?.comment ||
            data?.data || {
              _id: Date.now().toString(),
              user: {},
              text: text.trim(),
              replyingToUser: replyUser,
              parentComment: rootId,
              createdAt: new Date().toISOString(),
              replies: [],
              likesCount: 0,
              isLiked: false,
            };

          setComments((prev) => appendReplyToRoot(prev, rootId, newReply));
        }
      } else {
        const data = await addComment(text.trim());

        if (Array.isArray(data?.comments)) {
          setComments(normalizeComments(data.comments));
        } else {
          const newComment =
            data?.comment ||
            data?.data ||
            data?.comments?.[data.comments.length - 1] ||
            null;

          if (newComment) {
            setComments((prev) => [normalizeOne(newComment), ...prev]);
          } else {
            await fetchComments();
          }
        }
      }

      setText("");
      setReplyTo(null);
      setRootReplyId(null);
      onCommentAdded?.();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (commentId) => {
    try {
      const data = likeComment ? await likeComment(commentId) : null;

      setComments((prev) =>
        updateCommentInTree(prev, commentId, (comment) => {
          const liked =
            typeof data?.isLiked === "boolean" ? data.isLiked : !comment.isLiked;

          return {
            ...comment,
            isLiked: liked,
            likesCount:
              typeof data?.likesCount === "number"
                ? data.likesCount
                : Math.max(0, (comment.likesCount || 0) + (liked ? 1 : -1)),
          };
        })
      );
    } catch {
      // silent
    }
  };

  const handleDelete = async (commentId) => {
    try {
      if (deleteComment) await deleteComment(commentId);

      setComments((prev) => removeCommentFromTree(prev, commentId));
      setOpenMenuId(null);
    } catch {
      // silent
    }
  };

  const startReply = (comment, rootId = null) => {
    const id = comment._id || comment.id;
    setReplyTo(comment);
    setRootReplyId(rootId || comment.parentComment || id);
  };

  const CommentItem = ({ comment, rootId = null, isReply = false }) => {
    const user = getUser(comment);
    const name = getName(user);
    const id = comment._id || comment.id;
    // Only the person who wrote the comment can delete it — not every
    // viewer, and not even the post/journey owner.
    const isOwnComment = Boolean(currentUserId) && getUserId(user) === currentUserId;

    const openCommenterProfile = () => {
      if (user?.username) {
        navigate(`/profile/${user.username}`);
        return;
      }

      const uid = getUserId(user);
      if (uid) navigate(`/profile/user/${uid}`);
    };

    const replyUser =
      comment?.replyingToUser && typeof comment.replyingToUser === "object"
        ? comment.replyingToUser
        : null;

    const replyUsername = replyUser ? getUsername(replyUser) : "";

    return (
      <div className={`relative flex gap-3 ${isReply ? "mt-3" : "mb-5"}`}>
        <div className="relative">
          <Avatar user={user} onClick={openCommenterProfile} />
          {!isReply && (
            <div className="absolute left-1/2 top-11 h-[calc(100%+12px)] w-[2px] -translate-x-1/2 bg-[rgba(18,20,28,0.08)]" />
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-[22px] bg-[var(--imc-surface)] px-3 py-3 shadow-sm ring-1 ring-[rgba(18,20,28,0.08)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCommenterProfile}
                  className="min-w-0 text-left active:scale-[0.98]"
                >
                  <p className="truncate text-[14px] font-black text-[var(--imc-text)]">
                    {name}
                  </p>
                </button>
                <span className="text-[11px] font-bold text-[var(--imc-text-muted)]">
                  • {formatTime(comment.createdAt)}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[var(--imc-text)]">
                {replyUsername && (
                  <span className="mr-1 font-black text-[var(--imc-indigo-text)]">
                    @{replyUsername}
                  </span>
                )}
                {comment.text || comment.content || comment.message}
              </p>
            </div>

            {isOwnComment && (
              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-[var(--imc-text-muted)] active:bg-[var(--imc-surface-2)]"
                >
                  <MoreHorizontal size={18} />
                </button>

                {openMenuId === id && (
                  <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-2xl bg-[var(--imc-surface)] shadow-xl ring-1 ring-[rgba(18,20,28,0.08)]">
                    <button
                      onClick={() => handleDelete(id)}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left text-[13px] font-black text-red-600 active:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4 text-[11px] font-black text-[var(--imc-text-muted)]">
            <button
              onClick={() => handleLike(id)}
              className={comment.isLiked ? "text-[var(--imc-indigo-text)]" : ""}
            >
              Like {comment.likesCount > 0 ? `(${comment.likesCount})` : ""}
            </button>

            <button onClick={() => startReply(comment, rootId || id)}>
              Reply
            </button>
          </div>

          {!isReply &&
            Array.isArray(comment.replies) &&
            comment.replies.length > 0 && (
              <div className="mt-4 space-y-3 border-l-2 border-[rgba(18,20,28,0.08)] pl-3">
                {comment.replies.map((reply, index) => (
                  <CommentItem
                    key={reply._id || index}
                    comment={reply}
                    rootId={id}
                    isReply
                  />
                ))}
              </div>
            )}
        </div>
      </div>
    );
  };

  if (!open) return null;

  const totalReplies = getTotalCount(comments);

  // Portal straight to <body> — nested inside a card that uses
  // active:scale/animation transform utilities, this "fixed" overlay would
  // otherwise be fixed relative to that card (a transform on any ancestor
  // makes it the containing block for fixed descendants), rendering
  // inline/clipped instead of as a full-screen sheet.
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="flex h-[86vh] w-full max-w-[430px] flex-col rounded-t-[30px] bg-[var(--imc-surface-2)] text-[var(--imc-text)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[rgba(18,20,28,0.08)] px-4 py-4">
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="text-center">
            <h3 className="text-[18px] font-black text-[var(--imc-text)]">{title}</h3>
            <p className="mt-0.5 text-[12px] font-bold text-[var(--imc-text-muted)]">
              {totalReplies} {totalReplies === 1 ? "reply" : "replies"}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close comments"
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-[260px] flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <p className="py-8 text-center text-[12px] font-bold text-[var(--imc-text-muted)]">
              Loading replies...
            </p>
          )}

          {!loading && comments.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[18px] font-black text-[var(--imc-text)]">
                {emptyTitle}
              </p>
              <p className="mx-auto mt-2 max-w-[260px] text-[13px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                {emptySubtitle}
              </p>
            </div>
          )}

          {!loading &&
            comments.map((comment, index) => (
              <CommentItem key={comment._id || index} comment={comment} />
            ))}
        </div>

        <div className="border-t border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface-2)] px-4 py-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-[var(--imc-surface-2)] px-3 py-2">
              <p className="text-[12px] font-black text-[var(--imc-indigo-text)]">
                Replying to @{getUsername(getUser(replyTo))}
              </p>
              <button
                onClick={() => {
                  setReplyTo(null);
                  setRootReplyId(null);
                }}
                className="text-[12px] font-black text-[var(--imc-text-muted)]"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-[24px] bg-[var(--imc-surface)] p-2 shadow-sm ring-1 ring-[rgba(18,20,28,0.08)]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                replyTo
                  ? `Reply to @${getUsername(getUser(replyTo))}...`
                  : inputPlaceholder
              }
              rows={1}
              maxLength={1000}
              className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || sending}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white shadow-lg shadow-[rgba(67,56,202,0.18)] disabled:bg-[rgba(18,20,28,0.1)] disabled:text-[var(--imc-text-muted)]"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="mt-1 text-right text-[11px] font-bold text-[var(--imc-text-muted)]">
            {text.length}/1000
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommentSheet;