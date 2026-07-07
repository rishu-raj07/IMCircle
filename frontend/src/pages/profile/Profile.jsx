import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  Eye,
  GraduationCap,
  MapPin,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import PostCard from "../../components/post/PostCard";
import JourneyCard from "../../components/post/JourneyCard";
import BottomNav from "../../components/navigation/BottomNav";
import RepostCard from "../../components/post/RepostCard";
import StreakCard from "../../components/streak/StreakCard";
import ShareCardModal from "../../components/streak/ShareCardModal";

import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";

import RankBadge from "../../components/badges/RankBadge";
import StreakMilestoneCard from "../../components/badges/StreakMilestoneCard";
import { getStreakBadgeTier } from "../../utils/badges";

import { getMyProfile, updateProfile } from "../../api/profileApi";
import { getFeed } from "../../api/feedApi";
import { getMyAnalyticsDashboard } from "../../api/analyticsApi";
import { getMyJourneys } from "../../api/journeyApi";
import { getMyBuilderScore } from "../../api/builderScoreApi";
import { getMyCircles } from "../../api/circleApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const TABS = ["All", "Posts", "Journey", "Reposts"];
const JOURNEY_TABS = ["Active", "Achieved", "Missed", "All"];

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
    getId(data?.learning?.user) ||
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
  else categories.push("Posts");

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

function formatLocation(location) {
  if (!location) return "India";
  if (typeof location === "string") return location;

  return [location?.city, location?.state, location?.country]
    .filter(Boolean)
    .join(", ");
}

