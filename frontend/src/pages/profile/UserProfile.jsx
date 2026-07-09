import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CirclePlus,
  Flag,
  Flame,
  MapPin,
  MessageCircle,
  MoreVertical,
  Shield,
  ShieldOff,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";
import {
  getUserByUsername,
  getUserById,
  followUserById,
  unfollowUserById,
  blockUserById,
  reportUserById,
} from "../../api/userApi";
import {
  sendCircleRequest,
  getSentCircleRequests,
} from "../../api/circleRequestApi";
import { createConversation } from "../../api/messageApi";
import { getUserBuilderScore } from "../../api/builderScoreApi";
import { getUserJourneys } from "../../api/journeyApi";
import { getFeed } from "../../api/feedApi";
import { trackProfileView } from "../../api/analyticsApi";

import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import RepostCard from "../../components/post/RepostCard";

import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";

import RankBadge from "../../components/badges/RankBadge";
import StreakMilestoneCard from "../../components/badges/StreakMilestoneCard";
import { getStreakBadgeTier } from "../../utils/badges";
import { useSEO } from "../../hooks/useSEO";

const TABS = ["All", "Posts", "Journey", "Reposts"];
const FEED_PAGE_SIZE = 5;

function getId(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user?._id || user?.id || user?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getText(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?.name || value?.title || value?.label || fallback;
}

// Location is stored as { city, state, country, coordinates }, not the
// { name/title/label } shape getText() handles — that mismatch is why the
// location line was silently disappearing even when it was filled in.
function getLocationText(location) {
  if (!location) return "";
  if (typeof location === "string") return location;

  return [location?.city, location?.state, location?.country]
    .filter(Boolean)
    .join(", ");
}

function normalizeUserResponse(res) {
  return res?.user || res?.data?.user || res?.data || res?.profile || res;
}

// The cached `stats.xCount` counters can drift out of sync with the actual
// followers/following arrays (e.g. after a bad decrement). The array itself
// is the ground truth — it's what the followers/following list pages read
// from — so prefer its length whenever the array is actually present.
function countOf(list, statsValue) {
  const listCount = Array.isArray(list) ? list.length : null;
  const statCount = Number(statsValue) || 0;
  return listCount === null ? statCount : Math.max(listCount, statCount);
}

function formatCount(value = 0) {
  // Clamp to 0 — stat counters should never render as negative even if
  // older/bad data drifted below zero server-side.
  const num = Math.max(Number(value) || 0, 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
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
    data?.myRepost ||
      data?.repost ||
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
    ""
  );
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

function getCategories(rawType, isRepost) {
  const categories = [];

  if (rawType === "journey") categories.push("Journey");
  else if (rawType !== "learning") categories.push("Posts");

  if (isRepost) categories.push("Reposts");

  return categories;
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

function normalizeJourneys(data) {
  const journeys =
    data?.journeys ||
    data?.data?.journeys ||
    data?.data?.items ||
    data?.items ||
    data?.data ||
    [];

  return Array.isArray(journeys) ? journeys : [];
}

function buildRepostCardPost(item) {
  return {
    ...item.data,
    repostText: item.repostText || "",
    isRepostView: true,
  };
}

function getJourneyStatus(journey = {}) {
  if (journey.status === "completed") return "Achieved";
  if (journey.status === "uncompleted") return "Missed";
  return "Active";
}

function getFirstItem(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function hasExperience(value) {
  const item = getFirstItem(value);
  return Boolean(
    item?.title || item?.organisation || item?.company || item?.companyName
  );
}

function hasEducation(value) {
  const item = getFirstItem(value);
  return Boolean(item?.degree || item?.college || item?.collegeName);
}

// "Student" is decided ONLY by the primaryInterest category — NOT `role`,
// which defaults to "Student" on every new account and would wrongly exempt
// everyone from Experience if checked here.
function isStudentUser(user) {
  return String(user?.primaryInterest || "").trim().toLowerCase() === "student";
}

// Profile photo/tagline are optional to submit setup, but DO count toward
// 100%: required fields 50%, photo 10%, tagline 10%, skills 10%; Student
// gets Education 20% (no Experience item); everyone else gets Education 10%
// + Experience 10%. Mirrors Profile.jsx / backend profile.controller.js.
function getCompletionPercent(user) {
  if (typeof user?.profileCompletionPercent === "number") {
    return Math.min(Math.max(user.profileCompletionPercent, 0), 100);
  }

  let score = 0;
  const student = isStudentUser(user);

  if (
    user?.fullName &&
    user?.username &&
    user?.dob &&
    user?.gender &&
    user?.location?.city &&
    user?.primaryInterest
  ) {
    score += 50;
  }

  if (user?.avatar) score += 10;
  if (user?.headline || user?.tagline) score += 10;

  if (Array.isArray(user?.education) && user.education.length > 0) {
    score += student ? 20 : 10;
  }

  if (!student && Array.isArray(user?.experience) && user.experience.length > 0) {
    score += 10;
  }

  if (Array.isArray(user?.skills) && user.skills.length > 0) {
    score += 10;
  }

  return Math.min(score, 100);
}

function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, userId } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [rankBadge, setRankBadge] = useState(null);
  const [signupRank, setSignupRank] = useState(null);
  const [builderScore, setBuilderScore] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const [isFollowing, setIsFollowing] = useState(false);
  const [taglineExpanded, setTaglineExpanded] = useState(false);

  // "none" -> not in circle, no pending request (show "+ Circle")
  // "pending" -> a circle request is already out to this user (show "Requested")
  // "in_circle" -> already connected (hide the button, Message covers it)
  const [circleStatus, setCircleStatus] = useState("none");
  const [circleActionLoading, setCircleActionLoading] = useState(false);
  const [showCircleGate, setShowCircleGate] = useState(false);

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [optionsView, setOptionsView] = useState("menu"); // "menu" | "block" | "report" | "reportSent"
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [reportReason, setReportReason] = useState("");

  const currentUserId = getId(currentUser);
  const profileUserId = getId(profileUser);

  const isOwnProfile =
    currentUserId && profileUserId && currentUserId === profileUserId;

  useSEO({
    title: profileUser?.name ? `${profileUser.name} (@${profileUser.username || username})` : username ? `@${username}` : "Profile",
    description: profileUser?.tagline || profileUser?.bio || "View this builder's profile, journeys, and activity on IMCircle.",
    path: username ? `/profile/${username}` : `/profile/user/${userId}`,
    image: profileUser?.avatar,
    type: "profile",
  });

  useEffect(() => {
    if (!profileUser) return;

    const computed = Boolean(
      profileUser?.isFollowing === true ||
        profileUser?.followedByMe === true ||
        profileUser?.followers?.some((item) => getId(item) === currentUserId)
    );

    setIsFollowing(computed);
    // Only recompute when we land on a (new) profile — not on every
    // optimistic local update we make after a follow/unfollow click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUser || !profileUserId) return;

    if (profileUser?.isInCircle) {
      setCircleStatus("in_circle");
      return;
    }

    let cancelled = false;

    const checkPendingRequest = async () => {
      try {
        const sentData = await getSentCircleRequests();
        const sentRequests =
          sentData?.requests || sentData?.data?.requests || [];

        const alreadyRequested = sentRequests.some(
          (request) => getId(request?.receiver) === profileUserId
        );

        if (!cancelled) {
          setCircleStatus(alreadyRequested ? "pending" : "none");
        }
      } catch (error) {
        if (!cancelled) setCircleStatus("none");
      }
    };

    checkPendingRequest();

    return () => {
      cancelled = true;
    };
    // Only recompute when we land on a (new) profile — not on every
    // optimistic local update after clicking "+ Circle".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  useEffect(() => {
    // Guards against a stale request clobbering fresher state. Since this
    // effect re-runs on every username/userId change but isn't awaited
    // anywhere, navigating quickly from profile A to profile B (e.g.
    // clicking "View" in a followers/following list) leaves A's fetch
    // in-flight. If A's response lands after B's, it would previously
    // overwrite B's correct data — including setting profileUser back to
    // null on any hiccup in A's request — which is what caused profile B to
    // flash "User not found" even though its own fetch had already
    // succeeded. Every state update below is gated on `cancelled` so only
    // the most recent effect run (the one whose params match what's
    // currently rendered) can touch state.
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        const meRes = await api.get("/auth/me");
        if (cancelled) return;

        const me = meRes.data.user || meRes.data.data || meRes.data;
        setCurrentUser(me);

        const userRes = userId
          ? await getUserById(userId)
          : await getUserByUsername(username);

        if (cancelled) return;

        const normalizedUser = normalizeUserResponse(userRes);
        setProfileUser(normalizedUser);
        setRankBadge(userRes?.rankBadge || null);
        setSignupRank(userRes?.signupRank || null);

        const targetId = getId(normalizedUser);
        const viewerId = getId(me);

        // Record the view for the profile owner's analytics. This was
        // previously never called from anywhere in the app, which is why
        // "Profile Views" always showed 0 even with real traffic — the
        // tracking endpoint existed but nothing invoked it. Skip self-views
        // (shouldn't normally happen here since isOwnProfile redirects away,
        // but this guards against a stale/racing profile match too).
        if (targetId && targetId !== viewerId) {
          trackProfileView(targetId, location.state?.source || "direct").catch(
            () => {}
          );
        }

        if (targetId) {
          try {
            const scoreRes = await getUserBuilderScore(targetId);
            if (!cancelled) {
              setBuilderScore(
                scoreRes?.builderScore || scoreRes?.data?.builderScore || null
              );
            }
          } catch (error) {
            if (!cancelled) setBuilderScore(null);
          }

          try {
            const journeyRes = await getUserJourneys(targetId);
            if (!cancelled) setJourneys(normalizeJourneys(journeyRes));
          } catch (error) {
            if (!cancelled) setJourneys([]);
          }

          try {
            const feedRes = await getFeed({ tab: "for-you", limit: 100, page: 1 });
            const feed = normalizeFeed(feedRes);

            const theirs = feed
              .map((item) => {
                const rawType = getRawType(item);
                const data = getData(item);
                const ownerId = getOwnerId(data);
                const isOwn =
                  ownerId && targetId && String(ownerId) === String(targetId);
                const isRepost = isReposted(data);

                if (!isOwn && !isRepost) return null;
                if (rawType === "learning" && !isRepost) return null;

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

            if (!cancelled) setActivity(theirs);
          } catch (error) {
            if (!cancelled) setActivity([]);
          }
        }
      } catch (error) {
        // In development, React's StrictMode runs this effect twice; the
        // second run cancels the first's in-flight request (see the GET
        // de-dupe logic in api/axios.js). That's expected and harmless —
        // the second request is the one that actually completes — so don't
        // treat it as a real failure.
        if (error?.code === "ERR_CANCELED") return;
        if (cancelled) return;

        // Distinguish "this user genuinely doesn't exist" (404) from a
        // transient failure (network hiccup, timeout, 5xx) — the latter
        // should offer a retry instead of a permanent "User not found".
        if (error?.response?.status === 404) {
          setProfileUser(null);
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [username, userId, retryToken]);

  useEffect(() => {
    if (isOwnProfile) {
      navigate("/profile", { replace: true });
    }
  }, [isOwnProfile, navigate]);

  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE);
  }, [activeTab]);

  const handleFollow = async () => {
    if (!profileUserId || followLoading) return;

    const wasFollowing = isFollowing;
    const nextFollowing = !wasFollowing;

    // Optimistic update so the button flips instantly on click.
    setIsFollowing(nextFollowing);
    setFollowLoading(true);

    const currentFollowerCount = (prev) =>
      prev?.stats?.followersCount ?? prev?.followersCount ?? prev?.followers?.length ?? 0;

    try {
      if (nextFollowing) {
        await followUserById(profileUserId);

        setProfileUser((prev) => ({
          ...prev,
          isFollowing: true,
          followedByMe: true,
          followersCount: currentFollowerCount(prev) + 1,
          stats: {
            ...(prev?.stats || {}),
            followersCount: currentFollowerCount(prev) + 1,
          },
        }));
      } else {
        await unfollowUserById(profileUserId);

        setProfileUser((prev) => ({
          ...prev,
          isFollowing: false,
          followedByMe: false,
          followersCount: Math.max(currentFollowerCount(prev) - 1, 0),
          stats: {
            ...(prev?.stats || {}),
            followersCount: Math.max(currentFollowerCount(prev) - 1, 0),
          },
        }));
      }
    } catch (error) {
      // Revert the optimistic update if the request failed.
      setIsFollowing(wasFollowing);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profileUserId || messageLoading) return;

    try {
      setMessageLoading(true);

      const res = await createConversation(profileUserId);
      const conversation = res?.conversation || res?.data?.conversation;

      if (conversation?._id) {
        navigate(`/chat/${conversation._id}`, {
          state: { conversation },
        });
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setMessageLoading(false);
    }
  };

  const handleAddToCircle = async () => {
    if (!profileUserId || circleActionLoading || circleStatus !== "none") return;

    try {
      setCircleActionLoading(true);

      const res = await sendCircleRequest(profileUserId);

      // Backend short-circuits to "accepted" if a reverse pending request
      // already existed, or if the two users were already connected.
      setCircleStatus(res?.status === "accepted" ? "in_circle" : "pending");
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setCircleActionLoading(false);
    }
  };

  const closeOptionsMenu = () => {
    if (actionLoading) return;
    setShowOptionsMenu(false);
    setTimeout(() => {
      setOptionsView("menu");
      setActionError("");
      setReportReason("");
    }, 200);
  };

  const handleBlockUser = async () => {
    if (!profileUserId || actionLoading) return;

    setActionLoading(true);
    setActionError("");

    try {
      await blockUserById(profileUserId);
      setShowOptionsMenu(false);
      // Blocking severs the relationship both ways — the profile they were
      // viewing no longer makes sense to keep showing, so leave the page.
      navigate(-1);
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Couldn't block this user. Try again."
      );
      setActionLoading(false);
    }
  };

  const handleReportUser = async () => {
    if (!profileUserId || actionLoading || !reportReason.trim()) return;

    setActionLoading(true);
    setActionError("");

    try {
      await reportUserById(profileUserId, reportReason.trim());
      setOptionsView("reportSent");
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Couldn't send your report. Try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const visibleItems = useMemo(() => {
    const filtered =
      activeTab === "All"
        ? activity
        : activity.filter((item) => item.categories?.includes(activeTab));

    return filtered.slice(0, visibleCount);
  }, [activeTab, activity, visibleCount]);

  const filteredCount = useMemo(() => {
    return activeTab === "All"
      ? activity.length
      : activity.filter((item) => item.categories?.includes(activeTab)).length;
  }, [activeTab, activity]);

  const activeJourneys = useMemo(() => {
    return journeys.filter((journey) => getJourneyStatus(journey) === "Active");
  }, [journeys]);

  if (loading || isOwnProfile) {
    return <UserProfileSkeleton />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
        <div className="w-full max-w-[430px] bg-[var(--imc-bg)] px-4 py-10 text-center">
          <h2 className="text-[16px] font-black text-[var(--imc-text)]">
            Couldn't load this profile
          </h2>
          <p className="mt-1.5 text-[12px] font-semibold text-[var(--imc-text-muted)]">
            Check your connection and try again.
          </p>

          <button
            onClick={() => setRetryToken((t) => t + 1)}
            className="mt-4 rounded-full bg-[var(--imc-indigo)] px-5 py-2 text-[12px] font-black text-white active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
        <div className="w-full max-w-[430px] bg-[var(--imc-bg)] px-4 py-10 text-center">
          <h2 className="text-[16px] font-black text-[var(--imc-text)]">
            User not found
          </h2>

          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-full bg-[var(--imc-indigo)] px-5 py-2 text-[12px] font-black text-white active:scale-95"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const fullName = getName(profileUser);
  const tagline = getText(profileUser.headline) || getText(profileUser.bio);
  const locationText = getLocationText(profileUser.location);

  const avatar =
    profileUser.avatar ||
    profileUser.profileImage ||
    profileUser.profilePicture ||
    profileUser.picture ||
    profileUser.photo ||
    "";

  const longestStreak = builderScore?.longestStreak || 0;
  const currentStreak = builderScore?.currentStreak || 0;
  const level = builderScore?.level || "Explorer";
  const streakTier = getStreakBadgeTier(longestStreak);
  const hasStreakInfo = Boolean(builderScore) && (currentStreak > 0 || longestStreak > 0);
  const completionPercent = getCompletionPercent(profileUser);

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] pb-8">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-4 py-4 backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] active:scale-95"
          >
            <ArrowLeft size={20} className="text-[var(--imc-text)]" />
          </button>

          <h1 className="text-[16px] font-black text-[var(--imc-text)]">Profile</h1>

          <button
            onClick={() => setShowOptionsMenu(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] active:scale-95"
          >
            <MoreVertical size={20} className="text-[var(--imc-text)]" />
          </button>
        </div>

        <main className="px-5 pt-6">
          <section>
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => avatar && !avatarFailed && setShowAvatarPreview(true)}
                disabled={!avatar || avatarFailed}
                className="imc-ring relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full border border-[rgba(18,20,28,0.18)] p-[3px] shadow-[0_8px_22px_rgba(18,20,28,0.10)] active:scale-[0.97] disabled:active:scale-100 dark:border-white/20"
              >
                <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-[var(--imc-surface)]">
                  {avatar && !avatarFailed ? (
                    <img
                      src={avatar}
                      alt={fullName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[rgba(67,56,202,0.12)] text-[36px] font-black text-[var(--imc-indigo-text)]">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[var(--imc-surface)] bg-[#059669]" />
                </div>
              </button>

              <div className="min-w-0 flex-1 pt-2">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-[21px] font-black text-[var(--imc-text)]">
                    {fullName}
                  </h1>
                  {completionPercent >= 100 && <ProfileCompleteBadge />}
                  <RankBadge tier={rankBadge} rank={signupRank} />
                </div>

                {profileUser?.username && (
                  <p className="mt-0.5 truncate text-[12.5px] font-bold text-[var(--imc-indigo-text)]">
                    @{profileUser.username}
                  </p>
                )}

                {tagline && (
                  <div className="mt-1.5">
                    <p
                      className={`text-[12.5px] font-bold leading-5 text-[var(--imc-text-muted)] ${
                        taglineExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {tagline}
                    </p>

                    {tagline.length > 90 && (
                      <button
                        type="button"
                        onClick={() => setTaglineExpanded((prev) => !prev)}
                        className="mt-0.5 text-[11px] font-black text-[var(--imc-indigo-text)]"
                      >
                        {taglineExpanded ? "View less" : "View more"}
                      </button>
                    )}
                  </div>
                )}

                {locationText && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                    <MapPin size={13} />
                    {locationText}
                  </p>
                )}

                {profileUser.primaryInterest && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                    <Sparkles size={13} />
                    Exploring {profileUser.primaryInterest}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 border-y border-[var(--imc-border)] py-3">
              <TopStat
                value={formatCount(
                  countOf(
                    profileUser.followers,
                    profileUser.stats?.followersCount || profileUser.followersCount
                  )
                )}
                label="Followers"
                onClick={() =>
                  navigate(`/profile/user/${profileUserId}/people/followers`)
                }
              />
              <TopStat
                value={formatCount(
                  profileUser.stats?.circleCount || profileUser.circleCount || 0
                )}
                label="Circle"
                onClick={() => {
                  if (circleStatus === "in_circle") {
                    navigate(`/profile/user/${profileUserId}/people/circle`);
                  } else {
                    setShowCircleGate(true);
                  }
                }}
              />
              <TopStat
                value={formatCount(
                  countOf(
                    profileUser.following,
                    profileUser.stats?.followingCount || profileUser.followingCount
                  )
                )}
                label="Following"
                onClick={() =>
                  navigate(`/profile/user/${profileUserId}/people/following`)
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-text)] active:scale-[0.98]"
              >
                {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </button>

              {/* Message only appears once the circle request is accepted
                  (circleStatus === "in_circle") — before that, this slot is
                  the +Circle/Requested button instead. Messaging is
                  restricted to accepted circle connections on the backend
                  (see message.controller.js's areCircleConnected check), so
                  showing it earlier would just lead to a 403 on send. */}
              {circleStatus === "in_circle" ? (
                <button
                  onClick={handleMessage}
                  disabled={messageLoading}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-indigo-text)] active:scale-[0.98]"
                >
                  <MessageCircle size={15} />
                  {messageLoading ? "Opening..." : "Message"}
                </button>
              ) : (
                <button
                  onClick={handleAddToCircle}
                  disabled={circleActionLoading || circleStatus === "pending"}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-text)] active:scale-[0.98] disabled:opacity-60"
                >
                  <CirclePlus size={15} />
                  {circleActionLoading
                    ? "..."
                    : circleStatus === "pending"
                    ? "Requested"
                    : "+ Circle"}
                </button>
              )}
            </div>

            {hasStreakInfo && (
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="mt-4 flex w-full items-center gap-3 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 text-left active:scale-[0.99]"
              >
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                  style={{
                    background:
                      currentStreak > 0
                        ? "rgba(236,154,30,0.18)"
                        : "rgba(107,114,128,0.12)",
                  }}
                >
                  <Flame
                    size={20}
                    fill={currentStreak > 0 ? "#EC9A1E" : "none"}
                    style={{
                      color: currentStreak > 0 ? "#EC9A1E" : "var(--imc-text-faint)",
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-[var(--imc-text)]">
                    {currentStreak > 0 ? `Day ${currentStreak} streak` : "No active streak"}
                  </p>
                  <p className="mt-0.5 truncate text-[10.5px] font-semibold text-[var(--imc-text-muted)]">
                    {level} &middot; Best {longestStreak} days
                  </p>
                </div>

                <span
                  className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-black"
                  style={{ background: "rgba(236,154,30,0.15)", color: "#EC9A1E" }}
                >
                  View Streak
                  <ArrowRight size={13} />
                </span>
              </button>
            )}

            {streakTier && (
              <div className="mt-4">
                <StreakMilestoneCard tier={streakTier} streak={longestStreak} />
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="grid grid-cols-4 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-1">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl py-2 text-[11px] font-black transition ${
                    activeTab === tab
                      ? "bg-[var(--imc-indigo)] text-white"
                      : "text-[var(--imc-text-muted)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {visibleItems.length > 0 ? (
                visibleItems.map((item, index) => {
                  const isJourney = item.rawType === "journey";

                  const card = isJourney ? (
                    <JourneyCard milestone={item.data} />
                  ) : (
                    <PostCard
                      post={item.isRepost ? buildRepostCardPost(item) : item.data}
                      type="post"
                      currentUser={currentUser}
                    />
                  );

                  return (
                    <div
                      key={item.id || index}
                      className="-mx-2"
                      onClick={(event) => {
                        // Bring the tapped card fully into view if it's
                        // partially cut off (e.g. near the bottom of the
                        // screen) — harmless no-op if it's already visible,
                        // and doesn't interfere with the card's own like/
                        // repost/save/comment buttons.
                        event.currentTarget.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                        });
                      }}
                    >
                      {item.isRepost ? (
                        <RepostCard
                          repostText={item.repostText}
                          currentUser={profileUser}
                          viewerIsAuthor={false}
                        >
                          {card}
                        </RepostCard>
                      ) : (
                        card
                      )}
                    </div>
                  );
                })
              ) : (
                <EmptyActivity activeTab={activeTab} />
              )}

              {filteredCount > visibleItems.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + FEED_PAGE_SIZE)}
                  className="mt-4 w-full rounded-2xl border border-[var(--imc-border)] py-3 text-[12px] font-black text-[var(--imc-indigo-text)]"
                >
                  View More
                </button>
              )}
            </div>
          </section>

          {activeJourneys.length > 0 && (
            <>
              <SectionTitle title="Active Journeys" />

              <section className="border-y border-[var(--imc-border)] py-4">
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {activeJourneys.map((journey) => (
                    <div key={journey._id} className="w-[86%] shrink-0 snap-start">
                      <JourneyProfileCard
                        journey={journey}
                        onView={() => navigate(`/journey/${journey._id}`)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <SectionTitle title="Experience" />

          <section className="border-y border-[var(--imc-border)] py-4">
            {hasExperience(profileUser.experience) ? (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {profileUser.experience.map((item, index) => (
                  <div
                    key={item?._id || `${item?.title}-${index}`}
                    className="min-w-full max-w-full snap-start"
                  >
                    <ExperienceCard experience={item} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection text="No experience added yet." />
            )}
          </section>

          <SectionTitle title="Education" />

          <section className="border-y border-[var(--imc-border)] py-4">
            {hasEducation(profileUser.education) ? (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {profileUser.education.map((item, index) => (
                  <div
                    key={item?._id || `${item?.collegeName}-${index}`}
                    className="min-w-full max-w-full snap-start"
                  >
                    <EducationCard education={item} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection text="No education added yet." />
            )}
          </section>

          {profileUser.skills?.length > 0 && (
            <>
              <SectionTitle title="Skills" />

              <section className="flex flex-wrap gap-2 border-y border-[var(--imc-border)] py-4">
                {profileUser.skills.map((skill, index) => {
                  const skillName = getText(skill, "Skill");

                  return (
                    <span
                      key={skill?._id || skill?.id || `${skillName}-${index}`}
                      className="rounded-full bg-[rgba(67,56,202,0.12)] px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]"
                    >
                      {skillName}
                    </span>
                  );
                })}
              </section>
            </>
          )}
        </main>

        {showAvatarPreview && avatar && (
          <div
            onClick={() => setShowAvatarPreview(false)}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 px-6"
          >
            <img
              src={avatar}
              alt={fullName}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-full max-w-[360px] rounded-[28px] object-cover"
            />
          </div>
        )}

        {showStreakModal && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4"
            onClick={() => setShowStreakModal(false)}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-black text-[var(--imc-text)]">
                    {fullName}&apos;s Streak
                  </h3>
                  <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                    Building consistently on IMCircle
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStreakModal(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[rgba(236,154,30,0.12)] p-4 text-center">
                  <p className="text-[24px] font-black text-[var(--imc-text)]">
                    {currentStreak}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-[var(--imc-text-muted)]">
                    Current streak
                  </p>
                </div>

                <div className="rounded-2xl bg-[rgba(67,56,202,0.12)] p-4 text-center">
                  <p className="text-[24px] font-black text-[var(--imc-text)]">
                    {longestStreak}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-[var(--imc-text-muted)]">
                    Longest streak
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-[var(--imc-surface-2)] p-4 text-center">
                <p className="text-[13px] font-black text-[var(--imc-text)]">{level}</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--imc-text-muted)]">
                  Current level
                </p>
              </div>
            </div>
          </div>
        )}

        {showCircleGate && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4"
            onClick={() => setShowCircleGate(false)}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-black text-[var(--imc-text)]">
                    Join {fullName}&apos;s Circle
                  </h3>
                  <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                    You need to be in their Circle to see who else is in it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCircleGate(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                type="button"
                disabled={circleActionLoading || circleStatus === "pending"}
                onClick={async () => {
                  if (circleStatus === "none") {
                    await handleAddToCircle();
                  }
                }}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.98] disabled:opacity-60"
              >
                <CirclePlus size={16} />
                {circleActionLoading
                  ? "..."
                  : circleStatus === "pending"
                  ? "Request sent"
                  : "+ Circle"}
              </button>
            </div>
          </div>
        )}

        {showOptionsMenu && (
          <div
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 px-4"
            onClick={closeOptionsMenu}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

              {optionsView === "menu" && (
                <>
                  <button
                    type="button"
                    onClick={() => setOptionsView("block")}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3.5 text-left active:opacity-70"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#FEF3F2] text-[#D92D20]">
                      <ShieldOff size={18} />
                    </span>
                    <span className="text-[14px] font-black text-[#D92D20]">
                      Block {fullName}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOptionsView("report")}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3.5 text-left active:opacity-70"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                      <Flag size={18} />
                    </span>
                    <span className="text-[14px] font-black text-[var(--imc-text)]">
                      Report {fullName}
                    </span>
                  </button>
                </>
              )}

              {optionsView === "block" && (
                <>
                  <h3 className="text-[16px] font-black text-[var(--imc-text)]">
                    Block {fullName}?
                  </h3>
                  <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    They won't be able to follow you, message you, or send you
                    circle requests, and you won't see their posts. This
                    doesn't notify them.
                  </p>

                  {actionError && (
                    <p className="mt-2 text-[11px] font-semibold text-red-500">
                      {actionError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleBlockUser}
                    disabled={actionLoading}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#D92D20] text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-50"
                  >
                    {actionLoading ? "Blocking…" : "Block"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOptionsView("menu")}
                    disabled={actionLoading}
                    className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl border border-[var(--imc-border)] text-[13px] font-black text-[var(--imc-text)] active:scale-[0.99]"
                  >
                    Cancel
                  </button>
                </>
              )}

              {optionsView === "report" && (
                <>
                  <h3 className="text-[16px] font-black text-[var(--imc-text)]">
                    Report {fullName}
                  </h3>
                  <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    Tell us what's wrong. Our team will review this account.
                  </p>

                  <textarea
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value.slice(0, 500))}
                    placeholder="Describe the issue…"
                    rows={4}
                    maxLength={500}
                    className="mt-3 w-full resize-none rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
                  />

                  {actionError && (
                    <p className="mt-2 text-[11px] font-semibold text-red-500">
                      {actionError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleReportUser}
                    disabled={actionLoading || !reportReason.trim()}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-50"
                  >
                    {actionLoading ? "Sending…" : "Submit report"}
                  </button>
                </>
              )}

              {optionsView === "reportSent" && (
                <div className="py-2 text-center">
                  <p className="text-[14px] font-black text-[var(--imc-text)]">
                    Thanks — we've got it
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    Your report was sent. We'll look into it.
                  </p>

                  <button
                    type="button"
                    onClick={closeOptionsMenu}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.99]"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserProfileSkeleton() {
  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
      <div className="min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] px-4 pb-24 pt-8">
        <div className="flex animate-pulse items-start gap-4">
          <div className="h-[86px] w-[86px] shrink-0 rounded-full bg-[var(--imc-surface-2)]" />
          <div className="min-w-0 flex-1 space-y-2.5 pt-2">
            <div className="h-4 w-2/3 rounded-full bg-[var(--imc-surface-2)]" />
            <div className="h-3 w-1/3 rounded-full bg-[var(--imc-surface-2)]" />
            <div className="h-3 w-3/4 rounded-full bg-[var(--imc-surface-2)]" />
          </div>
        </div>

        <div className="mt-5 grid animate-pulse grid-cols-3 gap-3 border-y border-[var(--imc-border)] py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-[10px] bg-[var(--imc-surface-2)]" />
          ))}
        </div>

        <div className="mt-4 flex animate-pulse gap-2">
          <div className="h-10 flex-1 rounded-[14px] bg-[var(--imc-surface-2)]" />
          <div className="h-10 flex-1 rounded-[14px] bg-[var(--imc-surface-2)]" />
        </div>

        <div className="mt-6 animate-pulse space-y-3">
          <div className="h-24 rounded-[20px] bg-[var(--imc-surface-2)]" />
          <div className="h-24 rounded-[20px] bg-[var(--imc-surface-2)]" />
        </div>
      </div>
    </div>
  );
}

function ProfileCompleteBadge() {
  return (
    <span
      aria-label="Profile completion shield"
      title="Profile completed 100%"
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white shadow-[0_8px_18px_rgba(67,56,202,0.28)]"
    >
      <Shield size={14} strokeWidth={2.5} />
    </span>
  );
}

function JourneyProfileCard({ journey, onView }) {
  const status = getJourneyStatus(journey);

  const likes = Number(journey?.totals?.likes || 0);
  const comments = Number(journey?.totals?.comments || 0);
  const saves = Number(journey?.totals?.saves || 0);
  const updates = Number(journey?.updatesCount || 0);
  const targetDays = Number(journey?.targetDays || journey?.totalDays || 100);
  const currentDay = Number(journey?.currentDay || updates || 1);

  const progress =
    status === "Achieved"
      ? 100
      : Math.min(Math.round((currentDay / targetDays) * 100), 100);

  return (
    <article className="rounded-[26px] bg-[var(--imc-surface)] p-4 ring-1 ring-[var(--imc-border)] shadow-[0_10px_30px_rgba(18,20,28,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-[var(--imc-text)]">
            {journey.title}
          </p>

          <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-[var(--imc-text-muted)]">
            {journey.description || "Building in public journey"}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[rgba(67,56,202,0.12)] px-3 py-1 text-[9px] font-black text-[var(--imc-indigo-text)]">
          {status}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-black text-[var(--imc-text-muted)]">
            Day {Math.min(currentDay, targetDays)} of {targetDays}
          </p>
          <p className="text-[10px] font-black text-[var(--imc-indigo-text)]">{progress}%</p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(67,56,202,0.12)]">
          <div
            className="h-full rounded-full bg-[#EC9A1E]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 rounded-[20px] bg-[rgba(67,56,202,0.12)] py-3 text-center">
        <MiniNumber value={journey.followersCount || 0} label="Followers" />
        <MiniNumber value={likes} label="Likes" />
        <MiniNumber value={comments} label="Replies" />
        <MiniNumber value={saves} label="Saved" />
      </div>

      <button
        type="button"
        onClick={onView}
        className="mt-4 w-full rounded-2xl bg-[var(--imc-indigo)] py-3 text-[12px] font-black text-white active:scale-[0.98]"
      >
        View Journey →
      </button>
    </article>
  );
}

function MiniNumber({ value, label }) {
  return (
    <div>
      <p className="text-[16px] font-black text-[var(--imc-text)]">
        {formatCount(value)}
      </p>
      <p className="text-[9px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

function EmptySection({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.06)] px-5 py-5 text-center">
      <p className="text-[12.5px] font-bold text-[var(--imc-text-muted)]">{text}</p>
    </div>
  );
}

function EmptyActivity({ activeTab }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-center">
      <p className="text-[14px] font-black text-[var(--imc-text)]">
        No {activeTab} yet
      </p>
      <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
        Their recent activity will appear here.
      </p>
    </div>
  );
}

function TopStat({ value, label, onClick }) {
  if (!onClick) {
    return (
      <div className="text-center">
        <p className="text-[17px] font-black text-[var(--imc-text)]">{value}</p>
        <p className="mt-0.5 text-[10px] font-bold text-[var(--imc-text-muted)]">{label}</p>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className="text-center active:scale-[0.97]">
      <p className="text-[17px] font-black text-[var(--imc-text)]">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </button>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-[17px] font-black text-[var(--imc-text)]">{title}</h2>
    </div>
  );
}

export default UserProfile;
