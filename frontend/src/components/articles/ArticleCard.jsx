import { useState } from "react";
import { Bookmark, Share2, Clock, ExternalLink, BadgeCheck, Newspaper } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ImageLoader from "../common/ImageLoader";
import { formatRelativeTime } from "../../utils/relativeTime";
import { trackEvent } from "../../utils/analyticsTracker";
import { saveArticle, unsaveArticle, shareArticle } from "../../api/articleApi";

// Mirrors NewsCard's Inshorts-style layout (image up top, tight text block
// below) so Articles and For You feel like the same product — the one
// structural difference is that a click always opens the internal
// /articles/:slug detail page, never window.open(sourceUrl) directly, since
// external articles need their own summary page (never a straight jump to
// the publisher) per the "never appear as if IMCircle wrote external
// content" requirement.
function ArticleCard({ item }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(item?.viewerState?.saved));
  const [savePending, setSavePending] = useState(false);

  if (!item) return null;

  const isExternal = item.articleType === "external";
  const timeAgo = formatRelativeTime(item.publishedAt);
  const byline = isExternal ? item.sourceName : item.author?.fullName || item.authorName;

  const openDetail = () => {
    trackEvent("article_open", {
      entityType: "article",
      entityId: item._id,
      metadata: { category: item.category, articleType: item.articleType },
    }).catch(() => {});
    navigate(`/articles/${item.slug}`);
  };

  const toggleSave = async (event) => {
    event.stopPropagation();
    if (savePending) return;
    const next = !saved;
    setSaved(next);
    setSavePending(true);
    try {
      await (next ? saveArticle(item._id) : unsaveArticle(item._id));
    } catch {
      setSaved(!next);
    } finally {
      setSavePending(false);
    }
  };

  const handleShare = async (event) => {
    event.stopPropagation();
    try {
      const res = await shareArticle(item._id);
      const shareUrl = `${window.location.origin}${res?.deepLink || `/articles/${item.slug}`}`;
      const shareText = `${item.title}${byline ? ` — via ${byline}` : ""}`;

      if (navigator.share) {
        await navigator.share({ title: item.title, text: shareText, url: shareUrl }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // best-effort — sharing should never surface an error
    }
  };

  return (
    <article
      className="imc-enter overflow-hidden rounded-[20px]"
      style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
    >
      {item.coverImage?.url ? (
        <button
          type="button"
          onClick={openDetail}
          className="block w-full"
          style={{ aspectRatio: "4 / 3", background: "var(--imc-surface-2)" }}
        >
          <ImageLoader
            src={item.coverImage.url}
            alt=""
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full"
            width={700}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={openDetail}
          className="flex w-full items-center justify-center"
          style={{ aspectRatio: "16 / 7", background: "var(--imc-indigo-soft)" }}
        >
          <Newspaper size={28} style={{ color: "var(--imc-indigo-text)" }} />
        </button>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--imc-indigo-text)" }}>
            {item.category && <span className="truncate">{item.category}</span>}
            {isExternal && (
              <>
                <span style={{ color: "var(--imc-text-faint)" }}>·</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 normal-case" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
                  External source
                </span>
              </>
            )}
            {item.status === "featured" && (
              <>
                <span style={{ color: "var(--imc-text-faint)" }}>·</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 normal-case" style={{ background: "var(--imc-indigo)", color: "#fff" }}>
                  Featured on IMCircle
                </span>
              </>
            )}
            {item.isCommunityArticle && item.status !== "featured" && (
              <>
                <span style={{ color: "var(--imc-text-faint)" }}>·</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 normal-case" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
                  Community article
                </span>
              </>
            )}
            {timeAgo && (
              <>
                <span style={{ color: "var(--imc-text-faint)" }}>·</span>
                <span className="shrink-0 normal-case font-bold" style={{ color: "var(--imc-text-faint)" }}>{timeAgo}</span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={toggleSave}
              aria-label={saved ? "Unsave" : "Save"}
              className="grid h-8 w-8 place-items-center rounded-full active:scale-90"
              style={{ color: saved ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
            >
              <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              className="grid h-8 w-8 place-items-center rounded-full active:scale-90"
              style={{ color: "var(--imc-text-muted)" }}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        <button type="button" onClick={openDetail} className="mt-1.5 block text-left">
          <h3 className="text-[15.5px] font-black leading-5" style={{ color: "var(--imc-text)" }}>
            {item.title}
          </h3>
        </button>

        {item.shortSummary && (
          <p className="mt-1.5 text-[12.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
            {item.shortSummary}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--imc-border)" }}>
          <button
            type="button"
            onClick={openDetail}
            className="flex items-center gap-1 text-[11.5px] font-black"
            style={{ color: "var(--imc-indigo-text)" }}
          >
            {isExternal ? "Read summary" : "Read article"} <ExternalLink size={12} />
          </button>

          <div className="flex items-center gap-1 text-[10.5px] font-bold" style={{ color: "var(--imc-text-faint)" }}>
            <Clock size={12} />
            {item.readingTime || 1} min read
          </div>
        </div>

        {byline && (
          <p className="mt-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--imc-text-faint)" }}>
            {isExternal ? "Source" : "By"}: {byline}
            {!isExternal && item.author?.isVerified && (
              <BadgeCheck size={11} style={{ color: "var(--imc-indigo-text)" }} />
            )}
          </p>
        )}

      </div>
    </article>
  );
}

export default ArticleCard;
