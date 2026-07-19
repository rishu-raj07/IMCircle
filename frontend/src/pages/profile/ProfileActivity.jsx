import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  FileText,
  Flag,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  Repeat2,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import BottomNav from "../../components/navigation/BottomNav";
import { getMyProfile } from "../../api/profileApi";
import { getUserPostsById, getUserRepostsById } from "../../api/userApi";
import { getMyJourneys } from "../../api/journeyApi";
import { getJourneyCoverIcon } from "../../utils/media";
import RepostCard from "../../components/post/RepostCard";
const TABS = ["All", "Posts", "Journey", "Reposts"];
const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getOwnerId(data = {}) {
  return (
    getId(data?.author) ||
    getId(data?.creator) ||
    getId(data?.user) ||
    getId(data?.createdBy) ||
    getId(data?.owner) ||
    getId(data?.journey?.author) ||
    getId(data?.journey?.creator) ||
    getId(data?.journey?.user) ||
    getId(data?.milestone?.author) ||
    getId(data?.milestone?.creator) ||
    getId(data?.learning?.author) ||
    getId(data?.learning?.creator) ||
    ""
  );
}

function cleanText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    if (value.trim() === "[object Object]") return "";
    return value;
  }

  if (typeof value === "object") {
    return cleanText(
      value?.text ||
        value?.caption ||
        value?.thought ||
        value?.repostText ||
        value?.quote ||
        value?.content ||
        value?.body ||
        ""
    );
  }

  return "";
}

function getRepostText(data = {}) {
  return cleanText(
    data?.myRepost?.text ||
      data?.myRepost?.caption ||
      data?.myRepost?.thought ||
      data?.myRepost?.repostText ||
      data?.repost?.text ||
      data?.repost?.caption ||
      data?.repost?.thought ||
      data?.repost?.repostText ||
      data?.repostText ||
      data?.repostCaption ||
      data?.quoteText ||
      data?.quote ||
      data?.caption
  );
}
function getRawType(item = {}) {
  const type = item?.type || item?.rawType || item?.feedType || "post";

  if (type === "journey_milestone" || type === "milestone") {
    return "journey";
  }

  return type;
}

// Categories are mutually exclusive by design: a reposted post must ONLY
// count toward "Reposts", never also "Posts" — otherwise something you
// reposted from someone else shows up looking like your own post. "All"
// bypasses this filter entirely (see visibleItems below), so nothing is
// hidden there; this only controls the Posts/Journey/Reposts tab split.
function getCategories(rawType, isRepost) {
  if (isRepost) return ["Reposts"];
  if (rawType === "journey") return ["Journey"];
  return ["Posts"];
}

function isReposted(data = {}) {
  return Boolean(
    data?.repostedByMe === true ||
      data?.isRepostedByMe === true ||
      data?.myRepost ||
      data?.repost ||
      data?.repostText ||
      data?.repostCaption
  );
}

function normalizeFeed(feedData) {
  const feed =
    feedData?.feed ||
    feedData?.data?.feed ||
    feedData?.data?.items ||
    feedData?.items ||
    feedData?.data ||
    [];

  return Array.isArray(feed) ? feed : [];
}

function getData(item = {}) {
  return (
    item?.data ||
    item?.post ||
    item?.learning ||
    item?.journey ||
    item?.milestone ||
    item
  );
}

function buildRepostPost(item) {
  return {
    ...item.data,
    repostText: item.repostText,
    isRepostView: true,
  };
}

function getImageUrl(value) {
  const url =
    (typeof value === "string" ? value : "") ||
    value?.url ||
    value?.secure_url ||
    value?.path ||
    "";

  return url.startsWith("/uploads") ? `${API_URL}${url}` : url;
}

function isMissedJourney(journey = {}) {
  const status = String(journey.status || journey.statusLabel || "").toLowerCase();
  return status === "uncompleted" || status === "missed";
}

