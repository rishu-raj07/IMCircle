import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Newspaper, Sparkles, RefreshCw, ArrowUp, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

import NewsCard from "../../components/news/NewsCard";
import ArticleCard from "../../components/articles/ArticleCard";
import { FeedSkeleton } from "../../components/common/Skeletons";
import { useSEO } from "../../hooks/useSEO";
import { trackEvent } from "../../utils/analyticsTracker";
import { socket } from "../../socket/socket.js";
import { getForYouNews, getNewsCategories } from "../../api/newsApi";
import { getArticles } from "../../api/articleApi";

const NEWS_TABS = [
  { value: "for-you", label: "For You" },
  { value: "articles", label: "Articles" },
];

// Fixed chip set for Articles (matches the Article schema's category enum,
// minus the catch-all "Other"/"Creator Economy"/"Business" values that
// aren't part of the spec'd filter row) — deliberately NOT the dynamic,
// keyword-classifier-derived list News.jsx fetches via getNewsCategories,
// since that reflects RSS ingestion tags, not the Article model's fixed enum.
const ARTICLE_CATEGORIES = [
  "Startup",
  "Founder Stories",
  "Funding",
  "Education",
  "Career",
  "AI",
  "Technology",
  "Government",
  "Opportunities",
  "Productivity",
].map((name) => ({ name }));

const EMPTY_TAB_STATE = {
  items: [],
  cursor: null,
  hasMore: true,
  loaded: false,
  error: "",
  // Only meaningful for For You (getForYouNews returns it; getArticles
  // doesn't, so it stays true — Articles has no "complete your profile"
  // empty state, it's just "nothing here right now"). True = the request
  // was actually filtered to the user's field/interest, so an empty result
  // there means "nothing relevant yet," not "we don't know your interests."
  personalized: true,
};