function formatCount(value = 0) {
  // Clamp to 0 — stat counters should never render as negative even if
  // older/bad data drifted below zero server-side.
  const num = Math.max(Number(value) || 0, 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
}

// The cached `stats.xCount` counters can drift out of sync with the actual
// followers/following/circle arrays (e.g. after a bad decrement). The array
// itself is the ground truth — it's what every list page reads from — so
// prefer its length whenever the array is actually present.
function countOf(list, statsValue) {
  if (Array.isArray(list)) return list.length;
  return statsValue || 0;
}

function buildRepostCardPost(item) {
  return {
    ...item.data,
    repostText: item.repostText || "",
    isRepostView: true,
  };
}

function getCompletionPercent(user) {
  if (typeof user?.profileCompletionPercent === "number") {
    return Math.min(Math.max(user.profileCompletionPercent, 0), 100);
  }

  let score = 0;

  if (
    user?.fullName &&
    user?.headline &&
    user?.location?.city &&
    user?.gender
  ) {
    score += 40;
  }

  if (Array.isArray(user?.education) && user.education.length > 0) {
    score += 20;
  }

  if (Array.isArray(user?.experience) && user.experience.length > 0) {
    score += 20;
  }

  if (Array.isArray(user?.skills) && user.skills.length > 0) {
    score += 20;
  }

  return Math.min(score, 100);
}

function getJourneyStatus(journey = {}) {
  if (journey.status === "completed") return "Achieved";
  if (journey.status === "uncompleted") return "Missed";
  return "Active";
}

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [rankBadge, setRankBadge] = useState(null);
  const [signupRank, setSignupRank] = useState(null);
  const [analyticsDashboard, setAnalyticsDashboard] = useState(null);
  const [myActivity, setMyActivity] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [builderScore, setBuilderScore] = useState(null);
  const [shareModal, setShareModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [journeyTab, setJourneyTab] = useState("Active");

  const [selectedExperience, setSelectedExperience] = useState(null);
  const [selectedEducation, setSelectedEducation] = useState(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [showCompletionBadgeInfo, setShowCompletionBadgeInfo] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const profileData = await getMyProfile();
      const profileUser =
        profileData?.user || profileData?.data?.user || profileData?.data;

      setUser(profileUser);
      setRankBadge(profileData?.rankBadge || null);
      setSignupRank(profileData?.signupRank || null);

      try {
        const analyticsData = await getMyAnalyticsDashboard();
        setAnalyticsDashboard(
          analyticsData?.dashboard ||
            analyticsData?.data?.dashboard ||
            analyticsData?.data ||
            null
        );
      } catch (error) {
        // best-effort — non-critical
      }

      try {
        const journeyData = await getMyJourneys();
        setJourneys(normalizeJourneys(journeyData));
      } catch (error) {
        setJourneys([]);
      }

      try {
        const circleData = await getMyCircles();
        const memberships =
          circleData?.circles || circleData?.data?.circles || [];

        const owned = memberships
          .filter((item) => item?.role === "owner" && item?.circle)
          .map((item) => item.circle);

        setMyCommunities(owned);
      } catch (error) {
        setMyCommunities([]);
      }

      try {
        const scoreData = await getMyBuilderScore();
        setBuilderScore(
          scoreData?.builderScore || scoreData?.data?.builderScore || null
        );
      } catch (error) {
        setBuilderScore(null);
      }

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

      setMyActivity(mine);
    } catch (error) {
      setMyActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar, user?.profileImage, user?.profilePicture]);

  const fullName =
    user?.fullName || user?.name || user?.username || "IMCircle Builder";

  const tagline =
    user?.headline || user?.tagline || "Building something new on IMCircle";
  const interest =
    user?.primaryInterest || user?.field || user?.role || "Building in public";

  const location = formatLocation(user?.location);

  const avatar = getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.picture ||
      user?.photo
  );

  const stats = user?.stats || {};
  const overview = analyticsDashboard?.overview || {};
  const completionPercent = getCompletionPercent(user);
  const longestStreak = builderScore?.longestStreak || 0;
  const streakTier = getStreakBadgeTier(longestStreak);

  const totalReach =
    Number(overview?.totalPostImpressions || 0) +
    Number(overview?.totalLearningImpressions || 0) +
    Number(overview?.totalProjectImpressions || 0);

  const visibleItems = useMemo(() => {
    const profileActivity = myActivity.filter(
      (item) => item.rawType !== "learning"
    );

    if (activeTab === "All") return profileActivity.slice(0, 1);

    return profileActivity
      .filter((item) => item.categories?.includes(activeTab))
      .slice(0, 1);
  }, [activeTab, myActivity]);

  const persistProfilePatch = async (patch, fallbackUser) => {
    const res = await updateProfile(patch);
    const updatedUser = res?.user || res?.data?.user || res?.data || fallbackUser;
    setUser(updatedUser);
  };

  const deleteExperience = async (event, index) => {
    event?.stopPropagation?.();

    if (!window.confirm("Are you sure you want to delete this experience?")) return;

    const nextExperience = (Array.isArray(user?.experience) ? user.experience : []).filter(
      (_, itemIndex) => itemIndex !== index
    );

    await persistProfilePatch(
      { experience: nextExperience },
      { ...user, experience: nextExperience }
    );
  };

  const deleteEducation = async (event, index) => {
    event?.stopPropagation?.();

    if (!window.confirm("Are you sure you want to delete this education?")) return;

    const nextEducation = (Array.isArray(user?.education) ? user.education : []).filter(
      (_, itemIndex) => itemIndex !== index
    );

    await persistProfilePatch(
      { education: nextEducation },
      { ...user, education: nextEducation }
    );
  };

  const removeSkill = async (skillToRemove) => {
    if (!window.confirm("Are you sure you want to remove your skill?")) return;

    const oldSkills = Array.isArray(user?.skills) ? user.skills : [];
    const nextSkills = oldSkills
      .map((item) => (typeof item === "string" ? item : item?.name || item?.title || ""))
      .filter(Boolean)
      .filter((skill) => skill !== skillToRemove);

    await persistProfilePatch({ skills: nextSkills }, { ...user, skills: nextSkills });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
        <div className="flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[var(--imc-bg)]">
          <p className="text-[13px] font-black text-[var(--imc-text)]">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <style>
          {`
            @keyframes profileSlideDown {
              from { opacity: 0; transform: translateY(-8px); max-height: 0; }
              to { opacity: 1; transform: translateY(0); max-height: 360px; }
            }
          `}
        </style>
        <main className="px-5 pt-8">
          <section>
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setShowAvatarPreview(true)}
                disabled={!avatar || avatarFailed}
                className="imc-ring relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full p-[3px] active:scale-[0.97] disabled:active:scale-100"
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
                    <div className="grid h-full w-full place-items-center bg-[#12141C] text-[36px] font-black text-[#EC9A1E]">
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
                  {completionPercent >= 100 && (
                    <ProfileCompleteBadge onClick={() => setShowCompletionBadgeInfo(true)} />
                  )}
                  <RankBadge tier={rankBadge} rank={signupRank} />
                </div>

                {user?.username && (
                  <p className="mt-0.5 truncate text-[12.5px] font-bold text-[var(--imc-indigo-text)]">
                    @{user.username}
                  </p>
                )}

                <p className="mt-1.5 line-clamp-2 text-[12.5px] font-bold leading-5 text-[var(--imc-text-muted)]">
                  {tagline}
                </p>

                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                  <MapPin size={13} />
                  {location}
                </p>

                {user?.primaryInterest && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                    <Sparkles size={13} />
                    Exploring {user.primaryInterest}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 border-y border-[var(--imc-border)] py-3">
              <TopStat
                value={formatCount(
                  countOf(user?.followers, stats?.followersCount)
                )}
                label="Followers"
                onClick={() => navigate("/profile/people/followers")}
              />

              <TopStat
                value={formatCount(
                  countOf(
                    user?.circle || user?.circles,
                    stats?.circleCount
                  )
                )}
                label="Circle"
                onClick={() => navigate("/profile/people/circle")}
              />

              <TopStat
                value={formatCount(
                  countOf(user?.following, stats?.followingCount)
                )}
                label="Following"
                onClick={() => navigate("/profile/people/following")}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile-setup")}
                className="h-[44px] rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-text)] shadow-[0_8px_20px_rgba(15,23,42,0.06)] active:scale-[0.98]"
              >
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => setShareModal("profile")}
                className="h-[44px] rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-indigo-text)] active:scale-[0.98]"
              >
                Share Profile
              </button>
            </div>

            {builderScore && (
              <div className="mt-4">
                <StreakCard
                  builderScore={builderScore}
                  compact
                  onShare={() => setShareModal("streak")}
                />
              </div>
            )}

            {streakTier && (
              <div className="mt-4">
                <StreakMilestoneCard tier={streakTier} streak={longestStreak} />
              </div>
            )}

            {completionPercent < 100 && (
              <>
                <ProfileCompletionCard
                  percent={completionPercent}
                  expanded={completionOpen}
                  onClick={() => setCompletionOpen((value) => !value)}
                />

                {completionOpen && (
                  <ProfileCompletionActions
                    onExperience={() =>
                      navigate("/profile-setup?section=experience&mode=add")
                    }
                    onEducation={() =>
                      navigate("/profile-setup?section=education&mode=add")
                    }
                    onSkill={() => setShowSkillModal(true)}
                  />
                )}
              </>
            )}
          </section>

          <section className="mt-6">
            <div className="grid grid-cols-4 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-1">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl py-2 text-[10.5px] font-black transition ${
                    activeTab === tab
                      ? "bg-[var(--imc-surface-strong)] text-[var(--imc-on-surface-strong)]"
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
                      post={
                        item.isRepost ? buildRepostCardPost(item) : item.data
                      }
                      type="post"
                      currentUser={user}
                    />
                  );

                  return (
                    <div key={item.id || index} className="-mx-2">
                      {item.isRepost ? (
                        <RepostCard
                          repostText={item.repostText}
                          currentUser={user}
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

              <button
                type="button"
                onClick={() => navigate(`/profile/activity?tab=${activeTab}`)}
                className="mt-4 w-full rounded-2xl border border-[var(--imc-border)] py-3 text-[12px] font-black text-[var(--imc-indigo-text)]"
              >
                View More
              </button>
            </div>
          </section>

          <SectionTitle
            title="Profile Analytics"
            action="View All"
            onAction={() => navigate("/analytics")}
          />

          <section className="border-y border-[var(--imc-border)] py-4">
            <div className="grid grid-cols-4 gap-2">
              <AnalyticsCard
                label="Views"
                value={formatCount(overview?.profileViews || 0)}
                icon={Eye}
              />

              <AnalyticsCard
                label="Reach"
                value={formatCount(totalReach)}
                icon={TrendingUp}
              />

              <AnalyticsCard
                label="Clicks"
                value={formatCount(overview?.searchClicks || 0)}
                icon={Eye}
              />

              <AnalyticsCard
                label="Followers"
                value={formatCount(
                  overview?.netFollowerGrowth ||
                    countOf(user?.followers, stats?.followersCount)
                )}
                icon={Users}
              />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[rgba(67,56,202,0.12)] px-3 py-3">
              <TrendingUp size={16} className="text-[var(--imc-indigo-text)]" />
              <div>
                <p className="text-[11.5px] font-black text-[var(--imc-text)]">
                  {formatCount(overview?.profileViews || 0)} total profile views
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-[var(--imc-text-muted)]">
                  {formatCount(overview?.searchAppearances || 0)} search
                  appearances • {formatCount(overview?.searchClicks || 0)} search
                  clicks
                </p>
              </div>
            </div>
          </section>

          <SectionTitle
            title="Journey"
            action={<Plus size={17} />}
            onAction={() => navigate("/create-journey")}
          />

          <JourneyDashboard
            journeys={journeys}
            activeTab={journeyTab}
            setActiveTab={setJourneyTab}
            onView={(id) => navigate(`/journey/${id}`)}
          />

          {myCommunities.length > 0 && (
            <>
              <SectionTitle
                title="My communities"
                action={<Plus size={17} />}
                onAction={() => navigate("/create-circle")}
              />

              <section className="border-y border-[var(--imc-border)] py-4">
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {myCommunities.map((circle) => {
                    const circleId = getId(circle);
                    const cover = getImageUrl(circle?.coverImage);

                    return (
                      <div
                        key={circleId}
                        className="min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)]"
                      >
                        <div
                          className="relative h-[74px] w-full"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(236,154,30,0.2), rgba(67,56,202,0.16))",
                          }}
                        >
                          {cover ? (
                            <img
                              src={cover}
                              alt={circle?.name || "Circle"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center">
                              <Users size={22} className="text-[var(--imc-marigold)]" />
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-[13px] font-black text-[var(--imc-text)]">
                            {circle?.name || "Circle"}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] font-bold text-[var(--imc-text-muted)]">
                            {circle?.membersCount || 0} members
                          </p>

                          <button
                            type="button"
                            onClick={() => navigate(`/circles/${circleId}`)}
                            className="mt-2 h-9 w-full rounded-[12px] text-[11px] font-black text-[var(--imc-ink)]"
                            style={{ background: "var(--imc-marigold)" }}
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <SectionTitle
            title="Experience"
            action={<Plus size={17} />}
            onAction={() =>
              navigate("/profile-setup?section=experience&mode=add")
            }
          />

          <section className="border-y border-[var(--imc-border)] py-4">
            {Array.isArray(user?.experience) && user.experience.length > 0 ? (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {user.experience.map((item, index) => (
                  <div
                    key={item?._id || `${item?.title}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedExperience(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSelectedExperience(item);
                      }
                    }}
                    className="min-w-full max-w-full snap-start cursor-pointer text-left active:scale-[0.99]"
                  >
                    <ExperienceCard
                      experience={item}
                      onEdit={(event) => {
                        event?.stopPropagation?.();
                        navigate(
                          `/profile-setup?section=experience&index=${index}`
                        );
                      }}
                      onDelete={(event) => deleteExperience(event, index)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  navigate("/profile-setup?section=experience&mode=add")
                }
                className="w-full rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.12)] px-5 py-5 text-left"
              >
                <p className="text-[15px] font-black text-[var(--imc-text)]">
                  Add your experience
                </p>
                <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                  Add company, role and work details.
                </p>
              </button>
            )}
          </section>

          <SectionTitle
            title="Education"
            action={<Plus size={17} />}
            onAction={() =>
              navigate("/profile-setup?section=education&mode=add")
            }
          />

          <section className="border-y border-[var(--imc-border)] py-4">
            {Array.isArray(user?.education) && user.education.length > 0 ? (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {user.education.map((item, index) => (
                  <div
                    key={item?._id || `${item?.collegeName}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEducation(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSelectedEducation(item);
                      }
                    }}
                    className="min-w-full max-w-full snap-start cursor-pointer text-left active:scale-[0.99]"
                  >
                    <EducationCard
                      education={item}
                      onEdit={(event) => {
                        event?.stopPropagation?.();
                        navigate(
                          `/profile-setup?section=education&index=${index}`
                        );
                      }}
                      onDelete={(event) => deleteEducation(event, index)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  navigate("/profile-setup?section=education&mode=add")
                }
                className="w-full rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.12)] px-5 py-5 text-left"
              >
                <p className="text-[15px] font-black text-[var(--imc-text)]">
                  Add your education
                </p>
                <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                  Add school, college, degree and learning details.
                </p>
              </button>
            )}
          </section>

          <SectionTitle
            title="Skills"
            action={<Plus size={17} />}
            onAction={() => setShowSkillModal(true)}
          />

          <SkillsCard skills={user?.skills || []} onRemove={removeSkill} />
        </main>

        {selectedExperience && (
          <DetailModal
            title={selectedExperience?.title || "Experience"}
            subtitle={selectedExperience?.organisation || "Organisation"}
            onClose={() => setSelectedExperience(null)}
            items={[
              ["Company", selectedExperience?.organisation],
              ["Type", selectedExperience?.employmentType],
              ["Location", selectedExperience?.location],
              ["Work Mode", selectedExperience?.locationType],
              ["Summary", selectedExperience?.summary],
              [
                "Skills",
                Array.isArray(selectedExperience?.skills)
                  ? selectedExperience.skills.join(", ")
                  : "",
              ],
            ]}
          />
        )}

        {selectedEducation && (
          <DetailModal
            title={selectedEducation?.degree || "Education"}
            subtitle={selectedEducation?.collegeName || "Institute"}
            onClose={() => setSelectedEducation(null)}
            items={[
              ["College", selectedEducation?.collegeName],
              ["Stream", selectedEducation?.stream],
              ["Grade", selectedEducation?.grade],
              ["Activities", selectedEducation?.activities],
              ["Description", selectedEducation?.description],
              [
                "Skills",
                Array.isArray(selectedEducation?.skills)
                  ? selectedEducation.skills.join(", ")
                  : "",
              ],
            ]}
          />
        )}

        {showSkillModal && (
          <SkillModal
            user={user}
            onClose={() => setShowSkillModal(false)}
            onSaved={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {showAvatarPreview && avatar && !avatarFailed && (
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

        {showCompletionBadgeInfo && (
          <ProfileCompleteSheet onClose={() => setShowCompletionBadgeInfo(false)} />
        )}

        <BottomNav />

        <ShareCardModal
          open={Boolean(shareModal)}
          onClose={() => setShareModal(null)}
          kind={shareModal || "profile"}
          filename={shareModal === "streak" ? "imcircle-streak.png" : "imcircle-profile.png"}
          shareText={
            shareModal === "streak"
              ? `I'm on a ${builderScore?.currentStreak || 0}-day streak building on IMCircle 🔥`
              : `Connect with me on IMCircle`
          }
          data={
            shareModal === "streak"
              ? {
                  name: fullName,
                  avatarUrl: avatar,
                  streak: builderScore?.currentStreak || 0,
                  longestStreak: builderScore?.longestStreak || 0,
                  level: builderScore?.level || "Explorer",
                  interest,
                }
              : {
                  name: fullName,
                  headline: tagline,
                  avatarUrl: avatar,
                  interest,
                  streak: builderScore?.currentStreak || 0,
                  circleCount: countOf(
                    user?.circle || user?.circles,
                    stats?.circleCount
                  ),
                }
          }
        />
      </div>
    </div>
  );
}

function ProfileCompletionCard({ percent, expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full rounded-[22px] bg-[rgba(67,56,202,0.12)] px-4 py-4 text-left active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-black text-[var(--imc-text)]">
            Profile {percent}% completed
          </p>
          <p className="mt-1 text-[11px] font-bold text-[var(--imc-text-muted)]">
            Complete education, experience and skills.
          </p>
        </div>

        <span className="rounded-full bg-[var(--imc-surface)] px-3 py-1 text-[10px] font-black text-[var(--imc-indigo-text)]">
          {expanded ? "Close" : "Pending"}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--imc-surface)]">
        <div
          className="h-full rounded-full bg-[#EC9A1E]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 text-[10.5px] font-black text-[var(--imc-indigo-text)]">
        <span>{expanded ? "Hide quick actions" : "Tap to complete here"}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </div>
    </button>
  );
}

function ProfileCompleteBadge({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile completion shield"
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white shadow-[0_8px_18px_rgba(67,56,202,0.28)] active:scale-95"
    >
      <Shield size={14} strokeWidth={2.5} />
    </button>
  );
}

function ProfileCompleteSheet({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[rgba(67,56,202,0.12)] text-[#4338CA]">
          <Shield size={28} />
        </div>
        <h3 className="mt-4 text-center text-[18px] font-black text-[var(--imc-text)]">
          Your profile is completed 100%
        </h3>
        <p className="mx-auto mt-2 max-w-[280px] text-center text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          This badge appears after your basic details, education, experience, and skills are all complete.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-2xl bg-[#12141C] text-[13px] font-black text-white active:scale-[0.99]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ProfileCompletionActions({ onExperience, onEducation, onSkill }) {
  const actions = [
    {
      title: "Experience",
      text: "Add your role and work proof",
      icon: BriefcaseBusiness,
      color: "var(--imc-indigo-text)",
      bg: "rgba(67,56,202,0.12)",
      onClick: onExperience,
    },
    {
      title: "Education",
      text: "Add college, degree or stream",
      icon: GraduationCap,
      color: "#059669",
      bg: "rgba(5,150,105,0.12)",
      onClick: onEducation,
    },
    {
      title: "Skills",
      text: "Add your strongest skills",
      icon: Sparkles,
      color: "#EC9A1E",
      bg: "rgba(236,154,30,0.14)",
      onClick: onSkill,
    },
  ];

  return (
    <div className="mt-3 grid gap-2 rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)] animate-[profileSlideDown_220ms_ease-out]">
      {actions.map(({ title, text, icon: Icon, color, bg, onClick }) => (
        <button
          key={title}
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-bg)] px-3 py-3 text-left active:scale-[0.99]"
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: bg, color }}
          >
            <Icon size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-[var(--imc-text)]">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-bold text-[var(--imc-text-muted)]">
              {text}
            </span>
          </span>
          <Plus size={17} className="text-[var(--imc-indigo-text)]" />
        </button>
      ))}
    </div>
  );
}

function JourneyDashboard({ journeys = [], activeTab, setActiveTab, onView }) {
  const counts = {
    Active: journeys.filter((j) => getJourneyStatus(j) === "Active").length,
    Achieved: journeys.filter((j) => getJourneyStatus(j) === "Achieved").length,
    Missed: journeys.filter((j) => getJourneyStatus(j) === "Missed").length,
    All: journeys.length,
  };

  const filtered = journeys.filter((journey) => {
    if (activeTab === "All") return true;
    return getJourneyStatus(journey) === activeTab;
  });

  return (
    <section className="border-y border-[var(--imc-border)] py-4">
      <div className="flex gap-2 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOURNEY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black transition ${
              activeTab === tab
                ? "bg-[var(--imc-surface-strong)] text-[var(--imc-on-surface-strong)]"
                : "bg-[var(--imc-surface)] text-[var(--imc-text-muted)]"
            }`}
          >
            <span>{tab}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                activeTab === tab
                  ? "bg-white/20 text-[var(--imc-on-surface-strong)]"
                  : "bg-[var(--imc-surface)] text-[var(--imc-text-muted)]"
              }`}
            >
              {counts[tab] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.length > 0 ? (
          filtered.map((journey) => (
            <div key={journey._id} className="w-[86%] shrink-0 snap-start">
              <JourneyProfileCard
                journey={journey}
                onView={() => onView(journey._id)}
              />
            </div>
          ))
        ) : (
          <div className="w-full rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.12)] p-5 text-center">
            <p className="text-[13px] font-black text-[var(--imc-text)]">
              No {activeTab.toLowerCase()} journey
            </p>
            <p className="mt-1 text-[11px] font-bold text-[var(--imc-text-muted)]">
              Your journeys will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
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

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black ${
            status === "Achieved"
              ? "bg-[rgba(5,150,105,0.12)] text-[#059669]"
              : status === "Missed"
              ? "bg-[rgba(217,45,32,0.1)] text-[#D92D20]"
              : "bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
          }`}
        >
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
            className={`h-full rounded-full ${
              status === "Missed"
                ? "bg-[#D92D20]"
                : status === "Achieved"
                ? "bg-[#059669]"
                : "bg-[#EC9A1E]"
            }`}
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

      {status === "Missed" && (
        <p className="mt-3 rounded-2xl bg-[rgba(217,45,32,0.1)] px-3 py-2 text-[10.5px] font-bold text-[#D92D20]">
          {journey.uncompletedReason || "This journey missed a daily update."}
        </p>
      )}

      <button
        type="button"
        onClick={onView}
        className="mt-4 w-full rounded-2xl bg-[var(--imc-surface-strong)] py-3 text-[12px] font-black text-[var(--imc-on-surface-strong)] active:scale-[0.98]"
      >
        View Journey →
      </button>
    </article>
  );
}

function SkillModal({ user, onClose, onSaved }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const saveSkill = async () => {
    const skill = value.trim();
    if (!skill) return;

    const oldSkills = Array.isArray(user?.skills) ? user.skills : [];

    const normalized = oldSkills
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.title || "";
      })
      .filter(Boolean);

    if (normalized.map((x) => x.toLowerCase()).includes(skill.toLowerCase())) {
      onClose();
      return;
    }

    try {
      setSaving(true);

      const skills = [...normalized, skill];

      const res = await updateProfile({ skills });

      const updatedUser = res?.user || res?.data?.user || res?.data || {
        ...user,
        skills,
      };

      onSaved(updatedUser);
      onClose();
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4">
      <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

        <h3 className="text-[18px] font-black text-[var(--imc-text)]">Add Skill</h3>
        <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
          Type your skill manually and save it.
        </p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveSkill();
          }}
          placeholder="Example: React, Sales, Marketing"
          className="mt-5 h-12 w-full rounded-2xl border border-[var(--imc-border)] px-4 text-[13px] font-bold outline-none focus:border-[var(--imc-indigo-text)]"
          autoFocus
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text)]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveSkill}
            disabled={saving}
            className="h-12 rounded-2xl bg-[var(--imc-surface-strong)] text-[13px] font-black text-[var(--imc-on-surface-strong)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ title, subtitle, items = [], onClose }) {
  const visibleItems = items.filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-4">
      <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[18px] font-black text-[var(--imc-text)]">{title}</h3>
            <p className="mt-1 text-[13px] font-bold text-[var(--imc-text-muted)]">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[20px] font-black text-[var(--imc-text)]"
          >
            ×
          </button>
        </div>

        {visibleItems.length > 0 ? (
          <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pb-2">
            {visibleItems.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[rgba(67,56,202,0.12)] p-3">
                <p className="text-[11px] font-black text-[var(--imc-indigo-text)]">
                  {label}
                </p>
                <p className="mt-1 break-words text-[13px] font-bold leading-5 text-[var(--imc-text)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-[rgba(67,56,202,0.12)] p-4 text-center">
            <p className="text-[13px] font-bold text-[var(--imc-text-muted)]">
              No extra details added yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsCard({ skills, onRemove }) {
  const normalizedSkills = Array.isArray(skills)
    ? skills
        .map((skill) => {
          if (typeof skill === "string") return skill;
          return skill?.name || skill?.title || "";
        })
        .filter(Boolean)
    : [];

  if (normalizedSkills.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.12)] px-5 py-5">
        <p className="text-[15px] font-black text-[var(--imc-text)]">
          No skills added
        </p>
        <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
          Add your top skills to get discovered.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-wrap gap-2 border-y border-[var(--imc-border)] py-4">
      {normalizedSkills.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(67,56,202,0.12)] px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]"
        >
          {skill}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(skill)}
              className="grid h-4 w-4 place-items-center rounded-full bg-white/70 text-[var(--imc-indigo-text)] active:scale-95 dark:bg-black/20"
              aria-label={`Remove ${skill}`}
            >
              <X size={11} strokeWidth={3} />
            </button>
          )}
        </span>
      ))}
    </section>
  );
}

function EmptyActivity({ activeTab }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-center">
      <p className="text-[14px] font-black text-[var(--imc-text)]">
        No {activeTab} yet
      </p>
      <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
        Your recent activity will appear here.
      </p>
    </div>
  );
}

function TopStat({ value, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center active:scale-[0.97]"
    >
      <p className="text-[17px] font-black text-[var(--imc-text)]">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </button>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-[17px] font-black text-[var(--imc-text)]">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[12px] font-black text-[var(--imc-indigo-text)]"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function AnalyticsCard({ label, value, icon: Icon }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[rgba(67,56,202,0.12)]">
        <Icon size={14} className="text-[var(--imc-indigo-text)]" />
      </div>
      <p className="mt-2 text-[15px] font-black text-[var(--imc-text)]">{value}</p>
      <p className="mt-0.5 text-[8.5px] font-bold leading-3 text-[var(--imc-text-muted)]">
        {label}
      </p>
    </div>
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


export default Profile;
