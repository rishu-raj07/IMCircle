import { useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import TopHeader from "../../components/navigation/TopHeader";
import PostCard from "../../components/post/PostCard";
import HiringCard from "../../components/post/HiringCard";
import ProjectCard from "../../components/post/ProjectCard";
import JourneyCard from "../../components/post/JourneyCard";
import StreakCard from "../../components/streak/StreakCard";
import ShareCardModal from "../../components/streak/ShareCardModal";
import ImageLoader from "../../components/common/ImageLoader";
import { FeedSkeleton, HomePageSkeleton } from "../../components/common/Skeletons";

import { getFeed, trackFeedImpressions } from "../../api/feedApi";
import { getMyProfile } from "../../api/profileApi";
import { getUserSuggestions } from "../../api/userApi";
import { getMyBuilderScore } from "../../api/builderScoreApi";
import { getMyJourneys } from "../../api/journeyApi";
import {
  getSentCircleRequests,
  sendCircleRequest,
} from "../../api/circleRequestApi";
import { trackEvent } from "../../utils/analyticsTracker";
import { useSEO } from "../../hooks/useSEO";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const HOME_FEED_CACHE_PREFIX = "home_feed_cache_v2";
const FEED_LIMIT = 10;
const MARIGOLD = "#EC9A1E";
const INDIGO = "#4338CA";

const SEARCH_FILTERS = [
  { value: "all", label: "All" },
  { value: "journey", label: "Journey" },
  { value: "circle", label: "Community" },
  { value: "person", label: "User" },
];

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function normalizeUser(value) {
  return value?.user || value?.data?.user || value?.data || value || null;
}

function getLocalUser() {
  const possibleUser =
    normalizeUser(safeJsonParse(localStorage.getItem("user"))) ||
    normalizeUser(safeJsonParse(localStorage.getItem("currentUser"))) ||
    normalizeUser(safeJsonParse(localStorage.getItem("authUser"))) ||
    normalizeUser(safeJsonParse(localStorage.getItem("bharat_user"))) ||
    normalizeUser(safeJsonParse(localStorage.getItem("bharatUser"))) ||
    normalizeUser(safeJsonParse(localStorage.getItem("loggedInUser")));

  if (possibleUser) return possibleUser;

  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("bharat_token");
  const decoded = decodeJwt(token);

  if (!decoded) return null;

  return {
    _id: decoded.id || decoded._id || decoded.userId || decoded.sub,
    id: decoded.id || decoded._id || decoded.userId || decoded.sub,
    name: decoded.name,
    username: decoded.username,
    avatar: decoded.avatar,
    profileImage: decoded.profileImage,
    picture: decoded.picture,
    photo: decoded.photo,
  };
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getItemData(item) {
  return item?.data || item;
}

function getFeedKey(item) {
  const data = getItemData(item);
  return `${item?.type || "post"}:${getId(data)}`;
}

function mergeFeedItems(current = [], next = [], replace = false) {
  const merged = [];
  const seen = new Set();

  [...(replace ? [] : current), ...next].forEach((item) => {
    const key = getFeedKey(item);
    if (!key || key.endsWith(":") || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function getUserName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getUserInterest(user) {
  return (
    user?.primaryInterest ||
    user?.field ||
    user?.role ||
    user?.headline ||
    "Building in public"
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function isSameLocalDay(dateA, dateB = new Date()) {
  if (!dateA || !dateB) return false;
  const first = new Date(dateA);
  const second = new Date(dateB);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return false;
  return first.toDateString() === second.toDateString();
}

function getInitial(user) {
  return getUserName(user).charAt(0).toUpperCase();
}

function getImageUrl(image) {
  if (!image) return "";

  const url =
    image?.url ||
    image?.secure_url ||
    image?.path ||
    image?.avatar?.url ||
    image?.profileImage?.url ||
    image?.profilePicture?.url ||
    image?.picture ||
    image?.photo ||
    image;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getUserAvatar(user) {
  return getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.profilePhoto ||
      user?.photo ||
      user?.picture ||
      user?.image ||
      user?.profile?.avatar ||
      user?.profile?.profileImage ||
      user?.profile?.photo
  );
}

function getAuthor(data) {
  return data?.author || data?.user || data?.createdBy || data?.creator || {};
}

function normalizeCircleUser(item) {
  return item?.user || item?.member || item?.follower || item?.following || item;
}

function mergeUniqueUsers(users = []) {
  const seen = new Set();
  const merged = [];

  users.filter(Boolean).forEach((user) => {
    const id = String(getId(user));
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(user);
  });

  return merged;
}

function normalizeRequestList(response) {
  const list =
    response?.requests ||
    response?.data?.requests ||
    response?.circleRequests ||
    response?.data?.circleRequests ||
    response?.data ||
    response;

  return Array.isArray(list) ? list : [];
}

function getPendingReceiverId(request) {
  return getId(
    request?.receiver ||
      request?.receiverId ||
      request?.to ||
      request?.user ||
      request?.targetUser
  );
}

function getCachedHomeFeed(tab) {
  const cached = safeJsonParse(localStorage.getItem(`${HOME_FEED_CACHE_PREFIX}_${tab}`));
  if (!cached || !Array.isArray(cached.items)) return null;

  return {
    items: cached.items,
    nextCursor: cached.nextCursor || null,
    hasMore: cached.hasMore !== false,
    page: Number(cached.page) || 1,
  };
}

function cacheHomeFeed(tab, state) {
  try {
    localStorage.setItem(
      `${HOME_FEED_CACHE_PREFIX}_${tab}`,
      JSON.stringify({
        items: state.items.slice(0, 30),
        nextCursor: state.nextCursor,
        hasMore: state.hasMore,
        page: state.page,
        cachedAt: Date.now(),
      })
    );
  } catch {
    // Fresh network data can still render if storage is full.
  }
}

function Home() {
  const navigate = useNavigate();
  useSEO({
    title: "Home Feed",
    description: "Your IMCircle home feed — journeys, posts, and updates from your circle.",
    path: "/home",
  });

  const initialFeedCache = getCachedHomeFeed("for-you");

  const [me, setMe] = useState(null);
  const [circleUsers, setCircleUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [requestedUserIds, setRequestedUserIds] = useState([]);
  const activeTab = "for-you";
  const [items, setItems] = useState(() => initialFeedCache?.items || []);
  const [page, setPage] = useState(() => initialFeedCache?.page || 1);
  const [cursor, setCursor] = useState(() => initialFeedCache?.nextCursor || null);
  const [hasMore, setHasMore] = useState(() => initialFeedCache?.hasMore ?? true);
  const [isLoading, setIsLoading] = useState(() => !initialFeedCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState("");
  const [builderScore, setBuilderScore] = useState(null);
  const [showStreakShare, setShowStreakShare] = useState(false);
  const [activeJourneyId, setActiveJourneyId] = useState(null);
  const [activeJourneyUpdatedToday, setActiveJourneyUpdatedToday] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [searchFilter, setSearchFilter] = useState("all");
  const [watchedLearningIds, setWatchedLearningIds] = useState(() => {
    return safeJsonParse(localStorage.getItem("watched_learning_ids")) || [];
  });

  const pullStartYRef = useRef(null);
  const seenInSessionRef = useRef(new Set());
  const visibleTimersRef = useRef(new Map());
  const sentinelRef = useRef(null);
  const itemObserverRef = useRef(null);
  const requestSeqRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const sessionIdRef = useRef(
    sessionStorage.getItem("imcircle_feed_session_id") ||
      `feed_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const learningItems = items.filter((item) => item?.type === "learning");
  const feedItems = items.filter((item) => item?.type !== "learning");
  const streakPromptDoneToday =
    activeJourneyUpdatedToday || isSameLocalDay(builderScore?.lastActiveDate);

  useEffect(() => {
    sessionStorage.setItem("imcircle_feed_session_id", sessionIdRef.current);
    trackEvent("feed_open", { metadata: { tab: activeTab } }).catch(() => {});
  }, []);

  useEffect(() => {
    setMe(getLocalUser());

    const loadProfileCircle = async () => {
      try {
        const [data, suggestionsRes, sentRequestsRes] = await Promise.all([
          getMyProfile(),
          getUserSuggestions().catch(() => ({ users: [] })),
          getSentCircleRequests().catch(() => ({ requests: [] })),
        ]);
        const user = data?.user || data?.data?.user || data?.data || data;

        setMe(user || getLocalUser());

        const circle =
          user?.circle ||
          user?.circles ||
          user?.circleUsers ||
          user?.myCircle ||
          [];

        const circleUsers = mergeUniqueUsers(
          Array.isArray(circle) ? circle.map(normalizeCircleUser).filter(Boolean) : []
        );
        const currentUserId = String(getId(user));
        const rawSuggestions = suggestionsRes?.users || suggestionsRes?.data?.users || [];
        const circleUserIds = new Set(circleUsers.map((item) => String(getId(item))));
        const pendingReceiverIds = normalizeRequestList(sentRequestsRes)
          .filter((request) => !request?.status || request.status === "pending")
          .map((request) => String(getPendingReceiverId(request)))
          .filter(Boolean);

        setCircleUsers(circleUsers);
        setRequestedUserIds([...new Set(pendingReceiverIds)]);
        setSuggestedUsers(
          rawSuggestions
            .filter((item) => {
              const userId = String(getId(item));
              return userId && userId !== currentUserId && !circleUserIds.has(userId);
            })
            .slice(0, 12)
        );
      } catch {
        setCircleUsers([]);
        setSuggestedUsers([]);
      }
    };

    const loadBuilderScore = async () => {
      try {
        const res = await getMyBuilderScore();
        setBuilderScore(res?.builderScore || res?.data?.builderScore || null);
      } catch {
        setBuilderScore(null);
      }
    };

    const loadActiveJourney = async () => {
      try {
        const res = await getMyJourneys();
        const rawJourneys =
          res?.journeys ||
          res?.data?.journeys ||
          res?.data?.items ||
          res?.items ||
          res?.data ||
          res ||
          [];
        const journeys = Array.isArray(rawJourneys) ? rawJourneys : [];
        const active = journeys.find(
          (journey) => journey?.status !== "completed" && journey?.status !== "uncompleted"
        );

        setActiveJourneyId(active?._id || null);
        setActiveJourneyUpdatedToday(
          Boolean(active?.todayUpdateDone) || isSameLocalDay(active?.lastMilestoneAt)
        );
      } catch {
        setActiveJourneyId(null);
        setActiveJourneyUpdatedToday(false);
      }
    };

    loadProfileCircle();
    loadBuilderScore();
    loadActiveJourney();
  }, []);

  const saveWatchedLearning = (id) => {
    if (!id) return;

    setWatchedLearningIds((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem("watched_learning_ids", JSON.stringify(next));
      return next;
    });
  };

  const fetchFeed = async ({ mode = "initial", tab = activeTab } = {}) => {
    const isInitial = mode === "initial";
    const isRefresh = mode === "refresh";
    const isMore = mode === "more";

    if (isMore && (loadingMoreRef.current || !hasMore)) return;

    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    loadingMoreRef.current = isMore;

    if (isInitial) setIsLoading(true);
    if (isRefresh) setIsRefreshing(true);
    if (isMore) setIsFetchingMore(true);
    setError("");

    try {
      const nextPage = isMore ? page + 1 : 1;
      const res = await getFeed({
        tab,
        page: nextPage,
        limit: FEED_LIMIT,
        cursor: isMore ? cursor : undefined,
        refresh: isRefresh ? "true" : undefined,
      });

      if (requestSeqRef.current !== seq) return;

      const incoming = Array.isArray(res?.items)
        ? res.items.map((item) => ({
            type: item.type,
            originalType: item.originalType,
            data: item.data || item,
            createdAt: item.createdAt,
            score: item.score,
            engagement: item.engagement,
            viewerState: item.viewerState,
          }))
        : Array.isArray(res?.feed)
        ? res.feed
        : [];

      setItems((prev) => {
        const merged = mergeFeedItems(prev, incoming, !isMore);
        cacheHomeFeed(tab, {
          items: merged,
          nextCursor: res?.nextCursor || null,
          hasMore: Boolean(res?.hasMore),
          page: nextPage,
        });
        return merged;
      });
      setCursor(res?.nextCursor || null);
      setHasMore(Boolean(res?.hasMore));
      setPage(nextPage);

      if (isRefresh) trackEvent("feed_refresh", { metadata: { tab } }).catch(() => {});
      if (isMore) trackEvent("feed_scroll", { metadata: { tab, page: nextPage } }).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load feed");
      if (isInitial) setItems([]);
    } finally {
      if (isInitial) setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
      if (isMore) setIsFetchingMore(false);
      loadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    const cached = getCachedHomeFeed(activeTab);

    requestSeqRef.current += 1;
    seenInSessionRef.current.clear();
    visibleTimersRef.current.clear();
    setCursor(cached?.nextCursor || null);
    setHasMore(cached?.hasMore ?? true);
    setPage(cached?.page || 1);
    setItems(cached?.items || []);
    setError("");
    setIsLoading(!cached);

    fetchFeed({ mode: "initial", tab: activeTab });
  }, [activeTab]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !isRefreshing && hasMore) {
          fetchFeed({ mode: "more" });
        }
      },
      { root: null, rootMargin: "650px 0px 650px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, hasMore, isLoading, isRefreshing, activeTab]);

  useEffect(() => {
    itemObserverRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.dataset.feedKey;
          if (!key || seenInSessionRef.current.has(key)) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (!visibleTimersRef.current.has(key)) {
              const timeout = window.setTimeout(async () => {
                const [itemType, itemId] = key.split(":");
                const position = Number(entry.target.dataset.feedPosition || 0);
                seenInSessionRef.current.add(key);
                visibleTimersRef.current.delete(key);

                const payload = [
                  {
                    itemId,
                    itemType,
                    visibleMs: 1000,
                    position,
                    sessionId: sessionIdRef.current,
                  },
                ];

                try {
                  await trackFeedImpressions(payload);
                  trackEvent("feed_item_seen", {
                    entityType: itemType,
                    entityId: itemId,
                    metadata: { position, tab: activeTab },
                  }).catch(() => {});
                  trackEvent("feed_item_view_duration", {
                    entityType: itemType,
                    entityId: itemId,
                    metadata: { visibleMs: 1000, position, tab: activeTab },
                  }).catch(() => {});
                  trackEvent("impression_created", {
                    entityType: itemType,
                    entityId: itemId,
                    metadata: { position, tab: activeTab },
                  }).catch(() => {});
                } catch {
                  // Impression tracking should never block browsing.
                }
              }, 1000);

              visibleTimersRef.current.set(key, timeout);
            }
          } else {
            const timeout = visibleTimersRef.current.get(key);
            if (timeout) {
              window.clearTimeout(timeout);
              visibleTimersRef.current.delete(key);
            }
          }
        });
      },
      { threshold: [0, 0.55, 1] }
    );

    itemObserverRef.current = observer;
    document.querySelectorAll("[data-feed-key]").forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      visibleTimersRef.current.forEach((timeout) => window.clearTimeout(timeout));
      visibleTimersRef.current.clear();
    };
  }, [feedItems, activeTab]);

  const handleRefresh = () => {
    if (isLoading) return;
    setCursor(null);
    setPage(1);
    setHasMore(true);
    fetchFeed({ mode: "refresh" });
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      pullStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (!pullStartYRef.current || window.scrollY !== 0 || isLoading) return;
    const distance = e.touches[0].clientY - pullStartYRef.current;
    if (distance > 80) setIsRefreshing(true);
  };

  const handleTouchEnd = () => {
    if (isRefreshing && !isLoading) handleRefresh();
    pullStartYRef.current = null;
  };

  const openLearning = (learning, storyAuthorIds = []) => {
    const id = learning?._id;
    saveWatchedLearning(id);
    if (!id) return;
    navigate(`/learning-view/${id}`, { state: { learning, storyAuthorIds } });
  };

  const handleCircleRequest = async (userId) => {
    const requestUserId = String(userId || "");
    if (!requestUserId || requestedUserIds.includes(requestUserId)) return;

    setRequestedUserIds((prev) => [...new Set([...prev, requestUserId])]);

    try {
      await sendCircleRequest(requestUserId);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "";
      const canKeepRequested =
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("pending");

      if (!canKeepRequested) {
        setRequestedUserIds((prev) => prev.filter((id) => id !== requestUserId));
      }
    }
  };

  const getLearningByUserId = (userId) => {
    return learningItems.find((item) => {
      const data = getItemData(item);
      const author = getAuthor(data);
      return String(getId(author)) === String(userId);
    });
  };

  const renderLearningCircles = () => {
    const myAvatar = getUserAvatar(me);
    const myLearningItem = learningItems.find((item) => {
      const data = getItemData(item);
      const author = getAuthor(data);
      return String(getId(author)) === String(getId(me));
    });

    const myLearning = getItemData(myLearningItem);
    const isMyLearningWatched = watchedLearningIds.includes(myLearning?._id);
    const circleStoryUsers = circleUsers
      .map((user) => {
        const learningItem = getLearningByUserId(getId(user));
        const learning = getItemData(learningItem);
        return learning?._id ? { user, learning } : null;
      })
      .filter(Boolean);
    const storyAuthorIds = [
      ...(myLearning?._id ? [String(getId(me))] : []),
      ...circleStoryUsers.map(({ user }) => String(getId(user))),
    ].filter(Boolean);

    return (
      <section className="mt-3">
        <div className="mb-2 px-1">
          <h2 className="font-serif text-[15px] font-semibold" style={{ color: "var(--imc-text)" }}>
            What did you learn today?
          </h2>
        </div>

        <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
          <button
            type="button"
            onClick={() => {
              if (myLearning?._id) {
                openLearning(myLearning, storyAuthorIds);
              } else {
                navigate("/create-learning");
              }
            }}
            className="group flex min-w-[64px] flex-col items-center active:scale-95"
          >
            <div
              className={`relative grid h-[56px] w-[56px] place-items-center rounded-full p-[2.5px] ${
                myLearning?._id && !isMyLearningWatched
                  ? "imc-ring"
                  : myLearning?._id
                  ? ""
                  : "imc-ring"
              }`}
              style={myLearning?._id && isMyLearningWatched ? { background: "var(--imc-border)" } : undefined}
            >
              <div className="grid h-full w-full place-items-center rounded-full" style={{ background: "var(--imc-surface)" }}>
                {myAvatar ? (
                  <ImageLoader
                    src={myAvatar}
                    alt="My Learning"
                    referrerPolicy="no-referrer"
                    className="h-[46px] w-[46px] rounded-full object-cover"
                    wrapperClassName="h-[46px] w-[46px] rounded-full"
                    width={96}
                  />
                ) : (
                  <div
                    className="grid h-[46px] w-[46px] place-items-center rounded-full font-serif text-[15px] font-semibold"
                    style={{ background: "var(--imc-surface-strong)", color: MARIGOLD }}
                  >
                    {getInitial(me)}
                  </div>
                )}
              </div>

              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/create-learning");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    navigate("/create-learning");
                  }
                }}
                className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2"
                style={{ background: MARIGOLD, color: "var(--imc-text)", "--tw-ring-color": "var(--imc-surface)" }}
              >
                <Plus size={12} strokeWidth={3} />
              </span>
            </div>

            <span className="mt-1 max-w-[64px] truncate text-center text-[10px] font-black" style={{ color: "var(--imc-text)" }}>
              My Learning
            </span>
          </button>

          {circleStoryUsers.slice(0, 12).map(({ user, learning }, index) => {
            const userId = getId(user);
            const avatarUrl = getUserAvatar(user);
            const isWatched = watchedLearningIds.includes(learning?._id);

            return (
              <button
                type="button"
                key={userId || index}
                onClick={() => openLearning(learning, storyAuthorIds)}
                className="group flex min-w-[64px] flex-col items-center active:scale-95"
              >
                <div
                  className={`relative grid h-[56px] w-[56px] place-items-center rounded-full p-[2.5px] ${
                    isWatched ? "" : "imc-ring"
                  }`}
                  style={isWatched ? { background: "var(--imc-border)" } : undefined}
                >
                  <div className="grid h-full w-full place-items-center rounded-full" style={{ background: "var(--imc-surface)" }}>
                    {avatarUrl ? (
                      <ImageLoader
                        src={avatarUrl}
                        alt={getUserName(user)}
                        referrerPolicy="no-referrer"
                        className="h-[46px] w-[46px] rounded-full object-cover"
                        wrapperClassName="h-[46px] w-[46px] rounded-full"
                        width={96}
                      />
                    ) : (
                      <div
                        className="grid h-[46px] w-[46px] place-items-center rounded-full font-serif text-[14px] font-semibold"
                        style={{ background: "var(--imc-surface-strong)", color: MARIGOLD }}
                      >
                        {getInitial(user)}
                      </div>
                    )}
                  </div>
                </div>

                <span className="mt-1 max-w-[64px] truncate text-center text-[10px] font-black" style={{ color: "var(--imc-text)" }}>
                  {getUserName(user)}
                </span>
              </button>
            );
          })}

          {suggestedUsers.map((user) => {
            const userId = String(getId(user));
            const avatarUrl = getUserAvatar(user);
            const requested = requestedUserIds.includes(userId);

            return (
              <div key={userId} className="flex min-w-[64px] flex-col items-center">
                <div className="relative grid h-[56px] w-[56px] place-items-center rounded-full p-[2.5px]" style={{ background: "var(--imc-border)" }}>
                  <div className="grid h-full w-full place-items-center rounded-full" style={{ background: "var(--imc-surface)" }}>
                    {avatarUrl ? (
                      <ImageLoader
                        src={avatarUrl}
                        alt={getUserName(user)}
                        referrerPolicy="no-referrer"
                        className="h-[46px] w-[46px] rounded-full object-cover"
                        wrapperClassName="h-[46px] w-[46px] rounded-full"
                        width={96}
                      />
                    ) : (
                      <div
                        className="grid h-[46px] w-[46px] place-items-center rounded-full font-serif text-[14px] font-semibold"
                        style={{ background: "var(--imc-surface-strong)", color: MARIGOLD }}
                      >
                        {getInitial(user)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCircleRequest(userId)}
                    disabled={requested}
                    className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 disabled:opacity-80"
                    style={{ background: requested ? "var(--imc-indigo)" : MARIGOLD, color: "white", "--tw-ring-color": "var(--imc-surface)" }}
                  >
                    {requested ? <Check size={11} strokeWidth={3} /> : <UserPlus size={11} strokeWidth={3} />}
                  </button>
                </div>

                <span className="mt-1 max-w-[64px] truncate text-center text-[10px] font-black" style={{ color: "var(--imc-text)" }}>
                  {getUserName(user)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderFeedItem = (item, index) => {
    const type = item?.type || "post";
    const data = getItemData(item);
    const key = getFeedKey(item) || `${type}:${index}`;
    const wrapperProps = {
      "data-feed-key": key,
      "data-feed-position": index,
    };

    let content;

    if (type === "opportunity" || type === "job" || type === "hiring") {
      content = <HiringCard opportunity={data} />;
    } else if (type === "project") {
      content = <ProjectCard item={data} />;
    } else if (type === "journey_milestone" || type === "journey") {
      content = <JourneyCard milestone={data} />;
    } else {
      content = <PostCard post={data} type={type === "learning" ? "learning" : "post"} currentUser={me} />;
    }

    // React 19 disallows spreading an object that contains `key` into JSX
    // (it must be passed as a direct, literal prop) — pass it explicitly
    // here instead of inside wrapperProps.
    return (
      <div key={key} {...wrapperProps}>
        {content}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-24"
        style={{ background: "var(--imc-bg)" }}
      >
        <BrandStyles />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg className="absolute -right-24 -top-28 h-[420px] w-[420px] opacity-[0.35]" viewBox="0 0 420 420" fill="none">
            <circle cx="210" cy="210" r="209" stroke={INDIGO} strokeOpacity="0.14" />
            <circle cx="210" cy="210" r="160" stroke={INDIGO} strokeOpacity="0.18" />
            <circle cx="210" cy="210" r="112" stroke={MARIGOLD} strokeOpacity="0.16" />
          </svg>
        </div>

        <div className="relative">
          <div className="px-3 pt-2">
            <TopHeader />
          </div>

          {(isRefreshing || isFetchingMore) && (
            <div className="py-2 text-center text-[11px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
              {isRefreshing ? "Refreshing feed..." : "Loading more..."}
            </div>
          )}

          <div className="px-4">
            <h1 className="font-serif text-[22px] font-semibold leading-tight" style={{ color: "var(--imc-text)" }}>
              {getGreeting()}, {getUserName(me).split(" ")[0]}
            </h1>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/search?type=${searchFilter}`)}
                className="flex h-[48px] flex-1 items-center gap-3 rounded-[18px] px-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
              >
                <Search size={18} style={{ color: "var(--imc-text)" }} strokeWidth={2.25} />
                <span className="text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  Search people, posts, journeys
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className="grid h-[48px] w-[48px] place-items-center rounded-[18px] shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}
              >
                <SlidersHorizontal size={18} style={{ color: "var(--imc-text)" }} strokeWidth={2.25} />
              </button>
            </div>

            {builderScore && !streakPromptDoneToday && (
              <div className="mt-3">
                <StreakCard
                  builderScore={builderScore}
                  compact
                  variant="prompt"
                  hasActiveJourney={Boolean(activeJourneyId)}
                  onPrimaryAction={() =>
                    navigate(activeJourneyId ? `/journey/${activeJourneyId}/update` : "/create-journey")
                  }
                />
              </div>
            )}

            {renderLearningCircles()}

          </div>

          <div className="mt-4 space-y-3 px-4">
            {isLoading && items.length === 0 && <HomePageSkeleton />}

            {!isLoading && error && items.length === 0 && (
              <div className="rounded-[22px] p-4 text-center" style={{ background: "rgba(217,45,32,0.08)", border: "1px solid rgba(217,45,32,0.25)" }}>
                <p className="text-[13px] font-black text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchFeed({ mode: "initial" })}
                  className="mt-3 rounded-full bg-red-600 px-4 py-2 text-[12px] font-black text-white"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !error && feedItems.length === 0 && (
              <div className="rounded-[22px] p-5 text-center" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                <p className="text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                  No feed yet
                </p>
                <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  Follow builders or share your first update.
                </p>
              </div>
            )}

            {feedItems.map(renderFeedItem)}

            {items.length > 0 && isFetchingMore && (
              <div className="py-3">
                <FeedSkeleton count={1} />
              </div>
            )}

            <div ref={sentinelRef} className="h-10" />

            {items.length > 0 && !hasMore && (
              <p className="pb-4 text-center text-[11px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                You are caught up
              </p>
            )}

            {items.length > 0 && hasMore && !isFetchingMore && (
              <div className="flex justify-center pb-4">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--imc-text-muted)" }} />
              </div>
            )}
          </div>
        </div>

        <BottomNav />

        <ShareCardModal
          open={showStreakShare}
          onClose={() => setShowStreakShare(false)}
          kind="streak"
          filename="imcircle-streak.png"
          shareText={`I'm on a ${builderScore?.currentStreak || 0}-day streak building on IMCircle`}
          data={{
            name: getUserName(me),
            avatarUrl: getUserAvatar(me),
            streak: builderScore?.currentStreak || 0,
            longestStreak: builderScore?.longestStreak || 0,
            level: builderScore?.level || "Explorer",
            interest: getUserInterest(me),
          }}
        />

        {showFilterSheet && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4"
            onClick={() => setShowFilterSheet(false)}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

              <h3 className="text-[16px] font-black" style={{ color: "var(--imc-text)" }}>
                Filter search
              </h3>
              <p className="mt-1 text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                Choose what you want the search bar to look through.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {SEARCH_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSearchFilter(option.value)}
                    className={`h-11 rounded-2xl text-[13px] font-black active:scale-[0.98] ${
                      searchFilter === option.value
                        ? "bg-[var(--imc-indigo)] text-white"
                        : "border border-[var(--imc-border)] text-[var(--imc-text-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowFilterSheet(false);
                  navigate(`/search?type=${searchFilter}`);
                }}
                className="mt-5 h-12 w-full rounded-2xl bg-[var(--imc-indigo)] text-[13px] font-black text-white active:scale-[0.98]"
              >
                Apply filter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandStyles() {
  return (
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .imc-ring {
        background: conic-gradient(from 210deg, ${MARIGOLD}, ${INDIGO} 55%, ${MARIGOLD} 100%);
      }
    `}</style>
  );
}

export default Home;
