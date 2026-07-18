import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { extractFirstUrl, fetchLinkPreview } from "../../utils/linkPreview";

// Drop-in below any post/message text render (`<LinkPreviewCard text={content} />`).
// Extracts the first bare URL out of the text with the same regex RichText.jsx
// uses to make that URL clickable, fetches an OG/Twitter-card preview from the
// existing GET /api/link-preview endpoint, and renders a LinkedIn/Twitter-style
// card — image, title, description, domain — that opens the link on tap.
// Silently renders nothing if there's no URL, the fetch fails, or the target
// page has no usable title (never shows a broken/empty card).
function LinkPreviewCard({ text = "", className = "" }) {
  const url = extractFirstUrl(text);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setFailed(false);
      setLoading(false);
      return;
    }

    let alive = true;
    setPreview(null);
    setFailed(false);
    setLoading(true);

    fetchLinkPreview(url)
      .then((result) => {
        if (!alive) return;
        if (result?.title) setPreview(result);
        else setFailed(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [url]);

  if (!url || failed) return null;

  if (loading && !preview) {
    return (
      <div
        className={`mt-2 flex h-[84px] overflow-hidden rounded-2xl border animate-pulse ${className}`}
        style={{ borderColor: "var(--imc-border)", background: "var(--imc-surface-2)" }}
      >
        <div className="flex-1 space-y-2 p-3">
          <div className="h-3 w-3/4 rounded-full" style={{ background: "var(--imc-border)" }} />
          <div className="h-2.5 w-1/2 rounded-full" style={{ background: "var(--imc-border)" }} />
        </div>
        <div className="h-full w-[84px] shrink-0" style={{ background: "var(--imc-border)" }} />
      </div>
    );
  }

  if (!preview) return null;

  let domain = preview.siteName;
  if (!domain) {
    try {
      domain = new URL(preview.url).hostname.replace(/^www\./, "");
    } catch {
      domain = preview.url;
    }
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={`mt-2 flex overflow-hidden rounded-2xl border transition active:scale-[0.99] ${className}`}
      style={{ borderColor: "var(--imc-border)", background: "var(--imc-surface)" }}
    >
      <div className="min-w-0 flex-1 p-3">
        {preview.title && (
          <p
            className="line-clamp-2 text-[13px] font-black leading-snug"
            style={{ color: "var(--imc-text)" }}
          >
            {preview.title}
          </p>
        )}

        {preview.description && (
          <p
            className="mt-1 line-clamp-2 text-[11.5px] font-semibold leading-snug"
            style={{ color: "var(--imc-text-muted)" }}
          >
            {preview.description}
          </p>
        )}

        <div
          className="mt-2 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide"
          style={{ color: "var(--imc-text-muted)" }}
        >
          <Link2 size={11} className="shrink-0" />
          <span className="truncate">{domain}</span>
        </div>
      </div>

      {preview.image && (
        <div className="w-[84px] shrink-0 self-stretch">
          <img
            src={preview.image}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.parentElement.style.display = "none";
            }}
          />
        </div>
      )}
    </a>
  );
}

export default LinkPreviewCard;