function ProfileActivity() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialTab = params.get("tab") || "All";

  const [activeTab, setActiveTab] = useState(
    TABS.includes(initialTab) ? initialTab : "All"
  );

  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = async () => {
    try {
      setLoading(true);

      const profileData = await getMyProfile();
      const profileUser =
        profileData?.user || profileData?.data?.user || profileData?.data;

      setUser(profileUser);

      const myUserId = getId(profileUser);

      // Scoped strictly to myUserId via /users/:userId/posts and
      // /users/:userId/reposts — the same endpoints UserProfile.jsx (other
      // users' profiles) uses, instead of re-filtering the personalized
      // /feed response. That old approach also silently dropped every
      // reposted Learning from "My Activity" (`if (rawType === "learning")
      // return null;` above) since /feed never marked learnings as
      // authored-by-me here — this picks those back up too.
      const [postsRes, repostsRes, journeysRes] = await Promise.all([
        getUserPostsById(myUserId),
        getUserRepostsById(myUserId),
        getMyJourneys().catch(() => ({ journeys: [] })),
      ]);

      const authoredPosts = Array.isArray(postsRes?.posts) ? postsRes.posts : [];
      const authoredMilestones = Array.isArray(postsRes?.milestones) ? postsRes.milestones : [];
      const repostBundle = repostsRes?.reposts || {};
      const repostedPosts = Array.isArray(repostBundle.posts) ? repostBundle.posts : [];
      const repostedMilestones = Array.isArray(repostBundle.milestones) ? repostBundle.milestones : [];
      const missedJourneys = (Array.isArray(journeysRes?.journeys) ? journeysRes.journeys : [])
        .filter(isMissedJourney);

      const mine = [
        ...authoredMilestones.map((milestone) => ({
          id: `journey-${milestone._id}`,
          rawType: "journey",
          data: milestone,
          isRepost: false,
          repostText: "",
          categories: getCategories("journey", false),
        })),
        ...authoredPosts.map((post) => ({
          id: `post-${post._id}`,
          rawType: "post",
          data: post,
          isRepost: false,
          repostText: "",
          categories: getCategories("post", false),
        })),
        ...repostedPosts.map((post) => ({
          id: `repost-post-${post._id}`,
          rawType: "post",
          data: post,
          isRepost: true,
          repostText: getRepostText(post),
          categories: getCategories("post", true),
        })),
        // Learning is intentionally excluded here — it's a story-style
        // format only meant to be viewed through Home's learning viewer
        // (openLearning), not listed as a regular activity item.
        ...repostedMilestones.map((milestone) => ({
          id: `repost-journey-${milestone._id}`,
          rawType: "journey",
          data: milestone,
          isRepost: true,
          repostText: getRepostText(milestone),
          categories: getCategories("journey", true),
        })),
        ...missedJourneys.map((journey) => ({
          id: `missed-journey-${journey._id}`,
          rawType: "journey",
          data: journey,
          isJourneySummary: true,
          isRepost: false,
          repostText: "",
          categories: ["Journey"],
        })),
      ].sort((a, b) => {
        const aDate = new Date(a.data?.repostedAt || a.data?.updatedAt || a.data?.createdAt || 0).getTime();
        const bDate = new Date(b.data?.repostedAt || b.data?.updatedAt || b.data?.createdAt || 0).getTime();
        return bDate - aDate;
      });

      setActivity(mine);
    } catch (error) {
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const visibleItems = useMemo(() => {
    if (activeTab === "All") return activity;
    return activity.filter((item) => item.categories.includes(activeTab));
  }, [activeTab, activity]);

  const tabCounts = useMemo(
    () =>
      TABS.reduce((counts, tab) => {
        counts[tab] =
          tab === "All"
            ? activity.length
            : activity.filter((item) => item.categories.includes(tab)).length;
        return counts;
      }, {}),
    [activity]
  );

  const changeTab = (tab) => {
    setActiveTab(tab);
    setParams({ tab });
  };

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] pb-24">
        <header className="border-b border-[var(--imc-border)] bg-[color-mix(in_srgb,var(--imc-bg)_94%,transparent)] backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Back to profile"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)] transition active:scale-95"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-[var(--imc-text)]">
                Your activity
              </h1>
              <p className="mt-0.5 text-[10.5px] font-medium text-[var(--imc-text-muted)]">
                Posts, journeys and things you shared
              </p>
            </div>

            <button
              type="button"
              onClick={loadActivity}
              disabled={loading}
              aria-label="Refresh activity"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(67,56,202,0.08)] text-[var(--imc-indigo-text)] transition active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-4 px-3">
            {TABS.map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => changeTab(tab)}
                className={`relative flex min-h-[46px] items-center justify-center gap-1 py-2 text-[10.5px] font-bold transition ${
                  activeTab === tab
                    ? "text-[var(--imc-indigo-text)] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-[var(--imc-indigo)]"
                    : "text-[var(--imc-text-muted)]"
                }`}
              >
                {tab}
                {tabCounts[tab] > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                      activeTab === tab
                        ? "bg-[rgba(67,56,202,0.10)] text-[var(--imc-indigo-text)]"
                        : "bg-[var(--imc-surface-2)] text-[var(--imc-text-faint)]"
                    }`}
                  >
                    {tabCounts[tab] > 99 ? "99+" : tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="pt-3">
          {loading && (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(67,56,202,0.08)]">
                <Loader2 className="animate-spin text-[var(--imc-indigo-text)]" size={22} />
              </div>
              <p className="text-[11px] font-medium text-[var(--imc-text-muted)]">Loading your activity</p>
            </div>
          )}

          {!loading && visibleItems.length === 0 && (
            <div className="mx-4 mt-8 rounded-[26px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-6 py-9 text-center shadow-[0_12px_32px_rgba(18,20,28,0.04)]">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[rgba(67,56,202,0.08)] text-[var(--imc-indigo-text)]">
                {activeTab === "Journey" ? <Flame size={23} /> : activeTab === "Reposts" ? <Repeat2 size={23} /> : activeTab === "Posts" ? <FileText size={23} /> : <Sparkles size={23} />}
              </div>
              <p className="mt-4 text-[16px] font-extrabold text-[var(--imc-text)]">
                No {activeTab} yet
              </p>
              <p className="mx-auto mt-1.5 max-w-[250px] text-[12px] font-medium leading-5 text-[var(--imc-text-muted)]">
                Share what you are building and your activity will appear here.
              </p>
              {(activeTab === "All" || activeTab === "Posts") && (
                <button
                  type="button"
                  onClick={() => navigate("/create-post")}
                  className="mx-auto mt-5 flex h-10 items-center justify-center gap-1.5 rounded-[14px] border border-[rgba(67,56,202,0.20)] bg-[rgba(67,56,202,0.08)] px-5 text-[11px] font-bold text-[var(--imc-indigo-text)] active:scale-[0.98]"
                >
                  <Plus size={14} /> Create a post
                </button>
              )}
            </div>
          )}

          {!loading && visibleItems.length > 0 && (
            <div className="px-3 pb-4">
              {visibleItems.map((item, index) => {
                const isJourney = item.rawType === "journey";
                // Same repostText/isRepostView shape PostCard/JourneyCard
                // read to show their inline "Your repost note" box — this
                // page was passing item.data straight through, so reposted
                // items never showed a note even when the reposter left one.
                const cardData = item.isRepost
                  ? { ...item.data, repostText: item.repostText || "", isRepostView: true }
                  : item.data;
                const card = item.isJourneySummary ? (
                  <MissedJourneyCard journey={item.data} onOpen={() => navigate(`/journey/${item.data?._id}`)} />
                ) : isJourney ? (
                  <JourneyCard milestone={cardData} />
                ) : (
                  <PostCard
                    post={cardData}
                    type="post"
                    currentUser={user}
                  />
                );

                return (
                  <div key={item.id || index} className="mb-3">
                    {item.isRepost ? (
                      <RepostCard repostText={item.repostText} currentUser={user}>
                        {card}
                      </RepostCard>
                    ) : (
                      card
                    )}
                    <div className="-mx-3 mt-3 h-2" style={{ background: "var(--imc-surface-2)" }} />
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function MissedJourneyCard({ journey = {}, onOpen }) {
  const cover = getImageUrl(journey.coverImage || journey.previewImage);
  const targetDays = Number(journey.targetDays || journey.totalDays || 100);
  const currentDay = Math.min(
    Number(journey.currentDay || journey.updatesCount || 1),
    targetDays
  );
  const progress = Math.min(Math.round((currentDay / targetDays) * 100), 100);
  const views = Number(journey?.totals?.views || journey?.viewsCount || 0);
  const note = (journey.finalNote || journey.uncompletedReason || "").trim();

  return (
    <article className="overflow-hidden rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-[0_10px_28px_rgba(18,20,28,0.05)]">
      <button type="button" onClick={onOpen} className="relative block h-[176px] w-full overflow-hidden text-left">
        {cover ? (
          <img src={cover} alt={journey.title || "Missed journey"} className="h-full w-full object-cover" />
        ) : (
          <div className="imc-lattice grid h-full w-full place-items-center bg-gradient-to-br from-[#12141C] via-[#2E2A8F] to-[#4338CA]">
            <img src={getJourneyCoverIcon()} alt="" className="h-24 w-24 rounded-full object-cover opacity-95" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold text-[#D92D20] shadow-sm">
          <Flag size={10} fill="currentColor" /> Missed this journey
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <h2 className="line-clamp-2 text-[18px] font-extrabold leading-6 text-white">
            {journey.title || "Journey"}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white/80">
            <CalendarDays size={11} /> Day {currentDay} of {targetDays}
          </p>
        </div>
      </button>

      <div className="p-3.5">
        {journey.description && (
          <p className="line-clamp-2 text-[12px] font-medium leading-5 text-[var(--imc-text-muted)]">
            {journey.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(67,56,202,0.10)]">
            <div className="h-full rounded-full bg-[var(--imc-indigo)]" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-bold text-[var(--imc-indigo-text)]">{progress}%</span>
        </div>

        <div className="mt-3 rounded-[14px] border border-[rgba(67,56,202,0.16)] bg-[var(--imc-indigo-soft)] px-3 py-2.5">
          <p className="text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--imc-indigo-text)]">
            {note ? "Final note" : "Why it was missed"}
          </p>
          <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-5 text-[var(--imc-text)]">
            {note || "A required journey update was missed. The creator can add a final reflection from the journey page."}
          </p>
        </div>

        <button type="button" onClick={onOpen} className="mt-3 flex h-10 w-full items-center justify-between rounded-[13px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-3 text-[11px] font-bold text-[var(--imc-indigo-text)] active:scale-[0.99]">
          <span className="flex items-center gap-1.5"><Eye size={13} /> {views} views</span>
          <span className="flex items-center gap-1">View journey <ArrowRight size={13} /></span>
        </button>
      </div>
    </article>
  );
}

export default ProfileActivity;
