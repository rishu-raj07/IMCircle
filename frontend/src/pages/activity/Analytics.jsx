import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Heart,
  TrendingUp,
  MessageCircle,
  Bookmark,
  RefreshCw,
  Repeat2,
  FolderKanban,
  Percent,
  SearchCheck,
  MousePointerClick,
  UserPlus,
  UserMinus,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import RepostCard from "../../components/post/RepostCard";

import {
  getMyAnalyticsDashboard,
  getFollowerGrowthAnalytics,
  getMySearchAnalytics,
} from "../../api/analyticsApi";
import { getMyProfile } from "../../api/profileApi";
import { getGenderAvatarIcon } from "../../utils/avatar";

function formatCount(value = 0) {
  const num = Number(value) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function getArrayCount(value) {
  if (Array.isArray(value)) return value.length;
  return Number(value) || 0;
}

function normalizeDashboard(response) {
  return response?.dashboard || response?.data?.dashboard || {};
}

function normalizeUser(response) {
  return response?.user || response?.data?.user || response?.data || null;
}

function getDayName(date) {
  return new Date(date).toLocaleDateString("en-IN", { weekday: "short" });
}

function getTimeAgoLabel(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));

  if (sec < 60) return "Just now";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function buildWeeklyData(items = []) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const map = Object.fromEntries(days.map((day) => [day, 0]));

  items.forEach((item) => {
    if (!item?.createdAt) return;
    const day = getDayName(item.createdAt);

    if (map[day] !== undefined) {
      map[day] += Number(item?.impressionsCount) || 0;
    }
  });

  const max = Math.max(...Object.values(map), 1);

  return days.map((day) => ({
    day,
    value: Math.max(8, Math.round((map[day] / max) * 100)),
    count: map[day],
  }));
}

function getLikes(item) {
  return getArrayCount(item?.likes) || getArrayCount(item?.likesCount);
}

function getComments(item) {
  return getArrayCount(item?.comments) || getArrayCount(item?.commentsCount);
}

function getSaves(item) {
  return getArrayCount(item?.saves) || getArrayCount(item?.savesCount);
}

function getShares(item) {
  return (
    getArrayCount(item?.shares) ||
    getArrayCount(item?.reposts) ||
    getArrayCount(item?.repostsCount)
  );
}

function getTotalEngagement(item) {
  return (
    getLikes(item) +
    getComments(item) +
    getSaves(item) +
    getShares(item) +
    getArrayCount(item?.followersCount) +
    getArrayCount(item?.updatesCount)
  );
}

function getEngagementRate(item) {
  const impressions = Number(item?.impressionsCount || 0);
  const engagement = getTotalEngagement(item);

  if (!impressions) return 0;

  return Number(((engagement / impressions) * 100).toFixed(1));
}

function getContentTitle(item) {
  return (
    item?.title ||
    item?.content ||
    item?.caption ||
    item?.text ||
    "Top performing content"
  );
}

function prepareCardItem(item, currentUser) {
  return {
    ...item,
    author: item?.author || item?.creator || currentUser,
    creator: item?.creator || item?.author || currentUser,
    user: item?.user || currentUser,
  };
}

