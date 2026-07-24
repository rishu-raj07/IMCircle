import { useState } from "react";
import { Bookmark, MessageSquarePlus, Share2, X, ExternalLink, Newspaper } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ImageLoader from "../common/ImageLoader";
import { formatRelativeTime } from "../../utils/relativeTime";
import { trackEvent } from "../../utils/analyticsTracker";
import {
  openNews as openNewsApi,
  saveNews,
  unsaveNews,
  shareNews,
  markNewsNotInterested,
} from "../../api/newsApi";

// Inshorts-style card: a large image up top (the thing your thumb actually
// stops scrolling for), then a tight text block below it — source, headline,
// short summary, why-relevant tag, actions. Image-less items (most RSS
// feeds don't always include one) fall back to a plain text card instead of
// leaving a large empty placeholder box.
function NewsCard({ item, onHide }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(item?.viewerState?.saved));
  const [savePending, setSavePending] = useState(false);
  const [hiding, setHiding] = useState(false);

  if (!item) return null;

  const rawCategory = item.categories?.[0] || "";
  // "General" is a real, backend-tracked category (anything that didn't
  // match a specific keyword falls into it) — just not one worth surfacing
  // to the reader as if it meant something, so it's treated as "no category"
  // for display purposes only.
  const category = rawCategory.toLowerCase() === "general" ? "" : rawCategory;
  const timeAgo = formatRelativeTime(item.publishedAt);

  const recordOpen = () => {
    openNewsApi(item._id).catch(() => {});
    trackEvent("news_item_open", {
      entityType: "news",
      entityId: item._id,
      metadata: { category, sourceName: item.sourceName },
    }).catch(() => {});
  };

  const handleReadMore = () => {
    recordOpen();
    window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
  };

  const toggleSave = async (event) => {
    event.stopPropagation();
    if (savePending) return;
    const next = !saved;
    setSaved(next);
    setSavePending(true);
    try {
      await (next ? saveNews(item._id) : unsaveNews(item._id));
    } catch {
      setSaved(!next); // roll back on failure
    } finally {
      setSavePending(false);
    }
  };

  const handleAddThought = (event) => {
    event.stopPropagation();
    // Hands the article over as structured data so CreatePost can render it
    // as an actual attached card (image, headline, source) — not as raw
    // title+link text dumped into the compose box the person is meant to
    // write their own words in. See CreatePost.jsx's attachedNews handling.
    navigate("/create-post", {
      state: {
        attachedNews: {
          newsId: item._id,
          title: item.title,
          summary: item.summary,
          imageUrl: item.imageUrl,
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          category,
        },
      },
    });
  };

  const handleShare = async (event) => {
    event.stopPropagation();
    try {
      const res = await shareNews(item._id);
      const shareUrl = `${window.location.origin}${res?.deepLink || `/news/${item._id}`}`;
      const shareText = `${item.title} — via ${item.sourceName || "IMCircle"}`;

      if (navigator.share) {
        await navigator.share({ title: item.title, text: shareText, url: shareUrl }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // best-effort — sharing should never surface an error to the user
    }
  };

  const handleNotInterested = async (event) => {
    event.stopPropagation();
    if (hiding) return;
    setHiding(true);
    onHide?.(item._id); // optimistic — remove from the list immediately
    try {
      await markNewsNotInterested(item._id);
    } catch {
      // Leaving it hidden even on failure is the safer default (worst case
      // it reappears next refresh, rather than mid-scroll right now).
    }
  };

  return (
    <article
      className="imc-enter overflow-hidden rounded-[20px]"
      style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
    >
      {item.imageUrl ? (
        <button
          type="button"
          onClick={handleReadMore}
          className="block w-full"
          style={{ aspectRatio: "4 / 3", background: "var(--imc-surface-2)" }}
        >
          <ImageLoader
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full"
            width={700}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReadMore}
          className="flex w-full items-center justify-center"
          style={{ aspectRatio: "16 / 7", background: "var(--imc-indigo-soft)" }}
        >
          <Newspaper size={28} style={{ color: "var(--imc-indigo-text)" }} />
        </button>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--imc-indigo-text)" }}>
            {category && <span className="truncate">{category}</span>}
            {timeAgo && (
              <>
                {category && <span style={{ color: "var(--imc-text-faint)" }}>·</span>}
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

        <button type="button" onClick={handleReadMore} className="mt-1.5 block text-left">
          <h3 className="text-[15.5px] font-black leading-5" style={{ color: "var(--imc-text)" }}>
            {item.title}
          </h3>
        </button>

        {item.summary && (
          <p className="mt-1.5 text-[12.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
            {item.summary}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--imc-border)" }}>
          <button
            type="button"
            onClick={handleReadMore}
            className="flex items-center gap-1 text-[11.5px] font-black"
            style={{ color: "var(--imc-indigo-text)" }}
          >
            Read more <ExternalLink size={12} />
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddThought}
              aria-label="Add thought"
              className="flex items-center gap-1 text-[11px] font-black active:scale-95"
              style={{ color: "var(--imc-text-muted)" }}
            >
              <MessageSquarePlus size={14} />
              Add thought
            </button>

            <button
              type="button"
              onClick={handleNotInterested}
              aria-label="Not interested"
              className="grid h-7 w-7 place-items-center rounded-full active:scale-90"
              style={{ color: "var(--imc-text-faint)" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {item.sourceName && (
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--imc-text-faint)" }}>
            Source: {item.sourceName}
          </p>
        )}
      </div>
    </article>
  );
}

export default NewsCard;
