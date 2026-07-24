import { useState } from "react";
import { Bookmark, Clock, Eye, Pencil, Archive, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ImageLoader from "../common/ImageLoader";
import { formatRelativeTime } from "../../utils/relativeTime";
import { saveArticle, unsaveArticle, archiveArticle, deleteArticleDraft } from "../../api/articleApi";

const STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  pending_feature_review: "Under feature review",
  changes_requested: "Changes requested",
  featured: "Featured",
  feature_not_selected: "Not selected",
  archived: "Archived",
  removed: "Removed",
};

// Used on both the owner's own profile (My Articles-style, with
// edit/archive actions and every status visible) and other users' profiles
// (read-only, publicly-visible statuses only — see article.controller.js's
// getUserArticles for what's actually returned in each case).
function ProfileArticleCard({ item, isOwner, onArchived, onDeleted }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(item?.viewerState?.saved));
  const [savePending, setSavePending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const isFeatured = item.status === "featured";
  const isCommunity = Boolean(item.isCommunityArticle);
  const timeAgo = formatRelativeTime(item.publishedAt || item.createdAt);

  const openDetail = () => {
    if (item.status === "draft") {
      navigate("/articles/write", { state: { articleId: item._id } });
    } else {
      navigate(`/articles/${item.slug}`);
    }
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

  const handleArchive = async (event) => {
    event.stopPropagation();
    if (archiving) return;
    if (!window.confirm("Archive this article? It will be removed from public view but stays here under Archived.")) {
      return;
    }
    setArchiving(true);
    try {
      await archiveArticle(item._id);
      onArchived?.(item._id);
    } catch {
      // best-effort — button just stays clickable to retry
    } finally {
      setArchiving(false);
    }
  };

  // Drafts only — anything ever published must be archived instead (the
  // backend enforces this too; see article.controller.js's deleteArticle).
  const handleDelete = async (event) => {
    event.stopPropagation();
    if (deleting) return;
    if (!window.confirm("Permanently delete this draft? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deleteArticleDraft(item._id);
      onDeleted?.(item._id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <article
      onClick={openDetail}
      className="imc-enter flex cursor-pointer gap-3 overflow-hidden rounded-[18px] p-3"
      style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl" style={{ background: "var(--imc-surface-2)" }}>
        {item.coverImage?.url && (
          <ImageLoader src={item.coverImage.url} alt="" className="h-full w-full object-cover" wrapperClassName="h-full w-full" width={200} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {isOwner && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
              {STATUS_LABELS[item.status] || item.status}
            </span>
          )}
          {isFeatured && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase" style={{ background: "var(--imc-indigo)", color: "#fff" }}>
              <Sparkles size={9} /> Featured
            </span>
          )}
          {isCommunity && !isFeatured && item.status !== "draft" && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase" style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}>
              Community
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-[13.5px] font-black leading-5" style={{ color: "var(--imc-text)" }}>
          {item.title || "Untitled draft"}
        </p>

        {isOwner && item.status === "changes_requested" && item.featureReviewNote && (
          <p className="mt-1 line-clamp-2 text-[10.5px] font-bold leading-4" style={{ color: "#B54708" }}>
            Admin note: {item.featureReviewNote}
          </p>
        )}
        {isOwner && item.status === "feature_not_selected" && (
          <p className="mt-1 text-[10.5px] font-bold leading-4" style={{ color: "var(--imc-text-faint)" }}>
            Remains published on your profile — not selected for the main Articles tab.
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold" style={{ color: "var(--imc-text-faint)" }}>
          {item.category && <span>{item.category}</span>}
          {timeAgo && <span>· {timeAgo}</span>}
          <span className="flex items-center gap-1"><Clock size={10} /> {item.readingTime || 1} min</span>
          {isOwner && (
            <span className="flex items-center gap-1"><Eye size={10} /> {item.stats?.views || 0}</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/articles/write", { state: { articleId: item._id } });
                }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black active:scale-95"
                style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
              >
                <Pencil size={11} /> Edit
              </button>
              {!["draft", "archived", "removed"].includes(item.status) && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black active:scale-95 disabled:opacity-60"
                  style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
                >
                  <Archive size={11} /> Archive
                </button>
              )}
              {item.status === "draft" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black active:scale-95 disabled:opacity-60"
                  style={{ background: "rgba(217,45,32,0.08)", color: "#D92D20" }}
                >
                  <Trash2 size={11} /> {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={toggleSave}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black active:scale-95"
              style={{ color: saved ? "var(--imc-indigo-text)" : "var(--imc-text-muted)", background: "var(--imc-surface-2)" }}
            >
              <Bookmark size={11} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProfileArticleCard;
