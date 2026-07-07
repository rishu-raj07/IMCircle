import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Repeat2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import BottomNav from "../../components/navigation/BottomNav";
import { getMyProfile } from "../../api/profileApi";
import { getFeed } from "../../api/feedApi";
import RepostCard from "../../components/post/RepostCard";
const TABS = ["All", "Posts", "Journey", "Reposts"];

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

function getCategories(rawType, isRepost) {
  const categories = [];

  if (rawType === "journey") categories.push("Journey");
  else if (rawType !== "learning") categories.push("Posts");
  else categories.push("Posts");

  if (isRepost) categories.push("Reposts");

  return categories;
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

      const feedData = await getFeed({
        tab: "for-you",
        limit: 100,
        page: 1,
      });

      const feed = normalizeFeed(feedData);

      const mine = feed
        .map((item) => {
          const rawType = getRawType(item);
          const data = getData(item);

          const ownerId = getOwnerId(data);

          const isOwn =
            ownerId && myUserId && String(ownerId) === String(myUserId);

          const isRepost = isReposted(data);

          if (!isOwn && !isRepost) return null;

          if (rawType === "learning") return null;

          return {
            id: `${rawType}-${data?._id || item?._id}`,
            rawType,
            data,
            isRepost,
            repostText: getRepostText(data),
            categories: getCategories(rawType, isRepost),
          };
        })
          .filter(Boolean);

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

  const changeTab = (tab) => {
    setActiveTab(tab);
    setParams({ tab });
  };

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-surface)]">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface)] pb-24">
        <header className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
            >
              <ArrowLeft size={19} />
            </button>

            <h1 className="text-[19px] font-black text-[var(--imc-text)]">
              {activeTab} Activity
            </h1>
          </div>

          <div className="mt-4 grid grid-cols-4 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)]/70 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => changeTab(tab)}
                className={`rounded-xl py-2 text-[10.5px] font-black transition ${
                  activeTab === tab
                    ? "bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm"
                    : "text-[var(--imc-text-muted)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <main className="px-5 pt-4">
          {loading && (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="animate-spin text-[var(--imc-indigo-text)]" size={24} />
            </div>
          )}

          {!loading && visibleItems.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface)] p-5 text-center">
              <p className="text-[15px] font-black text-[var(--imc-text)]">
                No {activeTab} yet
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                Your activity will appear here.
              </p>
            </div>
          )}

          {!loading && visibleItems.length > 0 && (
            <div className="space-y-4">
              {visibleItems.map((item, index) => {
                const isJourney = item.rawType === "journey";
                const card = isJourney ? (
                  <JourneyCard milestone={item.data} />
                ) : (
                  <PostCard
                    post={item.isRepost ? buildRepostPost(item) : item.data}
                    type="post"
                    currentUser={user}
                  />
                );

                return (
                  <div key={item.id || index} className="-mx-2">
                    {item.isRepost ? (
                     <RepostCard repostText={item.repostText} currentUser={user}>
  {card}
</RepostCard>
                    ) : (
                      card
                    )}
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

function RepostShell({ repostText, children }) {
  return (
    <div className="mx-2 overflow-hidden rounded-[24px] bg-[var(--imc-surface-2)] pb-3">
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] font-black text-[var(--imc-indigo-text)]">
          <Repeat2 size={14} />
          You reposted this
        </div>

        {repostText && (
          <p className="mt-2 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[#2B2E38]">
            {repostText}
          </p>
        )}
      </div>

      <div className="mx-2 overflow-hidden rounded-[22px] bg-[var(--imc-surface)]">
        {children}
      </div>
    </div>
  );
}

export default ProfileActivity;
