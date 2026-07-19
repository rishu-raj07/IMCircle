import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import { getSavedItems } from "../../api/savedApi";
import { getSessionUser } from "../../utils/sessionUser";

const TABS = ["All", "Posts", "Journey"];

function Saved() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [posts, setPosts] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  const me = getSessionUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getSavedItems();
        const saved = res?.saved || res?.data?.saved || {};

        if (!cancelled) {
          setPosts(Array.isArray(saved.posts) ? saved.posts : []);
          setMilestones(Array.isArray(saved.milestones) ? saved.milestones : []);
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setMilestones([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showPosts = activeTab === "All" || activeTab === "Posts";
  const showJourneys = activeTab === "All" || activeTab === "Journey";

  const items = [
    ...(showPosts ? posts.map((p) => ({ key: `post-${p._id}`, kind: "post", data: p, at: p.createdAt })) : []),
    ...(showJourneys
      ? milestones.map((m) => ({ key: `milestone-${m._id}`, kind: "milestone", data: m, at: m.createdAt }))
      : []),
  ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div
        className="relative min-h-screen w-full max-w-[430px] pb-24"
        style={{ background: "var(--imc-bg)" }}
      >
        <div
          className="px-4 py-4"
          style={{
            background: "var(--imc-bg)",
            borderBottom: "1px solid var(--imc-border)",
          }}
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
              Saved
            </h1>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className="shrink-0 rounded-full px-4 py-2 text-[12px] font-black"
                style={
                  activeTab === item
                    ? { background: "var(--imc-indigo-text)", color: "#fff" }
                    : { background: "var(--imc-indigo-tint)", color: "var(--imc-indigo-text)" }
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <main className="pt-2">
          {loading && (
            <p className="py-14 text-center text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              Loading your saved items…
            </p>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Bookmark size={28} style={{ color: "var(--imc-text-muted)" }} />
              <p className="text-[13px] font-bold" style={{ color: "var(--imc-text)" }}>
                Nothing saved yet
              </p>
              <p className="max-w-[240px] text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                Tap the bookmark icon on a post or journey update to save it here.
              </p>
            </div>
          )}

          {!loading &&
            items.map((item) =>
              item.kind === "post" ? (
                <PostCard key={item.key} post={item.data} type="post" currentUser={me} />
              ) : (
                <JourneyCard key={item.key} milestone={item.data} />
              )
            )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

export default Saved;
