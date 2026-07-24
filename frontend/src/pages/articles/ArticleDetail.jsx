import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Clock,
  ExternalLink,
  BadgeCheck,
  FileWarning,
  Newspaper,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ImageLoader from "../../components/common/ImageLoader";
import { FeedSkeleton } from "../../components/common/Skeletons";
import { useSEO } from "../../hooks/useSEO";
import { formatRelativeTime } from "../../utils/relativeTime";
import { trackEvent } from "../../utils/analyticsTracker";
import { currentUser } from "../../store/authStore";
import { followUserById, unfollowUserById } from "../../api/userApi";
import {
  getArticleBySlug,
  saveArticle,
  unsaveArticle,
  shareArticle,
  recordArticleView,
} from "../../api/articleApi";

// internal vs external is a rendering fork, not two pages — external
// articles never get a body (see backend: content is always "" for
// articleType "external"), so this fork is really just "which optional
// blocks does this article have," decided once per fetch.
function ArticleDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  useSEO({
    title: article?.title || "Article",
    description: article?.shortSummary || "Read this on IMCircle.",
    path: `/articles/${slug}`,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const res = await getArticleBySlug(slug);
        const item = res?.item || null;
        if (cancelled) return;

        if (item) {
          setArticle(item);
          setSaved(Boolean(item.viewerState?.saved));
          setFollowing(Boolean(item.author?.isFollowing));
          // Fire-and-forget — records the unique/total view count without
          // blocking render on it.
          recordArticleView(item._id).catch(() => {});
          trackEvent("article_view", {
            entityType: "article",
            entityId: item._id,
            metadata: { category: item.category, articleType: item.articleType },
          }).catch(() => {});
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const sanitizedContent = useMemo(() => {
    if (!article?.content) return "";
    return DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
        "h1", "h2", "h3", "blockquote", "hr", "img", "code", "pre", "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "src", "alt"],
    });
  }, [article]);

  const toggleSave = async () => {
    if (savePending || !article) return;
    const next = !saved;
    setSaved(next);
    setSavePending(true);
    try {
      await (next ? saveArticle(article._id) : unsaveArticle(article._id));
    } catch {
      setSaved(!next);
    } finally {
      setSavePending(false);
    }
  };

  const toggleFollow = async () => {
    if (followPending || !article?.author?._id) return;
    const next = !following;
    setFollowing(next);
    setFollowPending(true);
    try {
      await (next ? followUserById(article.author._id) : unfollowUserById(article.author._id));
    } catch {
      setFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      const res = await shareArticle(article._id);
      const shareUrl = `${window.location.origin}${res?.deepLink || `/articles/${article.slug}`}`;
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.shortSummary, url: shareUrl }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // best-effort
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
        <div className="w-full max-w-[430px] px-4 py-4">
          <FeedSkeleton count={1} />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
        <div className="flex w-full max-w-[430px] flex-col items-center justify-center px-6 text-center">
          <FileWarning size={36} style={{ color: "var(--imc-text-faint)" }} />
          <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
            This article isn't available
          </p>
          <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            It may have been removed or unpublished.
          </p>
          <button
            type="button"
            onClick={() => navigate("/news")}
            className="mt-4 h-10 rounded-2xl px-5 text-[12px] font-black text-white"
            style={{ background: "var(--imc-indigo)" }}
          >
            Back to News
          </button>
        </div>
      </div>
    );
  }

  const isExternal = article.articleType === "external";
  const timeAgo = formatRelativeTime(article.publishedAt);
  const byline = isExternal ? article.sourceName : article.author?.fullName || article.authorName;
  const isOwner = Boolean(article.isOwner);
  const isCommunityArticle = Boolean(article.isCommunityArticle);
  const isFeaturedArticle = article.status === "featured";
  const wasEdited = Boolean(
    article.lastEditedAt && article.publishedAt && new Date(article.lastEditedAt) > new Date(article.publishedAt)
  );
  const viewerId = currentUser()?._id;
  const showFollowButton = !isExternal && article.author?._id && String(article.author._id) !== String(viewerId);

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[430px] pb-10" style={{ background: "var(--imc-bg)" }}>
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid var(--imc-border)" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full active:scale-90"
            style={{ background: "var(--imc-surface-2)" }}
          >
            <ArrowLeft size={20} style={{ color: "var(--imc-text)" }} />
          </button>

          <div className="flex items-center gap-1">
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate("/articles/write", { state: { articleId: article._id } })}
                aria-label="Edit"
                className="grid h-10 w-10 place-items-center rounded-full active:scale-90"
                style={{ color: "var(--imc-text-muted)" }}
              >
                <Pencil size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleSave}
              aria-label={saved ? "Unsave" : "Save"}
              className="grid h-10 w-10 place-items-center rounded-full active:scale-90"
              style={{ color: saved ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              className="grid h-10 w-10 place-items-center rounded-full active:scale-90"
              style={{ color: "var(--imc-text-muted)" }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-indigo-text)" }}>
            <span>{article.category}</span>
            {isExternal && (
              <>
                <span style={{ color: "var(--imc-text-faint)" }}>·</span>
                <span className="rounded-full px-1.5 py-0.5 normal-case" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
                  External source
                </span>
              </>
            )}
            {isFeaturedArticle && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 normal-case" style={{ background: "var(--imc-indigo)", color: "#fff" }}>
                <Sparkles size={10} /> Featured on IMCircle
              </span>
            )}
            {isCommunityArticle && !isFeaturedArticle && (
              <span className="rounded-full px-2 py-0.5 normal-case" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
                Community article
              </span>
            )}
          </div>

          <h1 className="mt-2 text-[20px] font-black leading-6" style={{ color: "var(--imc-text)" }}>
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="mt-1.5 text-[14px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
              {article.subtitle}
            </p>
          )}

          <p className="mt-2 text-[13.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
            {article.shortSummary}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold" style={{ color: "var(--imc-text-faint)" }}>
              {byline && (
                <span className="flex items-center gap-1" style={{ color: "var(--imc-text-muted)" }}>
                  {isExternal ? "Source: " : "By "}
                  {byline}
                  {!isExternal && article.author?.isVerified && (
                    <BadgeCheck size={13} style={{ color: "var(--imc-indigo-text)" }} />
                  )}
                </span>
              )}
              {timeAgo && <span>· {timeAgo}</span>}
              {wasEdited && <span>· Edited</span>}
              <span className="flex items-center gap-1">
                <Clock size={12} /> {article.readingTime || 1} min read
              </span>
            </div>

            {showFollowButton && (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followPending}
                className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black active:scale-95 disabled:opacity-60"
                style={
                  following
                    ? { background: "var(--imc-surface-2)", color: "var(--imc-text)" }
                    : { background: "var(--imc-indigo)", color: "#fff" }
                }
              >
                <Users size={12} /> {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {article.coverImage?.url && (
          <div className="px-4">
            <div className="overflow-hidden rounded-[18px]" style={{ aspectRatio: "16 / 9", background: "var(--imc-surface-2)" }}>
              <ImageLoader
                src={article.coverImage.url}
                alt={article.coverImage.altText || ""}
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
                width={860}
                eager
              />
            </div>
          </div>
        )}

        <div className="px-4 py-5">
          {isExternal ? (
            <>
              {article.whyItMatters && (
                <div className="rounded-[18px] p-4" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                  <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-indigo-text)" }}>
                    Why it matters
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-6" style={{ color: "var(--imc-text)" }}>
                    {article.whyItMatters}
                  </p>
                </div>
              )}

              {article.keyTakeaways?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-text-muted)" }}>
                    Key takeaways
                  </p>
                  <ul className="mt-2 space-y-2">
                    {article.keyTakeaways.map((point, i) => (
                      <li key={i} className="flex gap-2 text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
                        <span style={{ color: "var(--imc-indigo-text)" }}>•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("article_read_original_click", {
                    entityType: "article",
                    entityId: article._id,
                  }).catch(() => {})
                }
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[13.5px] font-black text-white"
                style={{ background: "var(--imc-indigo)" }}
              >
                Read original <ExternalLink size={15} />
              </a>

              <p className="mt-3 text-center text-[10.5px] font-semibold" style={{ color: "var(--imc-text-faint)" }}>
                This is a summary written by IMCircle. Full content belongs to {article.sourceName || "the original publisher"}.
              </p>
            </>
          ) : (
            <>
              {sanitizedContent ? (
                <div
                  className="imc-article-body text-[14.5px] font-medium leading-7"
                  style={{ color: "var(--imc-text)" }}
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <Newspaper size={28} style={{ color: "var(--imc-text-faint)" }} />
                  <p className="mt-3 text-[13px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                    This article has no content yet.
                  </p>
                </div>
              )}

              {article.keyTakeaways?.length > 0 && (
                <div className="mt-6 rounded-[18px] p-4" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                  <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-text-muted)" }}>
                    Key takeaways
                  </p>
                  <ul className="mt-2 space-y-2">
                    {article.keyTakeaways.map((point, i) => (
                      <li key={i} className="flex gap-2 text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
                        <span style={{ color: "var(--imc-indigo-text)" }}>•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArticleDetail;