function Analytics() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [followerAnalytics, setFollowerAnalytics] = useState(null);
  const [searchAnalytics, setSearchAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        analyticsResponse,
        profileResponse,
        followerResponse,
        searchResponse,
      ] = await Promise.allSettled([
        getMyAnalyticsDashboard(),
        getMyProfile(),
        getFollowerGrowthAnalytics(),
        getMySearchAnalytics(),
      ]);

      if (analyticsResponse.status === "rejected") {
        throw analyticsResponse.reason;
      }

      setDashboard(normalizeDashboard(analyticsResponse.value));

      setCurrentUser(
        profileResponse.status === "fulfilled"
          ? normalizeUser(profileResponse.value)
          : null
      );

      setFollowerAnalytics(
        followerResponse.status === "fulfilled"
          ? followerResponse.value?.analytics || null
          : null
      );

      setSearchAnalytics(
        searchResponse.status === "fulfilled"
          ? searchResponse.value?.analytics || null
          : null
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load analytics right now"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const overview = dashboard?.overview || {};
  const posts = dashboard?.posts || [];
  const learnings = dashboard?.learnings || [];
  const projects = dashboard?.projects || [];
  const circlePosts = dashboard?.circlePosts || [];
  const journeyMilestones = dashboard?.journeyMilestones || dashboard?.journeys || [];

  const allContent = useMemo(
    () => [
      ...posts.map((item) => ({
        ...item,
        analyticsType: "post",
        contentType: "Post",
      })),

      ...learnings.map((item) => ({
        ...item,
        analyticsType: "learning",
        contentType: "Learning",
      })),

      ...journeyMilestones.map((item) => ({
        ...item,
        analyticsType: "journey",
        contentType: "Journey",
      })),

      ...projects.map((item) => ({
        ...item,
        analyticsType: "project",
        contentType: "Project",
      })),

      ...circlePosts.map((item) => ({
        ...item,
        analyticsType: "circle_post",
        contentType: "Circle Post",
      })),
    ],
    [posts, learnings, projects, circlePosts, journeyMilestones]
  );

  const totalImpressions =
    Number(overview?.totalPostImpressions || 0) +
    Number(overview?.totalLearningImpressions || 0) +
    Number(overview?.totalProjectImpressions || 0);

  const totalEngagement = allContent.reduce(
    (sum, item) => sum + getTotalEngagement(item),
    0
  );

  const overallEngagementRate =
    totalImpressions > 0
      ? Number(((totalEngagement / totalImpressions) * 100).toFixed(1))
      : 0;

  const weeklyData = useMemo(() => buildWeeklyData(allContent), [allContent]);

  const topContent = useMemo(() => {
    return [...allContent]
      .sort(
        (a, b) =>
          Number(b?.impressionsCount || 0) - Number(a?.impressionsCount || 0)
      )
      .slice(0, 5);
  }, [allContent]);

  // Per-content-type breakdown — the kind of "what's working" view
  // Instagram/LinkedIn insights surface (reach + engagement split by
  // format), built from data we already fetch for the dashboard.
  const contentBreakdown = useMemo(() => {
    const groups = new Map();

    allContent.forEach((item) => {
      const key = item.contentType;
      const existing = groups.get(key) || {
        contentType: key,
        count: 0,
        impressions: 0,
        engagement: 0,
      };

      existing.count += 1;
      existing.impressions += Number(item?.impressionsCount || 0);
      existing.engagement += getTotalEngagement(item);

      groups.set(key, existing);
    });

    return [...groups.values()].sort((a, b) => b.impressions - a.impressions);
  }, [allContent]);

  const recentFollowers = useMemo(() => {
    const events = followerAnalytics?.recentEvents || [];

    return events
      .filter((event) => event?.action === "follow" && event?.follower)
      .slice(0, 6);
  }, [followerAnalytics]);

  const topKeywords = searchAnalytics?.topKeywords || [];

  const stats = [
    {
      label: "Profile Views",
      value: formatCount(overview?.profileViews),
      icon: <Eye size={20} />,
    },
    {
      label: "Total Reach",
      value: formatCount(totalImpressions),
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Engagement",
      value: formatCount(totalEngagement),
      icon: <Heart size={20} />,
    },
    {
      label: "Engage Rate",
      value: `${overallEngagementRate}%`,
      icon: <Percent size={20} />,
    },
    {
      label: "Search Appearances",
      value: formatCount(overview?.searchAppearances),
      icon: <SearchCheck size={20} />,
    },
    {
      label: "Search Clicks",
      value: formatCount(overview?.searchClicks),
      icon: <MousePointerClick size={20} />,
    },
    {
      label: "New Followers",
      value: formatCount(overview?.follows),
      icon: <UserPlus size={20} />,
    },
    {
      label: "Unfollows",
      value: formatCount(overview?.unfollows),
      icon: <UserMinus size={20} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] pb-10">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Analytics
            </h1>

            <button
              onClick={loadAnalytics}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <TrendingUp size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <p className="text-[13px] font-black text-[var(--imc-indigo-text)]">
                Loading analytics...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-[14px] font-black text-red-600">{error}</p>

              <button
                onClick={loadAnalytics}
                className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-[12px] font-black text-white"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                      {item.icon}
                    </div>

                    <h3 className="mt-3 text-[22px] font-black text-[var(--imc-text)]">
                      {item.value}
                    </h3>

                    <p className="text-[12px] font-bold text-[var(--imc-text-muted)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-black text-[var(--imc-text)]">
                      Weekly Growth
                    </h2>

                    <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
                      Based on your content impressions
                    </p>
                  </div>

                  <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-[11px] font-black text-[#059669]">
                    Live
                  </span>
                </div>

                <div className="mt-5 flex h-32 items-end justify-between gap-2">
                  {weeklyData.map((item) => (
                    <div
                      key={item.day}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        title={`${item.count} impressions`}
                        className="w-full rounded-t-2xl bg-[#4338CA]"
                        style={{ height: `${item.value}%` }}
                      />

                      <span className="text-[10px] font-bold text-[var(--imc-text-faint)]">
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {contentBreakdown.length > 0 && (
                <div className="mt-5 rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
                  <h2 className="text-[16px] font-black text-[var(--imc-text)]">
                    Content Performance
                  </h2>
                  <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    How each format is doing
                  </p>

                  <div className="mt-4 space-y-3">
                    {contentBreakdown.map((group) => {
                      const rate =
                        group.impressions > 0
                          ? Number(
                              ((group.engagement / group.impressions) * 100).toFixed(1)
                            )
                          : 0;

                      return (
                        <div
                          key={group.contentType}
                          className="flex items-center justify-between rounded-2xl bg-[var(--imc-surface-2)] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-[var(--imc-text)]">
                              {group.contentType}
                              <span className="ml-1.5 font-bold text-[var(--imc-text-muted)]">
                                &middot; {group.count}
                              </span>
                            </p>
                            <p className="text-[11px] font-semibold text-[var(--imc-text-muted)]">
                              {formatCount(group.impressions)} reach &middot;{" "}
                              {formatCount(group.engagement)} engagement
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-[var(--imc-surface)] px-3 py-1 text-[11px] font-black text-[var(--imc-indigo-text)]">
                            {rate}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {recentFollowers.length > 0 && (
                <div className="mt-5 rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
                  <h2 className="text-[16px] font-black text-[var(--imc-text)]">
                    Recent Followers
                  </h2>
                  <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    People who recently followed you
                  </p>

                  <div className="mt-4 space-y-3">
                    {recentFollowers.map((event) => (
                      <div
                        key={event?._id}
                        className="flex items-center gap-3"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--imc-surface-2)]">
                          <img
                            src={event.follower?.avatar || getGenderAvatarIcon(event.follower)}
                            alt={event.follower?.fullName || "Follower"}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black text-[var(--imc-text)]">
                            {event.follower?.fullName ||
                              event.follower?.username ||
                              "Someone"}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-[var(--imc-text-muted)]">
                            {event.follower?.headline || "started following you"}
                          </p>
                        </div>

                        <span className="shrink-0 text-[10px] font-bold text-[var(--imc-text-faint)]">
                          {getTimeAgoLabel(event.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topKeywords.length > 0 && (
                <div className="mt-5 rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
                  <h2 className="text-[16px] font-black text-[var(--imc-text)]">
                    How People Find You
                  </h2>
                  <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
                    Top search terms leading to your profile
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {topKeywords.map((keyword) => (
                      <span
                        key={keyword._id}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--imc-surface-2)] px-3 py-1.5 text-[11px] font-black text-[var(--imc-text)]"
                      >
                        <Sparkles size={12} className="text-[var(--imc-indigo-text)]" />
                        {keyword._id}
                        <span className="text-[var(--imc-text-muted)]">
                          &middot; {keyword.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[17px] font-black text-[var(--imc-text)]">
                    Top Performing Content
                  </h2>
                </div>

                <div className="space-y-5">
                  {topContent.length > 0 ? (
                    topContent.map((item, index) => (
                      <TopContentCard
                        key={item?._id || index}
                        item={item}
                        currentUser={currentUser}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface)] p-5 text-center">
                      <p className="text-[14px] font-black text-[var(--imc-text)]">
                        No analytics yet
                      </p>

                      <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                        Your content performance will appear here after people
                        view your posts.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TopContentCard({ item, currentUser }) {
  const cardItem = prepareCardItem(item, currentUser);

  const impressions = Number(item?.impressionsCount || 0);
  const likes = getLikes(item);
  const comments = getComments(item);
  const saves = getSaves(item);
  const shares = getShares(item);
  const engagementRate = getEngagementRate(item);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-sm">
      <div className="border-b border-[var(--imc-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[var(--imc-surface-2)] px-3 py-1 text-[10px] font-black text-[var(--imc-indigo-text)]">
            {item.contentType}
          </span>

          <span className="text-[10px] font-black text-[var(--imc-text-faint)]">
            #{formatCount(impressions)} reach
          </span>
        </div>
      </div>

      <div className="bg-[var(--imc-surface)]">
        {item.analyticsType === "journey" ? (
          <JourneyCard milestone={cardItem} />
        ) : item.analyticsType === "learning" ? (
          <PostCard post={cardItem} type="learning" currentUser={currentUser} />
        ) : item.analyticsType === "project" ? (
          <ProjectAnalyticsPreview item={cardItem} />
        ) : item.analyticsType === "circle_post" ? (
          <PostCard post={cardItem} type="post" currentUser={currentUser} />
        ) : item?.isRepostView || item?.repostText ? (
          <RepostCard repostText={item?.repostText} currentUser={currentUser}>
            <PostCard post={cardItem} type="post" currentUser={currentUser} />
          </RepostCard>
        ) : (
          <PostCard post={cardItem} type="post" currentUser={currentUser} />
        )}
      </div>

      <div className="border-t border-[var(--imc-border)] bg-[var(--imc-surface-2)] p-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricItem label="Reach" value={formatCount(impressions)} icon={Eye} />
          <MetricItem label="Likes" value={formatCount(likes)} icon={Heart} />
          <MetricItem
            label="Comments"
            value={formatCount(comments)}
            icon={MessageCircle}
          />
          <MetricItem label="Saves" value={formatCount(saves)} icon={Bookmark} />
          <MetricItem label="Reposts" value={formatCount(shares)} icon={Repeat2} />
          <MetricItem
            label="Engage"
            value={`${engagementRate}%`}
            icon={TrendingUp}
          />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-[var(--imc-surface)] px-2 py-3 text-center shadow-sm">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        <Icon size={13} />
      </div>

      <p className="mt-1 text-[13px] font-black text-[var(--imc-text)]">{value}</p>

      <p className="text-[9px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

function ProjectAnalyticsPreview({ item }) {
  return (
    <div className="p-4">
      <div className="rounded-[24px] bg-[var(--imc-surface-2)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#12141C] text-white">
            <FolderKanban size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-[var(--imc-indigo-text)]">
              Project
            </p>

            <h3 className="mt-1 line-clamp-2 text-[15px] font-black text-[var(--imc-text)]">
              {getContentTitle(item)}
            </h3>

            <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
              {formatCount(item?.followersCount || 0)} followers •{" "}
              {formatCount(item?.updatesCount || 0)} updates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;