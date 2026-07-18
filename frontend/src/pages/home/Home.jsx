import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Loader2,
  PenSquare,
  Plus,
  Sparkles,
  UserPlus,
  UserCheck,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasDiscoverabilityBasics } from "../../utils/sessionUser";

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
import { getMyLearnings } from "../../api/learningApi";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getJourneyCoverIcon } from "../../utils/media";
import {
  getSentCircleRequests,
  getReceivedCircleRequests,
  sendCircleRequest,
  acceptCircleRequest,
} from "../../api/circleRequestApi";
import { trackEvent } from "../../utils/analyticsTracker";
import { balanceFeedRhythm } from "../../utils/feedRhythm";
import { useSEO } from "../../hooks/useSEO";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const HOME_FEED_CACHE_PREFIX = "home_feed_cache_v2";
const HOME_TAB_STORAGE_KEY = "imcircle_home_tab";
const FEED_LIMIT = 10;
// Dismissible "complete your profile" nudge — non-blocking, never a
// full-screen takeover. Dismissing it snoozes it for 24h rather than
// forever, so it resurfaces as a gentle reminder rather than disappearing
// permanently for someone who just wanted it out of the way for now.
const PROFILE_CARD_DISMISS_KEY = "imcircle_profile_card_dismissed_at";
const PROFILE_CARD_SNOOZE_MS = 24 * 60 * 60 * 1000;
const MARIGOLD = "#EC9A1E";
const INDIGO = "#4338CA";

// Home only ever shows these two — Circles/Learning/Opportunities tabs some
// designs sketch out aren't wired to a finished experience yet, and
// Discover already has its own destination in the bottom nav, so it isn't
// duplicated here as a third tab.
const HOME_TABS = [
  { value: "for-you", label: "For You" },
  { value: "following", label: "Following" },
];

function getStoredHomeTab() {
  const stored = sessionStorage.getItem(HOME_TAB_STORAGE_KEY);
  return HOME_TABS.some((tab) => tab.value === stored) ? stored : "for-you";
}

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

