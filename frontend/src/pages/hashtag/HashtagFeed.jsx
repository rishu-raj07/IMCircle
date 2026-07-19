import { useEffect, useState } from "react";
import { ArrowLeft, Hash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import { FeedSkeleton } from "../../components/common/Skeletons";
import { getHashtagFeed } from "../../api/hashtagApi";

function renderItem(item) {
  if (item.type === "journey_milestone") {
    return <JourneyCard key={item.data._id} milestone={item.data} />;
  }
  return (
    <PostCard
      key={item.data._id}
      post={item.data}
      type={item.type === "learning" ? "learning" : "post"}
    />
  );
}

function HashtagFeed() {
  const navigate = useNavigate();
  const { tag } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await getHashtagFeed(tag);
        if (!cancelled) setItems(res?.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tag]);

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[430px] pb-24" style={{ background: "var(--imc-bg)" }}>
        <div
          className="px-4 py-4"
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

            <div className="flex items-center gap-1.5">
              <Hash size={18} style={{ color: "var(--imc-indigo-text)" }} />
              <h1 className="text-[18px] font-black" style={{ color: "var(--imc-text)" }}>
                {tag}
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-2 space-y-3 px-3">
          {loading && <FeedSkeleton count={3} />}

          {!loading && items.length === 0 && (
            <div className="rounded-[22px] p-6 text-center" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
              <Hash size={26} className="mx-auto" style={{ color: "var(--imc-text-muted)" }} />
              <p className="mt-3 text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
                Nothing tagged #{tag} yet
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                Be the first to post with this hashtag.
              </p>
            </div>
          )}

          {items.map((item) => (
            <div key={`${item.type}:${item.data._id}`} className="mb-3">
              {renderItem(item)}
              <div className="-mx-4 mt-3 h-2" style={{ background: "var(--imc-surface-2)" }} />
            </div>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default HashtagFeed;