function News() {
  const navigate = useNavigate();
  useSEO({
    title: "News",
    description: "Personalised news, opportunities and updates for your goals on IMCircle.",
    path: "/news",
  });

  const [activeTab, setActiveTab] = useState("for-you");
  // Separate category filter per tab — News' categories (dynamic, ingested)
  // and Articles' categories (fixed enum) aren't the same set, so carrying
  // one tab's active filter into the other could silently apply a filter
  // value that means nothing there.
  const [newsCategory, setNewsCategory] = useState("all");
  const [articleCategory, setArticleCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  const category = activeTab === "articles" ? articleCategory : newsCategory;
  const setCategory = activeTab === "articles" ? setArticleCategory : setNewsCategory;
  const visibleCategories = activeTab === "articles" ? ARTICLE_CATEGORIES : categories;

  // Independent state per tab (Part 5) — switching tabs never mixes items,
  // and re-opening a tab that's already loaded doesn't refetch.
  const [forYouState, setForYouState] = useState(EMPTY_TAB_STATE);
  const [articlesState, setArticlesState] = useState(EMPTY_TAB_STATE);
  const [loadingMore, setLoadingMore] = useState(false);
  // A "news_update" notification (see backend's newsNotification.service.js
  // — fired the moment ingestion stores something matching this user's
  // field/interest) arriving while they're already on the page. Rather than
  // silently splicing new items into a list they might be mid-scroll on,
  // this surfaces a dismissable "New updates" pill they choose to tap, same
  // pattern as Twitter/X's live feed.
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  // Floating "back to top" button — only worth showing once the person has
  // actually scrolled a few cards down; appearing immediately at the top of
  // an already-short list would just be clutter.
  const [showScrollTop, setShowScrollTop] = useState(false);

  const requestSeqRef = useRef(0);
  const sentinelRef = useRef(null);

  const state = activeTab === "articles" ? articlesState : forYouState;
  const setState = activeTab === "articles" ? setArticlesState : setForYouState;
  const fetcher = activeTab === "articles" ? getArticles : getForYouNews;

  useEffect(() => {
    getNewsCategories()
      .then((res) => {
        // Backend still tags and counts "General" internally (anything that
        // didn't match a real category keyword falls into it), but it's not
        // a category a user would ever deliberately filter by — hiding it
        // from the chip row rather than dropping it server-side, so nothing
        // about the underlying counting/classification changes.
        const filtered = (res?.categories || []).filter(
          (c) => c?.name?.toLowerCase() !== "general"
        );
        setCategories(filtered);
      })
      .catch(() => setCategories([]));
  }, []);

  // Real-time "new relevant news" signal — the backend emits the same
  // "new_notification" socket event used for likes/follows/etc (see
  // emitNotification in socket.js) whenever ingestion stores something
  // matching this user's field/interest, with type "news_update". Only
  // flags the For You tab, since only that tab's content is personalised —
  // Articles is everything, latest-first, and doesn't need a "new" nudge
  // the way a filtered feed does.
  useEffect(() => {
    const handleNewNotification = (payload) => {
      if (payload?.type !== "news_update") return;
      // Recorded regardless of which tab is active right now — rendering
      // (below) is what actually gates this to For You, so switching to
      // that tab later still shows the pill instead of losing the signal.
      setHasNewUpdates(true);
    };

    socket.on("new_notification", handleNewNotification);
    return () => socket.off("new_notification", handleNewNotification);
  }, []);

  // ~1200px is roughly 3-4 cards down (each card runs ~350-450px tall with
  // its image) — past that point a "back to top" shortcut is worth showing.
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 1200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const load = async ({ tab, mode = "initial" } = {}) => {
    const targetTab = tab || activeTab;
    const targetFetcher = targetTab === "articles" ? getArticles : getForYouNews;
    const targetSetState = targetTab === "articles" ? setArticlesState : setForYouState;
    const isMore = mode === "more";

    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    if (isMore) setLoadingMore(true);
    // A fresh (non-"more") load of For You is exactly what the "New
    // updates" pill's tap triggers — clearing here means it disappears the
    // moment its own action starts, rather than waiting on the response.
    if (!isMore && targetTab === "for-you") setHasNewUpdates(false);

    targetSetState((prev) => (isMore ? prev : { ...prev, error: "" }));

    try {
      const res = await targetFetcher({
        cursor: isMore ? state.cursor : undefined,
        limit: 10,
        category: category !== "all" ? category : undefined,
      });

      if (requestSeqRef.current !== seq) return;

      targetSetState((prev) => ({
        items: isMore ? [...prev.items, ...(res?.items || [])] : res?.items || [],
        cursor: res?.nextCursor || null,
        hasMore: Boolean(res?.hasMore),
        loaded: true,
        error: "",
        personalized: res?.personalized !== false,
      }));

      trackEvent("news_tab_view", { metadata: { tab: targetTab, mode, category } }).catch(() => {});
    } catch {
      if (requestSeqRef.current !== seq) return;
      targetSetState((prev) => ({ ...prev, error: "news-unavailable" }));
    } finally {
      if (isMore) setLoadingMore(false);
    }
  };

  // Lazy-load on first visit to a tab, or whenever the category filter
  // changes (category filtering re-fetches both tabs' loaded flag, so
  // switching back after a category change doesn't show stale results).
  useEffect(() => {
    load({ tab: activeTab, mode: "initial" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, category]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore && state.hasMore && state.loaded) {
          load({ tab: activeTab, mode: "more" });
        }
      },
      { root: null, rootMargin: "500px 0px 500px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, state.hasMore, state.loaded, state.cursor, loadingMore]);

  const removeItem = (newsId) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((item) => item._id !== newsId) }));
  };

  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      await load({ tab: activeTab, mode: "initial" });
    } finally {
      setRefreshing(false);
    }
  };

  const goToProfileSetup = () => {
    trackEvent("news_complete_profile_click", { metadata: { tab: activeTab } }).catch(() => {});
    navigate("/profile-setup");
  };

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-6" style={{ background: "var(--imc-bg)" }}>
        <div className="px-4 py-4" style={{ background: "var(--imc-bg)", borderBottom: "1px solid var(--imc-border)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full active:scale-90"
                style={{ background: "var(--imc-surface-2)" }}
              >
                <ArrowLeft size={20} style={{ color: "var(--imc-text)" }} />
              </button>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--imc-indigo-soft)", color: "var(--imc-indigo-text)" }}>
                <Newspaper size={16} />
              </span>
              <h1 className="text-[18px] font-black tracking-tight" style={{ color: "var(--imc-text)" }}>
                News
              </h1>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              aria-label="Refresh news"
              disabled={refreshing}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full active:scale-90 disabled:opacity-60"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <RefreshCw size={17} style={{ color: "var(--imc-text)" }} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Today's Growth Mission card lands here in a later phase
              (separate Daily Growth Mission backend + card) — intentionally
              omitted for now rather than shipping a non-functional
              placeholder. */}

          <div className="-mx-4 mt-4 flex items-center gap-8 border-b px-4" style={{ borderColor: "var(--imc-border)" }}>
            {NEWS_TABS.map((tab) => {
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className="relative min-w-[64px] pb-3 text-[12px] font-black"
                  style={{ color: active ? "var(--imc-indigo)" : "var(--imc-text-muted)" }}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full" style={{ background: "var(--imc-indigo)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === "articles" && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/articles/write")}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-black text-white active:scale-95"
                style={{ background: "var(--imc-indigo)" }}
              >
                <PenSquare size={13} /> Write an article
              </button>
            </div>
          )}

          {visibleCategories.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black"
                style={
                  category === "all"
                    ? { background: "var(--imc-indigo)", color: "#fff" }
                    : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                }
              >
                All
              </button>
              {visibleCategories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black"
                  style={
                    category === c.name
                      ? { background: "var(--imc-indigo)", color: "#fff" }
                      : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-3 px-4">
          {activeTab === "for-you" && hasNewUpdates && (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                load({ tab: "for-you", mode: "initial" });
              }}
              className="sticky top-2 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black shadow-md"
              style={{ background: "var(--imc-indigo)", color: "#fff" }}
            >
              <ArrowUp size={13} /> New updates — tap to refresh
            </button>
          )}

          {!state.loaded && !state.error && <FeedSkeleton count={3} />}

          {state.loaded && state.error && state.items.length === 0 && (
            <div className="rounded-[22px] p-4 text-center" style={{ background: "rgba(217,45,32,0.08)", border: "1px solid rgba(217,45,32,0.25)" }}>
              <p className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>We couldn't load your updates right now</p>
              <button
                type="button"
                onClick={() => load({ tab: activeTab, mode: "initial" })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-black"
                style={{ borderColor: "var(--imc-border)", color: "var(--imc-indigo-text)", background: "var(--imc-surface)" }}
              >
                <RefreshCw size={13} /> Try again
              </button>
            </div>
          )}

          {state.loaded && !state.error && state.items.length === 0 && (
            <div className="rounded-[22px] p-6 text-center" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--imc-surface-2)", color: "var(--imc-indigo-text)" }}>
                <Sparkles size={24} />
              </div>
              {activeTab === "for-you" && !state.personalized ? (
                <>
                  <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                    We're still learning what matters to you
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                    Complete your interests to receive relevant updates here.
                  </p>
                  <button
                    type="button"
                    onClick={goToProfileSetup}
                    className="mt-4 h-10 rounded-2xl px-5 text-[12px] font-black text-white"
                    style={{ background: "var(--imc-indigo)" }}
                  >
                    Complete profile
                  </button>
                </>
              ) : activeTab === "for-you" ? (
                <>
                  <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                    Nothing new matching your interests right now
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                    We only show what's relevant to you here — check back soon, or browse Articles for everything.
                  </p>
                </>
              ) : category !== "all" ? (
                <>
                  <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                    No articles in {category} yet
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                    Try another category, or check All.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                    No articles yet
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                    Founder stories, useful lessons, and ideas from the IMCircle community will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/articles/write")}
                    className="mt-4 h-10 rounded-2xl px-5 text-[12px] font-black text-white"
                    style={{ background: "var(--imc-indigo)" }}
                  >
                    Write an article
                  </button>
                </>
              )}
            </div>
          )}

          {state.items.map((item) =>
            activeTab === "articles" ? (
              <ArticleCard key={item._id} item={item} />
            ) : (
              <NewsCard key={item._id} item={item} onHide={removeItem} />
            )
          )}

          {state.items.length > 0 && loadingMore && <FeedSkeleton count={1} />}

          <div ref={sentinelRef} className="h-10" />

          {state.items.length > 0 && !state.hasMore && (
            <p className="pb-2 text-center text-[11px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
              You are caught up
            </p>
          )}
        </div>
      </div>

      {showScrollTop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
          <div className="flex w-full max-w-[430px] justify-end px-4">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Scroll to top"
              className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full shadow-lg active:scale-90"
              style={{ background: "var(--imc-indigo)", color: "#fff" }}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default News;
