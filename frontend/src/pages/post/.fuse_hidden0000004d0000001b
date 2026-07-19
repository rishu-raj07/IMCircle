import { useEffect, useState } from "react";
import { ArrowLeft, FileWarning } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import PostCard from "../../components/post/PostCard";
import { FeedSkeleton } from "../../components/common/Skeletons";
import { getSinglePost } from "../../api/postApi";
import { getSessionUser } from "../../utils/sessionUser";

// Single-post landing page — this is what a like/comment/reply/repost/
// mention notification about a post actually opens (see LINK_BUILDERS in
// backend/src/services/notification.service.js: entityType "post" ->
// `/post/${id}`). Reuses PostCard as-is so the like/comment/repost/share
// actions on this page behave identically to the feed — no separate
// interaction logic to keep in sync.
function PostDetail() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const res = await getSinglePost(postId);
        const fetchedPost = res?.post || res?.data?.post || null;

        if (!cancelled) {
          if (fetchedPost) setPost(fetchedPost);
          else setNotFound(true);
        }
      } catch {
        // Covers both a genuine 404 (post deleted, per the spec's "handle
        // deleted content safely" requirement) and any other fetch failure
        // — either way there's nothing to render, so the same empty state
        // applies.
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[430px] pb-24" style={{ background: "var(--imc-bg)" }}>
        <div
          className="sticky top-0 z-20 px-4 py-4"
          style={{ background: "var(--imc-bg)", borderBottom: "1px solid var(--imc-border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <ArrowLeft size={20} style={{ color: "var(--imc-text)" }} />
            </button>

            <h1 className="text-[18px] font-black" style={{ color: "var(--imc-text)" }}>
              Post
            </h1>
          </div>
        </div>

        <div className="mt-2 px-3">
          {loading && <FeedSkeleton count={1} />}

          {!loading && notFound && (
            <div
              className="rounded-[22px] p-6 text-center"
              style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
            >
              <FileWarning size={26} className="mx-auto" style={{ color: "var(--imc-text-muted)" }} />
              <p className="mt-3 text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
                This post isn't available
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                It may have been removed by its author.
              </p>
            </div>
          )}

          {!loading && !notFound && post && (
            <PostCard post={post} type="post" currentUser={getSessionUser()} />
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default PostDetail;