function getUserLocation(user) {
  const location = user?.location;
  if (typeof location === "string" && location.trim()) return location.trim();
  return [location?.city || user?.city, location?.state || user?.state, location?.country || user?.country]
    .filter(Boolean)
    .join(", ");
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
  const location = useLocation();
  useSEO({
    title: "Home Feed",
    description: "Your IMCircle home feed — journeys, posts, and updates from your circle.",
    path: "/home",
  });

  const [activeTab, setActiveTab] = useState(getStoredHomeTab);
  const initialFeedCache = getCachedHomeFeed(activeTab);

  const [me, setMe] = useState(null);
  const [circleUsers, setCircleUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [requestedUserIds, setRequestedUserIds] = useState([]);
  // userId -> that pending CircleRequest's id, for people who already sent
  // ME a request. Tapping their badge should accept theirs, not send a
  // second, redundant one.
  const [incomingRequestByUserId, setIncomingRequestByUserId] = useState({});
  const [acceptingUserId, setAcceptingUserId] = useState("");
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
  const [activeJourneys, setActiveJourneys] = useState([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [searchFilter, setSearchFilter] = useState("all");
  const [profileCardDismissed, setProfileCardDismissed] = useState(() => {
    const dismissedAt = Number(localStorage.getItem(PROFILE_CARD_DISMISS_KEY)) || 0;
    return dismissedAt > 0 && Date.now() - dismissedAt < PROFILE_CARD_SNOOZE_MS;
  });
  const [watchedLearningIds, setWatchedLearningIds] = useState(() => {
    return safeJsonParse(localStorage.getItem("watched_learning_ids")) || [];
  });
  const [myLearning, setMyLearning] = useState(null);

  const composeNavigatingRef = useRef(false);
  // Set once on mount from location.state.newPost (see CreatePost.jsx) and
  // consumed exactly once by the next "initial" fetchFeed — pinned to the
  // top of whatever the server returns, then cleared so it doesn't keep
  // forcing an old post back to the top on later refreshes/remounts.
  const pendingNewPostRef = useRef(null);
  const pullStartYRef = useRef(null);
  const pullTriggeredRef = useRef(false);
  const seenInSessionRef = useRef(new Set());
  const visibleTimersRef = useRef(new Map());
  const sentinelRef = useRef(null);
  const fifthPostRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const itemObserverRef = useRef(null);
  const requestSeqRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const sessionIdRef = useRef(
    sessionStorage.getItem("imcircle_feed_session_id") ||
      `feed_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const learningItems = items.filter((item) => item?.type === "learning");
  const feedItems = balanceFeedRhythm(items.filter((item) => item?.type !== "learning"));
  // Encourage-don't-block: tagline + interest + location are never required
  // to reach or use Home, but the card nudges toward them since they drive
  // discoverability (recommendations/search/Circle suggestions). Hidden
  // once those are filled in, or while snoozed after a dismiss.
  const showProfileCard =
    Boolean(me) && !profileCardDismissed && !hasDiscoverabilityBasics(me);
  const dismissProfileCard = () => {
    localStorage.setItem(PROFILE_CARD_DISMISS_KEY, String(Date.now()));
    setProfileCardDismissed(true);
  };
  const journeysNeedingUpdate = activeJourneys.filter(
    (journey) =>
      !Boolean(journey?.todayUpdateDone) &&
      !isSameLocalDay(journey?.lastMilestoneAt)
  );

  useEffect(() => {
    if (!location.state?.openStreakCard || (builderScore?.currentStreak || 0) < 1) return;
    setShowStreakShare(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [builderScore?.currentStreak, location.pathname, location.state, navigate]);

  useEffect(() => {
    sessionStorage.setItem("imcircle_feed_session_id", sessionIdRef.current);
    trackEvent("feed_open", { metadata: { tab: activeTab } }).catch(() => {});
  }, []);

  useEffect(() => {
    setMe(getLocalUser());

    const loadProfileCircle = async () => {
      try {
        const [data, suggestionsRes, sentRequestsRes, receivedRequestsRes, myLearningsRes] = await Promise.all([
          getMyProfile(),
          getUserSuggestions().catch(() => ({ users: [] })),
          getSentCircleRequests().catch(() => ({ requests: [] })),
          getReceivedCircleRequests().catch(() => ({ requests: [] })),
          getMyLearnings().catch(() => ({ learnings: [] })),
        ]);
        const user = data?.user || data?.data?.user || data?.data || data;

        setMe(user || getLocalUser());

        // The "My Learning" ring used to be derived by searching for the
        // viewer's own post inside `items` — the home feed's own paginated,
        // ranked list. That only works if today's learning happens to land
        // within whatever page/rank the feed has loaded so far; once other
        // content outranks it or it's not on the currently-loaded page, the
        // search comes back empty and the ring falls back to "you have no
        // learning today", sending a tap straight to /create-learning even
        // though the post genuinely exists. /learnings/my is a dedicated,
        // unpaginated endpoint scoped to just the viewer's own active
        // (non-expired) learning, so it's authoritative regardless of feed
        // ranking/pagination.
        const myLearnings =
          myLearningsRes?.learnings || myLearningsRes?.data?.learnings || [];
        setMyLearning(myLearnings[0] || null);

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

        const incomingByUserId = {};
        normalizeRequestList(receivedRequestsRes)
          .filter((request) => !request?.status || request.status === "pending")
          .forEach((request) => {
            const senderId = String(getId(request?.sender));
            const requestId = String(getId(request));
            if (senderId && requestId) incomingByUserId[senderId] = requestId;
          });

        setCircleUsers(circleUsers);
        setRequestedUserIds([...new Set(pendingReceiverIds)]);
        setIncomingRequestByUserId(incomingByUserId);
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
        const active = journeys.filter(
          (journey) => journey?.status !== "completed" && journey?.status !== "uncompleted"
        );

        setActiveJourneys(active);
      } catch {
        setActiveJourneys([]);
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
        sessionId: sessionIdRef.current,
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
        let merged = mergeFeedItems(prev, incoming, !isMore);

        // Pin a just-created post (handed off via navigation state from
        // CreatePost.jsx) to the very top — the feed's ranking is
        // engagement/score-based, not pure recency, so a brand-new post
        // with zero engagement isn't guaranteed to land at the top of
        // `incoming` on its own even on a completely fresh fetch. Only
        // applies once, to the initial fetch right after posting; consumed
        // (set to null) immediately so it doesn't keep overriding the
        // feed's real ranking on every later refresh.
        if (isInitial && pendingNewPostRef.current) {
          const pinnedId = String(pendingNewPostRef.current._id || "");
          const withoutDuplicate = merged.filter(
            (item) => String(getItemData(item)?._id || "") !== pinnedId
          );
          merged = [
            {
              type: "post",
              data: pendingNewPostRef.current,
              createdAt: pendingNewPostRef.current.createdAt,
            },
            ...withoutDuplicate,
          ];
          pendingNewPostRef.current = null;
        }

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
    } catch {
      setError("feed-unavailable");
      if (isInitial) setItems([]);
    } finally {
      if (isInitial) setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
      if (isMore) setIsFetchingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Runs once on mount, before the cache-restore/fetch effect below (React
  // commits effects in declaration order) — captures a just-created post
  // handed off from CreatePost.jsx into a ref the initial fetchFeed call
  // reads synchronously, then immediately clears the navigation state so
  // browser back/forward or a later remount of this same route doesn't
  // keep re-pinning an old post to the top forever.
  useEffect(() => {
    const newPost = location.state?.newPost;
    if (!newPost) return;

    pendingNewPostRef.current = newPost;
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // "Scroll to top" floating button — appears once the 5th feed post has
  // scrolled past the top of the viewport, not on a fixed pixel threshold
  // (post heights vary a lot: a bare text post vs. a photo/video card), so
  // "after 5 posts" stays accurate regardless of what's actually in the
  // feed. Hidden again if the user scrolls back up above it.
  useEffect(() => {
    const node = fifthPostRef.current;
    if (!node) {
      setShowScrollTop(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollTop(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [feedItems]);

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

  const changeTab = (tab) => {
    if (tab === activeTab) return;
    sessionStorage.setItem(HOME_TAB_STORAGE_KEY, tab);
    setActiveTab(tab);
  };

  const handleRefresh = () => {
    if (isLoading) return;
    setCursor(null);
    setPage(1);
    setHasMore(true);
    fetchFeed({ mode: "refresh" });
  };

  const handleTouchStart = (e) => {
    // Only arm the gesture if it STARTS at the very top — captured once
    // here, not re-checked on every move.
    pullStartYRef.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    pullTriggeredRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (pullStartYRef.current == null || isLoading || pullTriggeredRef.current) return;

    const distance = e.touches[0].clientY - pullStartYRef.current;

    // Re-checking window.scrollY here (as this used to) broke the gesture:
    // once the finger pulls past the top, iOS/Chrome's native elastic
    // overscroll bounce nudges scrollY away from exactly 0 (sometimes
    // negative) mid-drag, so the old `window.scrollY !== 0` check would
    // bail out the instant the pull actually started — the page still
    // visibly bounced (that's the browser's native overscroll, not this
    // code), but isRefreshing never got set, so nothing ever reloaded.
    // Tracking only the start point + how far the finger has moved since
    // avoids depending on scrollY while the gesture is in flight.
    if (distance < 0) {
      // Finger moved back above where the pull started — no longer a
      // pull-to-refresh, stop tracking so a plain scroll afterward isn't
      // misread as one.
      pullStartYRef.current = null;
      return;
    }

    // Fire the refresh right here, on the move itself, instead of waiting
    // for touchend — on real mobile browsers, once the native elastic
    // overscroll takes over a pull-down gesture, the browser can settle the
    // touch with `touchcancel` instead of `touchend`, so a handler that only
    // lived on touchend could silently never run. Triggering as soon as the
    // threshold is crossed removes that dependency; the triggered ref keeps
    // this from firing more than once per gesture.
    if (distance > 80) {
      pullTriggeredRef.current = true;
      setIsRefreshing(true);
      handleRefresh();
    }
  };

  const endPull = () => {
    pullStartYRef.current = null;
    pullTriggeredRef.current = false;
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

  // They already sent ME a request — accept theirs instead of sending a
  // second, redundant one back.
  const handleAcceptIncoming = async (userId) => {
    const requestUserId = String(userId || "");
    const requestId = incomingRequestByUserId[requestUserId];
    if (!requestId || acceptingUserId) return;

    setAcceptingUserId(requestUserId);

    try {
      await acceptCircleRequest(requestId);
      setCircleUsers((prev) => {
        const user = suggestedUsers.find((item) => String(getId(item)) === requestUserId);
        if (!user || prev.some((item) => String(getId(item)) === requestUserId)) return prev;
        return [...prev, user];
      });
      setSuggestedUsers((prev) => prev.filter((item) => String(getId(item)) !== requestUserId));
      setIncomingRequestByUserId((prev) => {
        const next = { ...prev };
        delete next[requestUserId];
        return next;
      });
    } catch {
      // best-effort — leave the "Accept" state as-is so the person can retry
    } finally {
      setAcceptingUserId("");
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
        <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
          <button
            type="button"
            onClick={() =>
              myLearning?._id
                ? openLearning(myLearning, storyAuthorIds)
                : navigate("/profile")
            }
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
                  <img
                    src={getGenderAvatarIcon(me)}
                    alt="My Learning"
                    className="h-[46px] w-[46px] rounded-full object-cover"
                  />
                )}
              </div>

              <span
                role="button"
                tabIndex={0}
                aria-label="Add today's learning"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/create-learning");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    navigate("/create-learning");
                  }
                }}
                className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-white shadow-[0_3px_8px_rgba(67,56,202,0.3)] ring-2 active:scale-95"
                style={{ background: "var(--imc-indigo)", "--tw-ring-color": "var(--imc-surface)" }}
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
                      <img
                        src={getGenderAvatarIcon(user)}
                        alt={getUserName(user)}
                        className="h-[46px] w-[46px] rounded-full object-cover"
                      />
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
            // They already sent ME a request — show a distinct "accept"
            // badge instead of a plain "+", so it's obvious tapping it
            // connects instantly rather than sending a fresh ask.
            const isIncoming = Boolean(incomingRequestByUserId[userId]);
            const isAccepting = acceptingUserId === userId;

            return (
              <div key={userId} className="flex min-w-[64px] flex-col items-center">
                <div className="relative grid h-[56px] w-[56px] place-items-center rounded-full p-[2.5px]" style={{ background: "var(--imc-border)" }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/user/${userId}`)}
                    className="grid h-full w-full place-items-center rounded-full active:scale-95"
                    style={{ background: "var(--imc-surface)" }}
                    aria-label={`Open ${getUserName(user)}'s profile`}
                  >
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
                      <img
                        src={getGenderAvatarIcon(user)}
                        alt={getUserName(user)}
                        className="h-[46px] w-[46px] rounded-full object-cover"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isIncoming ? handleAcceptIncoming(userId) : handleCircleRequest(userId)
                    }
                    disabled={isIncoming ? isAccepting : requested}
                    aria-label={isIncoming ? "Accept their Circle request" : "Send Circle request"}
                    className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 disabled:opacity-80"
                    style={
                      isIncoming
                        ? { background: MARIGOLD, color: "#fff", border: "1px solid rgba(0,0,0,0.06)", "--tw-ring-color": "var(--imc-surface)" }
                        : {
                            background: "var(--imc-action-soft)",
                            color: "var(--imc-indigo-text)",
                            border: "1px solid var(--imc-action-border)",
                            "--tw-ring-color": "var(--imc-surface)",
                          }
                    }
                  >
                    {isIncoming ? (
                      <UserCheck size={11} strokeWidth={3} />
                    ) : requested ? (
                      <Check size={11} strokeWidth={3} />
                    ) : (
                      <UserPlus size={11} strokeWidth={3} />
                    )}
                  </button>
                </div>

                <span
                  className="mt-1 max-w-[64px] truncate text-center text-[10px] font-black"
                  style={{ color: isIncoming ? MARIGOLD : "var(--imc-text)" }}
                >
                  {isIncoming ? "Wants to Circle" : getUserName(user)}
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
    // Cards are borderless and full-bleed now, so the page's gray
    // background (--imc-bg) peeking through this small margin is enough
    // to separate one card from the next — no extra gray strip needed.
    return (
      <div
        key={key}
        {...wrapperProps}
        ref={index === 4 ? fifthPostRef : undefined}
        className="mb-2"
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endPull}
        onTouchCancel={endPull}
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-24"
        style={{ background: "var(--imc-bg)" }}
      >
        <BrandStyles />

        <div className="relative">
          {/* A very faint wash of the brand indigo behind just the header +
              journey prompt block — the area above the stories/avatars row
              — so it reads as a subtly distinct top section, not a heavy
              redesign. */}
          <div className="rounded-b-[24px]" style={{ background: "rgba(67, 56, 202, 0.02)" }}>
            <div className="px-3 pt-1">
              <TopHeader
                onStreakClick={() => setShowStreakShare(true)}
              />
            </div>

            {(isRefreshing || isFetchingMore) && (
              <div className="py-2 text-center text-[11px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                {isRefreshing ? "Refreshing feed..." : "Loading more..."}
              </div>
            )}

            <div className="px-4 pb-1">
              {showProfileCard && (
                <div className="mt-1 flex items-start gap-3 rounded-2xl border border-[rgba(67,56,202,0.16)] bg-[rgba(67,56,202,0.05)] p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black text-[var(--imc-text)]">
                      Complete your profile
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-4 text-[var(--imc-text-muted)]">
                      Add your tagline, interests and location so people can discover you and understand what you're building.
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/profile-setup")}
                        className="rounded-full bg-[var(--imc-indigo)] px-3.5 py-1.5 text-[11px] font-black text-white active:scale-95"
                      >
                        Complete profile
                      </button>
                      <span className="text-[10.5px] font-bold text-[var(--imc-text-faint)]">
                        {Math.round(me?.profileCompletionPercent || 0)}% done
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={dismissProfileCard}
                    aria-label="Dismiss"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--imc-text-faint)] active:scale-90"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {builderScore && activeJourneys.length === 0 && (
                <div className="mt-1">
                  <StreakCard
                    builderScore={builderScore}
                    compact
                    variant="prompt"
                    hasActiveJourney={false}
                    onPrimaryAction={() => navigate("/create-journey")}
                  />
                </div>
              )}

              {builderScore && journeysNeedingUpdate.length > 0 && (
                <JourneyUpdatePrompt
                  journeys={journeysNeedingUpdate}
                  onUpdate={(journeyId) => navigate(`/journey/${journeyId}/update`)}
                />
              )}
            </div>
          </div>

          <div className="px-4">
            {renderLearningCircles()}

            <div className="-mx-4 mt-3 flex items-center gap-8 border-b px-4" style={{ borderColor: "var(--imc-border)" }}>
              {[
                { label: "For You", action: () => changeTab("for-you"), active: activeTab === "for-you" },
                { label: "Following", action: () => changeTab("following"), active: activeTab === "following" },
              ].map((tab) => (
                <button key={tab.label} type="button" onClick={tab.action} className="relative min-w-[64px] pb-3 text-[10px] font-semibold" style={{ color: tab.active ? "var(--imc-indigo)" : "var(--imc-text-muted)" }}>
                  {tab.label}
                  {tab.active && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full" style={{ background: "var(--imc-indigo)" }} />}
                </button>
              ))}

              {/* Spotlight isn't a feed filter like the two tabs above — it's
                  its own page (frontend/src/pages/spotlight/Spotlight.jsx),
                  so this entry navigates there instead of calling changeTab. */}
              <button
                type="button"
                onClick={() => navigate("/spotlight")}
                className="relative flex min-w-[64px] items-center gap-1 pb-3 text-[10px] font-semibold"
                style={{ color: "var(--imc-indigo-text)" }}
              >
                <Sparkles size={12} />
                Spotlight
              </button>
            </div>

          </div>

          <div className="mt-2 space-y-3 px-3">
            {isLoading && items.length === 0 && <HomePageSkeleton />}

            {!isLoading && error && items.length === 0 && (
              <div className="rounded-[22px] p-4 text-center" style={{ background: "rgba(217,45,32,0.08)", border: "1px solid rgba(217,45,32,0.25)" }}>
                <p className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>Feed is taking a moment</p>
                <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>Check your connection and try again.</p>
                <button
                  type="button"
                  onClick={() => fetchFeed({ mode: "initial" })}
                  className="mt-3 rounded-full border px-4 py-2 text-[12px] font-black"
                  style={{ borderColor: "var(--imc-border)", color: "var(--imc-indigo-text)", background: "var(--imc-surface)" }}
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !error && feedItems.length === 0 && (
              activeTab === "following" ? (
                <section className="rounded-[22px] p-5" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                  <div className="text-center">
                    <p className="text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                      Add more people to your Circle
                    </p>
                    <p className="mx-auto mt-1 max-w-[280px] text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                      Posts from people you follow will appear here. Explore these builders to get started.
                    </p>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {suggestedUsers.slice(0, 4).map((user) => {
                      const userId = String(getId(user));
                      const avatarUrl = getUserAvatar(user);
                      const requested = requestedUserIds.includes(userId);

                      return (
                        <div key={userId} className="flex min-h-[64px] items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "var(--imc-surface-2)" }}>
                          <button type="button" onClick={() => navigate(`/profile/user/${userId}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            {avatarUrl ? (
                              <ImageLoader src={avatarUrl} alt={getUserName(user)} className="h-10 w-10 rounded-full object-cover" wrapperClassName="h-10 w-10 rounded-full" width={80} />
                            ) : (
                              <img
                                src={getGenderAvatarIcon(user)}
                                alt={getUserName(user)}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-black" style={{ color: "var(--imc-text)" }}>{getUserName(user)}</span>
                              <span className="block truncate text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>{user?.headline || user?.role || "IMCircle builder"}</span>
                            </span>
                          </button>
                          <button type="button" disabled={requested} onClick={() => handleCircleRequest(userId)} className="h-8 rounded-full px-3 text-[10px] font-black text-white disabled:opacity-70" style={{ background: "var(--imc-indigo)" }}>
                            {requested ? "Requested" : "Add to Circle"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" onClick={() => navigate("/network")} className="mt-4 h-11 w-full rounded-2xl text-[12px] font-black" style={{ background: "var(--imc-indigo-tint)", color: "var(--imc-indigo-text)" }}>
                    Explore more people
                  </button>
                </section>
              ) : (
                <div className="rounded-[22px] p-6 text-center" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--imc-surface-2)", color: "var(--imc-indigo-text)" }}>
                    <PenSquare size={24} />
                  </div>
                  <p className="mt-4 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>No feed yet</p>
                  <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>Follow builders or share your first update.</p>
                  <button type="button" onClick={() => navigate("/create-post")} className="mt-4 h-10 rounded-2xl px-5 text-[12px] font-black text-white" style={{ background: "var(--imc-indigo)" }}>
                    Share an update
                  </button>
                </div>
              )
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

        {/* Floating compose button — opens the SAME /create-post route the
            bottom-nav Create sheet's "Progress Update" option uses (see
            BottomNav.jsx's CreateOption), so there's only one post composer
            in the app. It intentionally does NOT open the Journey composer;
            that only happens if the person picks Journey from inside the
            create flow. `composeNavigatingRef` blocks a second navigate()
            firing from a rapid double-tap before the route change lands. */}
        <button
          type="button"
          onClick={() => {
            if (composeNavigatingRef.current) return;
            composeNavigatingRef.current = true;
            navigate("/create-post");
            window.setTimeout(() => {
              composeNavigatingRef.current = false;
            }, 800);
          }}
          aria-label="Create post"
          className="fixed z-40 grid h-[52px] w-[52px] place-items-center rounded-full text-white shadow-[0_12px_26px_rgba(91,55,238,0.42)] active:scale-95"
          style={{
            background: "linear-gradient(145deg, #6d4aff, #4338ca)",
            right: "max(16px, calc((100vw - 430px) / 2 + 16px))",
            bottom: "calc(84px + env(safe-area-inset-bottom))",
          }}
        >
          <PenSquare size={21} strokeWidth={2.2} />
        </button>

        {/* Scroll-to-top — mirrors the compose button's fixed positioning
            convention but sits on the opposite (left) side so the two never
            overlap. Only mounted once the 5th post has actually scrolled
            past, see the IntersectionObserver above. */}
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className="fixed z-40 grid h-11 w-11 place-items-center rounded-full active:scale-95"
            style={{
              background: "var(--imc-surface)",
              border: "1px solid var(--imc-border)",
              boxShadow: "0 8px 20px rgba(18,20,28,0.12)",
              left: "max(16px, calc((100vw - 430px) / 2 + 16px))",
              bottom: "calc(84px + env(safe-area-inset-bottom))",
              color: "var(--imc-indigo-text)",
            }}
          >
            <ArrowUp size={20} strokeWidth={2.4} />
          </button>
        )}

        <BottomNav />

        <ShareCardModal
          open={showStreakShare}
          onClose={() => setShowStreakShare(false)}
          kind="streak"
          filename="imcircle-streak.png"
          shareText={`I'm on a ${builderScore?.currentStreak || 0}-day streak building on IMCircle`}
          data={{
            name: getUserName(me),
            username: me?.username || "",
            avatarUrl: getUserAvatar(me),
            streak: builderScore?.currentStreak || 0,
            longestStreak: builderScore?.longestStreak || 0,
            level: builderScore?.level || "Explorer",
            interest: getUserInterest(me),
            headline: me?.headline || me?.role || me?.occupation || "",
            location: getUserLocation(me),
            tagline: "Your circle shapes your future.",
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

function JourneyUpdatePrompt({ journeys, onUpdate }) {
  return (
    <section className="px-3 pb-2">
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <p className="text-[12px] font-black" style={{ color: "var(--imc-text)" }}>
            Continue your journeys
          </p>
          <p className="text-[9.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            Share today&apos;s progress for each active journey
          </p>
        </div>
        <span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}>
          {journeys.length} due
        </span>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {journeys.map((journey) => {
          const id = journey?._id || journey?.id;
          const cover = getImageUrl(journey?.coverImage || journey?.previewImage);
          const day = Math.max(1, Number(journey?.currentDay || journey?.day || 1));
          const total = Math.max(1, Number(journey?.targetDays || journey?.totalDays || 100));

          return (
            <button
              key={id}
              type="button"
              onClick={() => onUpdate(id)}
              className="relative flex min-h-[56px] w-[88%] shrink-0 snap-start items-center gap-2.5 overflow-hidden rounded-[16px] border px-3 py-2 text-left active:scale-[0.99]"
              style={{ background: "var(--imc-surface)", borderColor: "var(--imc-border)" }}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[11px]" style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}>
                {cover ? (
                  <ImageLoader src={cover} alt="" className="h-full w-full object-cover" wrapperClassName="h-full w-full" width={120} />
                ) : (
                  <img src={getJourneyCoverIcon()} alt="" className="h-full w-full rounded-[11px] object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-black" style={{ color: "var(--imc-text)" }}>
                  {journey?.title || "Your journey"}
                </p>
                <p className="mt-0.5 truncate text-[9px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                  Day {day} of {total} · Add today&apos;s proof
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[9.5px] font-black" style={{ color: "var(--imc-indigo-text)" }}>
                Share <ArrowRight size={11} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
