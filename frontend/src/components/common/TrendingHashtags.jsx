import { useEffect, useState } from "react";
import { Hash, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getTrendingHashtags } from "../../api/hashtagApi";

// Self-contained (fetches its own data), so it can be dropped into any
// "default/empty" screen state — Search's pre-query view here — without
// that screen's own data-loading logic needing to know about hashtags.
function TrendingHashtags() {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getTrendingHashtags();
        if (!cancelled) setHashtags(res?.hashtags || []);
      } catch {
        if (!cancelled) setHashtags([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (hashtags.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}>
          <TrendingUp size={16} />
        </span>
        <div>
          <h2 className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>Trending hashtags</h2>
          <p className="text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>What builders are talking about</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {hashtags.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => navigate(`/hashtag/${encodeURIComponent(item.tag)}`)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-[11.5px] font-black active:scale-95"
            style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)", color: "var(--imc-indigo-text)" }}
          >
            <Hash size={12} />
            {item.tag}
          </button>
        ))}
      </div>
    </section>
  );
}

export default TrendingHashtags;
