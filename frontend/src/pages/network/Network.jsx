import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Flame,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import TopHeader from "../../components/navigation/TopHeader";
import CircleAction from "../../components/common/CircleAction";
import DefaultAvatar from "../../components/common/Avatar";

import {
  getReceivedCircleRequests,
  acceptCircleRequest,
  rejectCircleRequest,
  getSentCircleRequests,
} from "../../api/circleRequestApi";

import {
  getMyCircles,
  getTrendingCircles,
  getBrowseCircles,
  joinCircle,
  getMyCircleInvites,
  dismissCircleInvite,
  requestToJoinCircle,
  getMySentCircleJoinRequests,
} from "../../api/circleApi";
import { getUserSuggestions } from "../../api/userApi";
import { getMyProfile } from "../../api/profileApi";
import { getJourneyDiscoverFeed } from "../../api/journeyApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// ---------------------------------------------------------------------------
// Brand tokens — IMCircle
// Ink (near-black navy) for authority + text, Marigold for warmth/action,
// Indigo reserved for the "circle" motif so it stays meaningful, not decorative.
// ---------------------------------------------------------------------------
const INK = "var(--imc-text)";
const MARIGOLD = "#EC9A1E";
const INDIGO = "#4338CA";
const MUTED = "var(--imc-text-muted)";
const LINE = "var(--imc-border)";

// "View more" reveal pattern shared by both circle strips: show a handful
// up front, then expand by a much bigger batch each time "View more" is
// tapped, repeating until nothing is left.
const REVEAL_INITIAL = 5;
const REVEAL_STEP = 20;
const PEOPLE_REVEAL_INITIAL = 10;
const PEOPLE_REVEAL_STEP = 10;

// Real-data filter chips over "Recommended Circle" — matched against each
// person's actual role/field/headline/primaryInterest, never fabricated.
const NETWORK_FILTERS = [
  { value: "all", label: "All" },
  { value: "students", label: "Students", keywords: ["student"] },
  { value: "founders", label: "Founders", keywords: ["founder", "co-founder", "ceo", "entrepreneur"] },
  { value: "creators", label: "Creators", keywords: ["creator", "content", "design", "designer"] },
  { value: "developers", label: "Developers", keywords: ["developer", "engineer", "programmer", "swe", "tech"] },
  { value: "investors", label: "Investors", keywords: ["investor", "vc", "angel"] },
  { value: "opportunities", label: "Opportunities", keywords: ["hiring", "opportunity", "recruit"] },
];

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getHeadline(user) {
  return (
    user?.headline ||
    user?.tagline ||
    user?.role ||
    user?.field ||
    "IMCircle user"
  );
}

function getLocation(user) {
  if (typeof user?.location === "string") return user.location;

  return (
    [user?.location?.city, user?.location?.state].filter(Boolean).join(", ") ||
    user?.city ||
    "India"
  );
}

function getImageUrl(image) {
  if (!image) return "";

  const url =
    image?.secure_url ||
    image?.url ||
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
      user?.profile?.profileImage
  );
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
  return getId(request?.receiver || request?.receiverId || request?.to);
}

export default function Network() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [requests, setRequests] = useState([]);
  const [invites, setInvites] = useState([]);
  const [myCircles, setMyCircles] = useState([]);
  const [circles, setCircles] = useState([]);
  const [trendingPersonalized, setTrendingPersonalized] = useState(false);
  const [trendingInterest, setTrendingInterest] = useState("");
  const [people, setPeople] = useState([]);
  const [requestedUserIds, setRequestedUserIds] = useState([]);
  const [joinedCircleIds, setJoinedCircleIds] = useState([]);
  const [requestedCircleIds, setRequestedCircleIds] = useState([]);
  const [buildingInPublic, setBuildingInPublic] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const [myCirclesVisibleCount, setMyCirclesVisibleCount] = useState(REVEAL_INITIAL);
  const [suggestedVisibleCount, setSuggestedVisibleCount] = useState(REVEAL_INITIAL);
  const [suggestedPage, setSuggestedPage] = useState(0);
  const [suggestedHasMore, setSuggestedHasMore] = useState(true);
  const [loadingMoreSuggested, setLoadingMoreSuggested] = useState(false);
  const [peopleVisibleCount, setPeopleVisibleCount] = useState(PEOPLE_REVEAL_INITIAL);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  const topRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const myCircleUserIds = useMemo(() => {
    const members = me?.circle || me?.circleMembers || me?.connections || [];
    return new Set((Array.isArray(members) ? members : []).map((item) => String(getId(item?.user || item))).filter(Boolean));
  }, [me]);

  // Default "Recommended Circle" view — people who genuinely overlap with
  // the viewer's own field/role/primary interest (e.g. if your interest is
  // "startup", only startup-interested people show up here). Falls back to
  // the full suggestion list when nothing matches, so the section is never
  // left empty. This is real-data matching, same rule the old "similar
  // things" card used to use — now folded straight into the main list.
  const interestMatchedPeople = useMemo(() => {
    if (!me) return people;

    const meField = String(me.field || "").toLowerCase();
    const meRole = String(me.role || "").toLowerCase();
    const meInterest = String(me.primaryInterest || "").toLowerCase();

    if (!meField && !meRole && !meInterest) return people;

    const matched = people.filter((person) => {
      const field = String(person?.field || "").toLowerCase();
      const role = String(person?.role || "").toLowerCase();
      const interest = String(person?.primaryInterest || "").toLowerCase();

      return (
        (meField && field === meField) ||
        (meRole && role === meRole) ||
        (meInterest && interest === meInterest)
      );
    });

    return matched.length > 0 ? matched : people;
  }, [me, people]);

  const filteredPeople = useMemo(() => {
    if (activeFilter === "all") return interestMatchedPeople;

    const filter = NETWORK_FILTERS.find((item) => item.value === activeFilter);
    const keywords = filter?.keywords || [];
    if (keywords.length === 0) return people;

    // Category chips (Students / Founders / ...) search everyone, not just
    // interest-matched people — you're deliberately browsing outside your
    // own lane here.
    return people.filter((person) => {
      const haystack = `${person?.role || ""} ${person?.field || ""} ${person?.primaryInterest || ""} ${person?.headline || ""}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    });
  }, [people, interestMatchedPeople, activeFilter]);

  // Communities split into "aligned with your interest" vs "everything
  // else" — both drawn from the same real `circles` suggestion list.
  const interestMatchedCircles = useMemo(() => {
    if (!me) return [];

    const meField = String(me.field || "").toLowerCase();
    const meInterest = String(me.primaryInterest || "").toLowerCase();
    if (!meField && !meInterest) return [];

    return circles.filter((circle) => {
      const haystack = `${circle?.name || ""} ${circle?.description || ""} ${(circle?.tags || []).join(" ")}`.toLowerCase();
      return (meField && haystack.includes(meField)) || (meInterest && haystack.includes(meInterest));
    });
  }, [circles, me]);

  const exploreCircles = useMemo(() => {
    const matchedIds = new Set(interestMatchedCircles.map((circle) => String(getId(circle))));
    return circles.filter((circle) => !matchedIds.has(String(getId(circle))));
  }, [circles, interestMatchedCircles]);

  // "Recommended Circle" falls back to every available circle when nothing
  // matches your interest, so the section is never empty. When it does fall
  // back, "Explore Circles" below is skipped entirely — otherwise the same
  // circles would just repeat in both sections.
  const hasInterestCircleMatch = interestMatchedCircles.length > 0;
  const recommendedCircles = hasInterestCircleMatch ? interestMatchedCircles : circles;
  const showExploreCircles = hasInterestCircleMatch && exploreCircles.length > 0;

  // Guards against the classic dev-StrictMode double-invoke problem (and
  // any overlapping manual Refresh click): axios's GET de-dupe logic in
  // api/axios.js aborts an older in-flight request for the same URL the
  // moment a newer identical one starts, which made the FIRST of the two
  // mount-time calls resolve as all-rejected and — because the code used to
  // unconditionally set setLoading(false) in `finally` — flip the page to
  // "not loading, still empty" right before the second (real) call's data
  // landed. Only the most recently started call is now allowed to touch
  // state at all; every earlier, superseded call's results are dropped.
  const loadIdRef = useRef(0);

  const loadNetwork = async () => {
    const requestId = ++loadIdRef.current;
    const isCurrent = () => loadIdRef.current === requestId;

    try {
      setLoading(true);

      const [
        profileRes,
        requestRes,
        circleRes,
        peopleRes,
        sentRes,
        myCircleRes,
        inviteRes,
        joinRequestRes,
        journeyFeedRes,
      ] = await Promise.allSettled([
        getMyProfile(),
        getReceivedCircleRequests(),
        getTrendingCircles(),
        getUserSuggestions(),
        getSentCircleRequests(),
        getMyCircles(),
        getMyCircleInvites(),
        getMySentCircleJoinRequests(),
        getJourneyDiscoverFeed(),
      ]);

      // A newer loadNetwork() call has already started (or finished) since
      // this one kicked off — its results are stale, so drop them entirely
      // instead of letting them clobber whatever the latest call sets.
      if (!isCurrent()) return;

      if (profileRes.status === "fulfilled") {
        const user =
          profileRes.value?.user ||
          profileRes.value?.data?.user ||
          profileRes.value?.data ||
          profileRes.value;
        setMe(user || null);
      }

      if (requestRes.status === "fulfilled") {
        setRequests(normalizeRequestList(requestRes.value));
      }

      // Resolved first so the suggestion list below can filter against it —
      // a circle you're already in must never show up as a "suggestion",
      // even as a defense-in-depth check on top of the backend's own filter.
      let myJoinedIds = [];
      if (myCircleRes.status === "fulfilled") {
        const memberships =
          myCircleRes.value?.circles ||
          myCircleRes.value?.data?.circles ||
          [];

        const ownCircles = memberships
          .map((item) => item?.circle || item)
          .filter(Boolean);

        setMyCircles(ownCircles);
        setMyCirclesVisibleCount(REVEAL_INITIAL);

        myJoinedIds = [
          ...new Set(
            memberships
              .map((item) => String(getId(item?.circle || item)))
              .filter(Boolean)
          ),
        ];

        setJoinedCircleIds(myJoinedIds);
      }

      if (circleRes.status === "fulfilled") {
        const suggested = (
          circleRes.value?.circles ||
          circleRes.value?.data?.circles ||
          []
        ).filter(
          (circle) =>
            circle?.visibility !== "private" &&
            !myJoinedIds.includes(String(getId(circle)))
        );

        setCircles(suggested);
        setSuggestedVisibleCount(REVEAL_INITIAL);
        setSuggestedPage(0);
        // A full batch hints there may be more behind it; a short batch
        // means that's genuinely everything available.
        setSuggestedHasMore(suggested.length >= 10);
        setTrendingPersonalized(Boolean(circleRes.value?.personalized));
        setTrendingInterest(circleRes.value?.primaryInterest || "");

        const inlineRequestedIds =
          circleRes.value?.requestedCircleIds ||
          circleRes.value?.data?.requestedCircleIds ||
          [];

        if (inlineRequestedIds.length > 0) {
          setRequestedCircleIds((prev) => [
            ...new Set([...prev, ...inlineRequestedIds.map(String)]),
          ]);
        }
      }

      if (joinRequestRes.status === "fulfilled") {
        const ids =
          joinRequestRes.value?.circleIds ||
          joinRequestRes.value?.data?.circleIds ||
          [];

        setRequestedCircleIds((prev) => [...new Set([...prev, ...ids.map(String)])]);
      }

      if (inviteRes.status === "fulfilled") {
        setInvites(
          inviteRes.value?.invites ||
            inviteRes.value?.data?.invites ||
            []
        );
      }

      if (peopleRes.status === "fulfilled") {
        setPeople(
          peopleRes.value?.users ||
            peopleRes.value?.people ||
            peopleRes.value?.suggestions ||
            peopleRes.value?.data?.users ||
            []
        );
        setPeopleVisibleCount(PEOPLE_REVEAL_INITIAL);
      }

      if (sentRes.status === "fulfilled") {
        const pendingIds = normalizeRequestList(sentRes.value)
          .filter((item) => !item?.status || item.status === "pending")
          .map((item) => String(getPendingReceiverId(item)))
          .filter(Boolean);

        setRequestedUserIds([...new Set(pendingIds)]);
      }

      // "People Building in Public" — real recent Journey milestones (this
      // app's actual "building in public" content), not a fabricated section.
      if (journeyFeedRes.status === "fulfilled") {
        const milestones =
          journeyFeedRes.value?.milestones ||
          journeyFeedRes.value?.data?.milestones ||
          [];

        setBuildingInPublic(milestones.slice(0, 8));
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const removeRequest = (requestId) => {
    setRequests((prev) =>
      prev.filter((request) => String(getId(request)) !== String(requestId))
    );
  };

  const handleAccept = async (requestId) => {
    if (!requestId || actionId) return;

    try {
      setActionId(requestId);
      await acceptCircleRequest(requestId);
      removeRequest(requestId);
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (requestId) => {
    if (!requestId || actionId) return;

    try {
      setActionId(requestId);
      await rejectCircleRequest(requestId);
      removeRequest(requestId);
    } finally {
      setActionId("");
    }
  };

  const handleJoinCircle = async (circleId) => {
    if (!circleId || actionId) return;

    try {
      setActionId(circleId);
      await joinCircle(circleId);
      setJoinedCircleIds((prev) => [...new Set([...prev, circleId])]);
      setMyCircles((prev) => {
        const joinedCircle = circles.find(
          (circle) => String(getId(circle)) === String(circleId)
        );

        if (!joinedCircle) return prev;
        if (prev.some((circle) => String(getId(circle)) === String(circleId))) {
          return prev;
        }

        return [...prev, joinedCircle];
      });
      navigate(`/circles/${circleId}`);
    } catch (error) {
      const message = error?.response?.data?.message || "";

      if (message.toLowerCase().includes("already joined")) {
        setJoinedCircleIds((prev) => [...new Set([...prev, circleId])]);
        setMyCircles((prev) => {
          const joinedCircle = circles.find(
            (circle) => String(getId(circle)) === String(circleId)
          );

          if (!joinedCircle) return prev;
          if (prev.some((circle) => String(getId(circle)) === String(circleId))) {
            return prev;
          }

          return [...prev, joinedCircle];
        });
        navigate(`/circles/${circleId}`);
        return;
      }

      alert(message || "Could not join this circle. Please try again.");
    } finally {
      setActionId("");
    }
  };

  const handleRequestToJoinCircle = async (circleId) => {
    const id = String(circleId || "");
    if (!id || actionId || requestedCircleIds.includes(id)) return;

    setRequestedCircleIds((prev) => [...new Set([...prev, id])]);

    try {
      setActionId(id);
      await requestToJoinCircle(id);
    } catch (error) {
      const message = error?.response?.data?.message || "";

      if (!message.toLowerCase().includes("already")) {
        setRequestedCircleIds((prev) => prev.filter((item) => item !== id));
        alert(message || "Could not send this request. Please try again.");
      }
    } finally {
      setActionId("");
    }
  };

  // "Circles you're in" already has everything loaded (getMyCircles has no
  // cap), so revealing more is a pure client-side slice — no network call.
  const handleShowMoreMyCircles = () => {
    setMyCirclesVisibleCount((prev) => Math.min(prev + REVEAL_STEP, myCircles.length));
  };

  // "Suggested for you" starts from a small personalized batch (max 10).
  // Once that's exhausted, keep filling from the plain browse endpoint,
  // page by page, deduping against anything already shown.
  const handleShowMoreSuggested = async () => {
    if (loadingMoreSuggested) return;

    const nextVisible = suggestedVisibleCount + REVEAL_STEP;

    if (circles.length >= nextVisible) {
      setSuggestedVisibleCount(nextVisible);
      return;
    }

    if (!suggestedHasMore) {
      setSuggestedVisibleCount(circles.length);
      return;
    }

    try {
      setLoadingMoreSuggested(true);

      const nextPage = suggestedPage + 1;
      const res = await getBrowseCircles({ page: nextPage, limit: REVEAL_STEP });
      const existingIds = new Set(circles.map((circle) => String(getId(circle))));

      const fresh = (res?.circles || []).filter((circle) => {
        const id = String(getId(circle));
        return (
          circle?.visibility !== "private" &&
          !existingIds.has(id) &&
          !joinedCircleIds.includes(id)
        );
      });

      const merged = [...circles, ...fresh];
      setCircles(merged);
      setSuggestedPage(nextPage);
      setSuggestedHasMore(Boolean(res?.hasMore));
      setSuggestedVisibleCount(Math.min(nextVisible, merged.length));

      const inlineRequestedIds = res?.requestedCircleIds || [];
      if (inlineRequestedIds.length > 0) {
        setRequestedCircleIds((prev) => [
          ...new Set([...prev, ...inlineRequestedIds.map(String)]),
        ]);
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setLoadingMoreSuggested(false);
    }
  };

  const handleJoinInvite = async (invite) => {
    const circleId = String(getId(invite?.circle));
    const inviteId = String(getId(invite));
    if (!circleId || actionId) return;

    try {
      setActionId(inviteId || circleId);
      await joinCircle(circleId);

      setInvites((prev) =>
        prev.filter((item) => String(getId(item)) !== inviteId)
      );
      setJoinedCircleIds((prev) => [...new Set([...prev, circleId])]);
      setMyCircles((prev) => {
        if (prev.some((circle) => String(getId(circle)) === circleId)) {
          return prev;
        }
        return [...prev, invite.circle];
      });

      navigate(`/circles/${circleId}`);
    } catch (error) {
      const message = error?.response?.data?.message || "";

      if (message.toLowerCase().includes("already joined")) {
        setInvites((prev) =>
          prev.filter((item) => String(getId(item)) !== inviteId)
        );
        navigate(`/circles/${circleId}`);
        return;
      }

      alert(message || "Could not join this circle. Please try again.");
    } finally {
      setActionId("");
    }
  };

  const handleDismissInvite = async (invite) => {
    const inviteId = String(getId(invite));
    if (!inviteId) return;

    setInvites((prev) => prev.filter((item) => String(getId(item)) !== inviteId));

    try {
      await dismissCircleInvite(inviteId);
    } catch {
      // best-effort — keep it dismissed locally even if this call fails
    }
  };

  return (
    <div
      className="flex min-h-screen justify-center"
      style={{ background: "var(--imc-bg)" }}
    >
      <div
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-24"
        style={{ background: "var(--imc-bg)" }}
      >
        <BrandStyles />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg
            className="absolute -right-28 -top-32 h-[380px] w-[380px] opacity-[0.28]"
            viewBox="0 0 420 420"
            fill="none"
          >
            <circle cx="210" cy="210" r="209" stroke={MARIGOLD} strokeOpacity="0.16" />
            <circle cx="210" cy="210" r="155" stroke={MARIGOLD} strokeOpacity="0.12" />
            <circle cx="210" cy="210" r="96" stroke={INDIGO} strokeOpacity="0.12" />
          </svg>
        </div>

        <div className="relative">
          <div className="px-3 pt-2">
            <TopHeader />
          </div>

          <div className="flex items-start justify-between gap-3 px-3 pt-4">
            <div className="min-w-0">
              <h1
                className="font-serif text-[22px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--imc-text)" }}
              >
                Network
              </h1>
              <p className="mt-0.5 text-[11px] font-semibold" style={{ color: MUTED }}>
                Build meaningful circles, grow together.
              </p>
            </div>

            <CircleRequestsSummaryCard
              requests={requests}
              sentCount={requestedUserIds.length}
              onClick={() => navigate("/requests")}
            />
          </div>

          <main className="px-3 pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/search")}
                className="flex h-[50px] flex-1 items-center gap-3 rounded-[16px] bg-[var(--imc-surface)] px-4 text-left"
                style={{ border: `1px solid ${LINE}` }}
              >
                <Search size={18} style={{ color: INK }} strokeWidth={2.25} />
                <span
                  className="text-[12px] font-bold"
                  style={{ color: MUTED }}
                >
                  Search people, startups, communities...
                </span>
              </button>
            </div>

            <SectionTitle
              title="Circle requests"
              action="View all"
              onAction={() => navigate("/requests")}
            />

            {loading ? (
              <RequestCardSkeleton />
            ) : topRequests.length > 0 ? (
              <section className="space-y-3">
                {topRequests.map((request) => (
                  <RequestCard
                    key={getId(request)}
                    request={request}
                    actionId={actionId}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </section>
            ) : (
              <EmptyCard
                title="No circle requests"
                text="New permission requests will appear here."
              />
            )}

            {invites.length > 0 && (
              <>
                <SectionTitle title="Circle invites" />

                <section className="space-y-3">
                  {invites.map((invite) => (
                    <CircleInviteCard
                      key={getId(invite)}
                      invite={invite}
                      loading={actionId === getId(invite) || actionId === String(getId(invite?.circle))}
                      onJoin={() => handleJoinInvite(invite)}
                      onDismiss={() => handleDismissInvite(invite)}
                    />
                  ))}
                </section>
              </>
            )}

            <div className="no-scrollbar -mx-3 mt-6 flex items-center gap-2 overflow-x-auto px-3 pb-1">
              {NETWORK_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className="imc-press shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-black active:scale-95"
                  style={
                    activeFilter === filter.value
                      ? { background: INDIGO, color: "#fff" }
                      : { background: "var(--imc-surface)", color: MUTED, border: `1px solid ${LINE}` }
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <SectionTitle
              icon={Sparkles}
              title="Recommended For You"
            />

            {loading ? (
              <PeopleCardSkeleton />
            ) : filteredPeople.length > 0 ? (
              <>
                <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                  {filteredPeople.slice(0, peopleVisibleCount).map((person) => {
                    const userId = String(getId(person));
                    const requested = requestedUserIds.includes(userId);

                    return (
                      <RecommendedPersonCard
                        key={userId}
                        person={person}
                        userId={userId}
                        requested={requested}
                        onView={() =>
                          person?.username
                            ? navigate(`/profile/${person.username}`)
                            : navigate(`/profile/user/${userId}`)
                        }
                      />
                    );
                  })}
                </section>

                {filteredPeople.length > peopleVisibleCount && (
                  <ViewMoreButton
                    onClick={() =>
                      setPeopleVisibleCount((count) =>
                        Math.min(count + PEOPLE_REVEAL_STEP, filteredPeople.length)
                      )
                    }
                  />
                )}
              </>
            ) : (
              <EmptyCard
                title="No suggestions yet"
                text="People who match your skills and interests will show up here."
              />
            )}

            {buildingInPublic.length > 0 && (
              <>
                <SectionTitle icon={Flame} title="People Building in Public" action="See all" onAction={() => navigate("/discover")} />

                <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                  {buildingInPublic.map((milestone) => (
                    <BuildingInPublicCard
                      key={getId(milestone)}
                      milestone={milestone}
                      isOwner={
                        Boolean(getId(me)) &&
                        String(getId(milestone?.creator)) === String(getId(me))
                      }
                      isCircleMember={myCircleUserIds.has(String(getId(milestone?.creator)))}
                      isRequested={requestedUserIds.includes(String(getId(milestone?.creator)))}
                      onOpen={() => navigate(`/journey/${getId(milestone?.journey)}`)}
                    />
                  ))}
                </section>
              </>
            )}

            <SectionTitle
              title="Circles you're in"
              action="New"
              onAction={() => navigate("/create-circle")}
            />

            {loading ? (
              <CircleRowSkeleton />
            ) : myCircles.length > 0 ? (
              <>
                <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                  {myCircles.slice(0, myCirclesVisibleCount).map((circle) => {
                    const circleId = String(getId(circle));

                    return (
                      <CircleCard
                        key={circleId}
                        circle={circle}
                        joined
                        loading={false}
                        onJoin={() => navigate(`/circles/${circleId}`)}
                      />
                    );
                  })}
                </section>

                {myCircles.length > myCirclesVisibleCount && (
                  <ViewMoreButton onClick={handleShowMoreMyCircles} />
                )}
              </>
            ) : (
              <EmptyCard
                title="No circles yet"
                text="Create or join a circle and it will appear here."
              />
            )}

            <SectionTitle icon={Sparkles} title="Recommended Circle" />

            {loading ? (
              <CircleRowSkeleton />
            ) : recommendedCircles.length > 0 ? (
              <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                {recommendedCircles.map((circle) => {
                  const circleId = String(getId(circle));
                  const joined = joinedCircleIds.includes(circleId);
                  const inviteOnly = circle?.visibility === "invite-only";
                  const requested = requestedCircleIds.includes(circleId);

                  return (
                    <CommunityGridCard
                      key={circleId}
                      circle={circle}
                      joined={joined}
                      inviteOnly={inviteOnly}
                      requested={requested}
                      loading={actionId === circleId}
                      horizontal
                      onJoin={() => {
                        if (joined) {
                          navigate(`/circles/${circleId}`);
                        } else if (inviteOnly) {
                          handleRequestToJoinCircle(circleId);
                        } else {
                          handleJoinCircle(circleId);
                        }
                      }}
                    />
                  );
                })}
              </section>
            ) : (
              <EmptyCard
                title="No circles to suggest yet"
                text="Circles will appear here as people start creating and joining them."
              />
            )}

            {showExploreCircles && (
              <>
                <SectionTitle icon={Users} title="Explore Circles" />

                <section className="grid grid-cols-2 gap-3">
                  {exploreCircles.slice(0, suggestedVisibleCount).map((circle) => {
                    const circleId = String(getId(circle));
                    const joined = joinedCircleIds.includes(circleId);
                    const inviteOnly = circle?.visibility === "invite-only";
                    const requested = requestedCircleIds.includes(circleId);

                    return (
                      <CommunityGridCard
                        key={circleId}
                        circle={circle}
                        joined={joined}
                        inviteOnly={inviteOnly}
                        requested={requested}
                        loading={actionId === circleId}
                        onJoin={() => {
                          if (joined) {
                            navigate(`/circles/${circleId}`);
                          } else if (inviteOnly) {
                            handleRequestToJoinCircle(circleId);
                          } else {
                            handleJoinCircle(circleId);
                          }
                        }}
                      />
                    );
                  })}
                </section>

                {(exploreCircles.length > suggestedVisibleCount || suggestedHasMore) && (
                  <ViewMoreButton
                    onClick={handleShowMoreSuggested}
                    loading={loadingMoreSuggested}
                  />
                )}
              </>
            )}

            {people.length > 0 && (
              <>
                <SectionTitle icon={Users} title="Explore People" action="View all" onAction={() => navigate("/requests")} />
                <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                  {people.map((person) => {
                    const userId = String(getId(person));
                    return (
                      <RecommendedPersonCard
                        key={`explore-${userId}`}
                        person={person}
                        userId={userId}
                        requested={requestedUserIds.includes(userId)}
                        onView={() => person?.username ? navigate(`/profile/${person.username}`) : navigate(`/profile/user/${userId}`)}
                      />
                    );
                  })}
                </section>
              </>
            )}

          </main>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand primitives
// ---------------------------------------------------------------------------

function BrandStyles() {
  return (
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .imc-ring {
        background: conic-gradient(from 210deg, ${MARIGOLD}, ${INDIGO} 55%, ${MARIGOLD} 100%);
      }
      .imc-press:active { transform: scale(0.97); }
    `}</style>
  );
}

function StatPill({ value, label }) {
  return (
    <div className="text-center">
      <h3 className="font-serif text-[16px] font-semibold" style={{ color: INK }}>
        {value}
      </h3>
      <p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em]" style={{ color: MUTED }}>
        {label}
      </p>
    </div>
  );
}

// Compact "circles + requests" summary shown top-right of the Network
// header — stacked requester avatars, incoming/sent counts, tap through to
// the full Requests page. Replaces the old Requests/Followers/Following
// stats strip with something that actually surfaces circle activity at a
// glance, matching the reference layout.
function CircleRequestsSummaryCard({ requests = [], sentCount = 0, onClick }) {
  const preview = requests.slice(0, 3);
  const overflow = Math.max(requests.length - preview.length, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="imc-press flex shrink-0 items-center gap-2 rounded-[16px] px-2.5 py-2 active:scale-[0.98]"
      style={{ background: "rgba(67,56,202,0.08)", border: "1px solid rgba(67,56,202,0.16)" }}
    >
      <div className="flex shrink-0 -space-x-2">
        {preview.length > 0 ? (
          preview.map((request) => (
            <div key={getId(request)} className="rounded-full ring-2" style={{ "--tw-ring-color": "var(--imc-surface)" }}>
              <Avatar user={request?.sender} size={28} />
            </div>
          ))
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full ring-2" style={{ background: "var(--imc-surface-2)", "--tw-ring-color": "var(--imc-surface)" }}>
            <Users size={13} style={{ color: MUTED }} />
          </div>
        )}
        {overflow > 0 && (
          <div
            className="grid h-7 w-7 place-items-center rounded-full text-[9px] font-black ring-2"
            style={{ background: INDIGO, color: "#fff", "--tw-ring-color": "var(--imc-surface)" }}
          >
            +{overflow}
          </div>
        )}
      </div>

      <div className="text-left leading-tight">
        <p className="text-[11px] font-black" style={{ color: INDIGO }}>
          {requests.length} Incoming
        </p>
        <p className="text-[10px] font-bold" style={{ color: MUTED }}>
          {sentCount} Sent
        </p>
      </div>

      <ChevronRight size={15} style={{ color: INDIGO }} />
    </button>
  );
}

function SectionTitle({ icon: Icon, title, badge, action, onAction }) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between px-1">
      <div className="flex items-baseline gap-2">
        {Icon && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: "rgba(67,56,202,0.1)", color: INDIGO }}>
            <Icon size={13} />
          </span>
        )}

        <h2
          className="font-serif text-[16px] font-semibold tracking-[-0.01em]"
          style={{ color: INK }}
        >
          {title}
        </h2>

        {badge && (
          <span
            className="rounded-full px-2 py-1 text-[9px] font-black"
            style={{ background: "var(--imc-border)", color: "var(--imc-text)" }}
          >
            {badge}
          </span>
        )}
      </div>

      {action && onAction && (
        <button
          onClick={onAction}
          className="text-[11px] font-black"
          style={{ color: INDIGO }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function RequestCard({ request, actionId, onAccept, onReject }) {
  const sender = request?.sender || {};
  const requestId = getId(request);
  const isLoading = actionId === requestId;

  return (
    <div
      className="min-h-[172px] rounded-[22px] bg-[var(--imc-surface)] p-5 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <div className="flex gap-3">
        <Avatar user={sender} size={56} ringed />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-black" style={{ color: INK }}>
            {getName(sender)}
          </h3>
          <p className="truncate text-[11px] font-bold" style={{ color: MUTED }}>
            {getHeadline(sender)}
          </p>
          <p
            className="mt-1 flex items-center gap-1 text-[10px] font-bold"
            style={{ color: MUTED }}
          >
            <MapPin size={11} />
            {getLocation(sender)}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              disabled={isLoading}
              onClick={() => onAccept(requestId)}
              className="imc-press flex h-11 items-center justify-center gap-1 rounded-[14px] text-[11px] font-black text-white disabled:opacity-60"
              style={{ background: INK }}
            >
              <Check size={14} />
              {isLoading ? "..." : "Accept"}
            </button>

            <button
              disabled={isLoading}
              onClick={() => onReject(requestId)}
              className="imc-press flex h-11 items-center justify-center gap-1 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black disabled:opacity-60"
              style={{ border: `1px solid ${LINE}`, color: MUTED }}
            >
              <X size={14} />
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CircleCard({ circle, joined, inviteOnly, requested, loading, onJoin }) {
  const cover = getImageUrl(circle?.coverImage);

  const label = joined
    ? "Open"
    : inviteOnly
    ? requested
      ? "Requested"
      : "Request"
    : "Join";

  const disabled = loading || (inviteOnly && !joined && requested);

  return (
    <div
      className="min-w-[210px] overflow-hidden rounded-[22px] bg-[var(--imc-surface)] shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <div
        className="relative h-[82px] w-full"
        style={{
          background: "linear-gradient(135deg, rgba(236,154,30,0.14), rgba(67,56,202,0.16))",
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
            <Sparkles size={24} style={{ color: MARIGOLD }} />
          </div>
        )}

        <span
          className="absolute bottom-2 right-2 rounded-full px-2 py-1 text-[9px] font-black"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--imc-text)" }}
        >
          {circle?.membersCount || 0} members
        </span>
      </div>

      <div className="p-4">
        <h3
          className="line-clamp-1 font-serif text-[15px] font-semibold"
          style={{ color: INK }}
        >
          {circle?.name || "Circle"}
        </h3>

        <p
          className="mt-1 line-clamp-2 min-h-[32px] text-[10px] font-semibold leading-4"
          style={{ color: MUTED }}
        >
          {circle?.description || circle?.tags?.join(" • ") || "Grow together"}
        </p>

        <div className="mt-3">
          <button
            disabled={disabled}
            onClick={onJoin}
            className="imc-press h-9 w-full rounded-[12px] border text-[10.5px] font-bold disabled:opacity-60"
            style={{
              background: "var(--imc-indigo-soft)",
              borderColor: "rgba(67,56,202,0.18)",
              color: "var(--imc-indigo-text)",
            }}
          >
            {loading ? "..." : label}
          </button>
        </div>
      </div>
    </div>
  );
}

function CircleInviteCard({ invite, loading, onJoin, onDismiss }) {
  const circle = invite?.circle || {};
  const inviter = invite?.invitedBy || {};
  const cover = getImageUrl(circle?.coverImage);

  return (
    <div
      className="overflow-hidden rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
      style={{ border: "1px solid rgba(18,20,28,0.14)" }}
    >
      <div className="flex gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[16px]"
          style={{
            background: "linear-gradient(135deg, rgba(236,154,30,0.14), rgba(67,56,202,0.16))",
          }}
        >
          {cover ? (
            <img
              src={cover}
              alt={circle?.name || "Circle"}
              className="h-full w-full object-cover"
            />
          ) : (
            <Users size={22} style={{ color: MARIGOLD }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-black" style={{ color: INK }}>
            {circle?.name || "Circle"}
          </h3>
          <p className="truncate text-[11px] font-bold" style={{ color: MUTED }}>
            Invited by {getName(inviter)}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold" style={{ color: MUTED }}>
            {circle?.membersCount || 0} members
            {circle?.description ? ` · ${circle.description}` : ""}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={loading}
              onClick={onJoin}
              className="imc-press flex h-9 items-center justify-center gap-1 rounded-[14px] text-[11px] font-black disabled:opacity-60"
              style={{ background: MARIGOLD, color: INK }}
            >
              {loading ? "..." : "Join"}
            </button>

            <button
              disabled={loading}
              onClick={onDismiss}
              className="imc-press h-9 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black disabled:opacity-60"
              style={{ border: `1px solid ${LINE}`, color: MUTED }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeopleCard({ person, requested, loading, onCircle, onView }) {
  return (
    <div
      className="rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <div className="flex gap-3">
        <Avatar user={person} size={56} ringed />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-black" style={{ color: INK }}>
            {getName(person)}
          </h3>

          <p className="truncate text-[11px] font-bold" style={{ color: MUTED }}>
            {getHeadline(person)}
          </p>

          <p
            className="mt-1 flex items-center gap-1 text-[10px] font-bold"
            style={{ color: MUTED }}
          >
            <MapPin size={11} />
            {getLocation(person)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={requested || loading}
              onClick={onCircle}
              aria-label={requested ? "Requested" : "Circle"}
              title={requested ? "Requested" : "Circle"}
              className="imc-press flex h-9 items-center justify-center gap-1 rounded-full text-[11px] font-black disabled:opacity-60"
              style={{
                background: requested ? "rgba(236,154,30,0.12)" : MARIGOLD,
                color: requested ? MUTED : INK,
              }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : requested ? (
                <Check size={14} />
              ) : (
                <UserPlus size={14} />
              )}
              {loading ? "..." : requested ? "Requested" : "Circle"}
            </button>

            <button
              onClick={onView}
              className="imc-press h-9 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black"
              style={{ border: `1px solid ${LINE}`, color: INK }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// "Recommended Circle" horizontal card — avatar, name, headline, location,
// then the shared CircleAction (+Circle / Requested / In Circle) so the
// state and API call are identical to every other surface in the app.
function RecommendedPersonCard({ person, userId, requested, onView }) {
  // A long tagline used to stretch this one card taller than its neighbors
  // in the row. Instead, clamp it to 2 lines by default and let the person
  // expand it in place with "View more" / "View less" — every card keeps
  // the same footprint until you deliberately open one.
  const interest = person?.primaryInterest || person?.field || person?.role || "Exploring";
  const mutuals = Array.isArray(person?.mutualCircles) ? person.mutualCircles : [];
  const mutualCount = Number(person?.mutualCirclesCount || mutuals.length || 0);

  return (
    <div
      className="flex min-h-[232px] w-[142px] min-w-[142px] shrink-0 flex-col rounded-[18px] bg-[var(--imc-surface)] p-3 text-center shadow-[0_8px_22px_rgba(18,20,28,0.045)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <button type="button" onClick={onView} className="flex flex-1 flex-col items-center active:scale-[0.99]">
        <span>
          <Avatar user={person} size={54} ringed />
        </span>

      <h3 className="mt-2 w-full truncate text-[12px] font-black" style={{ color: INK }}>
        {getName(person)}
      </h3>
      <p
        className="mt-0.5 w-full truncate text-[9px] font-semibold"
        style={{ color: MUTED }}
      >
        {interest}
      </p>
      {/* Always reserve this line's height, even when the tagline is short,
          so every card in the row lands at the exact same height — a
          conditionally-rendered toggle was what made cards uneven before. */}
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[9px] font-semibold" style={{ color: MUTED }}>
        <MapPin size={10} />
        {getLocation(person)}
      </p>

      <div className="mt-2 flex min-h-[30px] items-center justify-center">
        {mutualCount > 0 ? (
          <div className="flex items-center justify-center">
            <div className="flex -space-x-1.5">
              {mutuals.slice(0, 4).map((mutual) => (
                <div key={getId(mutual)} className="rounded-full border-2 border-[var(--imc-surface)]">
                  <Avatar user={mutual} size={20} />
                </div>
              ))}
            </div>
            <span className="ml-1.5 text-[8.5px] font-semibold leading-3" style={{ color: MUTED }}>
              {mutualCount} Mutual<br />Circles
            </span>
          </div>
        ) : (
          <span className="text-[8.5px] font-semibold" style={{ color: "var(--imc-text-faint)" }}>New to your Circle</span>
        )}
      </div>
      </button>

      <div className="mt-2" onClick={(event) => event.stopPropagation()}>
        <CircleAction userId={userId} isRequested={requested} className="w-full justify-center !min-h-9 !rounded-[10px] !py-2" />
      </div>
    </div>
  );
}

// "People Building in Public" — real recent Journey milestones, styled as
// the dark image cards from the reference (day badge, title, caption).
function BuildingInPublicCard({ milestone, onOpen, isOwner = false, isCircleMember = false, isRequested = false }) {
  const creator = milestone?.creator || {};
  const journey = milestone?.journey || {};
  const cover = getImageUrl(milestone?.images?.[0]) || getImageUrl(journey?.coverImage);
  const day = milestone?.day || milestone?.milestoneDay || 1;
  const caption = milestone?.content || milestone?.description || "";

  return (
    <div className="min-w-[168px] shrink-0 overflow-hidden rounded-[22px] shadow-[0_10px_26px_rgba(18,20,28,0.06)]">
      <button type="button" onClick={onOpen} className="relative block h-[200px] w-full text-left">
        {cover ? (
          <img src={cover} alt={journey?.title || "Journey"} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(67,56,202,0.5), rgba(18,20,28,0.85))" }} />
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(18,20,28,0.1) 0%, rgba(18,20,28,0.85) 100%)" }} />

        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2 py-1 text-[9px] font-black text-white"
          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
        >
          Day {day}
        </span>

        <div className="absolute inset-x-2.5 bottom-2.5">
          <p className="line-clamp-1 text-[12.5px] font-black text-white">{journey?.title || "Journey"}</p>
          <p className="mt-0.5 line-clamp-2 min-h-[26px] text-[10px] font-semibold leading-[13px] text-white/75">{caption || "Today's update"}</p>
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 bg-[var(--imc-surface)] p-2.5" style={{ border: `1px solid ${LINE}`, borderTop: "none" }}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar user={creator} size={20} />
          <span className="truncate text-[10.5px] font-bold" style={{ color: MUTED }}>
            {getName(creator)}
          </span>
        </div>

        <div className="shrink-0">
          {isOwner ? (
            <span
              className="inline-flex min-h-8 items-center rounded-full px-3 text-[10px] font-black"
              style={{ background: "var(--imc-indigo-soft)", color: "var(--imc-indigo-text)" }}
            >
              You
            </span>
          ) : (
            <CircleAction
              userId={String(getId(creator))}
              size="xs"
              isCircleMember={isCircleMember || Boolean(creator?.inCircle)}
              isRequested={isRequested}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// "Communities You May Like" — compact 2-column grid version of CircleCard.
function CommunityGridCard({ circle, joined, inviteOnly, requested, loading, onJoin, horizontal = false }) {
  const cover = getImageUrl(circle?.coverImage);
  const label = joined ? "Open" : inviteOnly ? (requested ? "Requested" : "Request") : "Join";
  const disabled = loading || (inviteOnly && !joined && requested);

  return (
    <div
      className={`overflow-hidden rounded-[20px] bg-[var(--imc-surface)] p-3 ${horizontal ? "w-[138px] min-w-[138px] shrink-0" : ""}`}
      style={{ border: `1px solid ${LINE}` }}
    >
      <div
        className="grid h-11 w-11 place-items-center overflow-hidden rounded-[14px]"
        style={{ background: "linear-gradient(135deg, rgba(236,154,30,0.14), rgba(67,56,202,0.16))" }}
      >
        {cover ? (
          <img src={cover} alt={circle?.name || "Circle"} className="h-full w-full object-cover" />
        ) : (
          <Sparkles size={18} style={{ color: MARIGOLD }} />
        )}
      </div>

      <h3 className="mt-2 line-clamp-1 text-[12.5px] font-black" style={{ color: INK }}>
        {circle?.name || "Circle"}
      </h3>
      <p className="mt-0.5 text-[9.5px] font-bold" style={{ color: MUTED }}>
        {(circle?.membersCount || 0).toLocaleString()} members
      </p>
      <p className="mt-0.5 line-clamp-1 text-[9.5px] font-semibold" style={{ color: MUTED }}>
        {circle?.description || (circle?.tags || []).slice(0, 2).join(" • ") || "Grow together"}
      </p>

      <button
        disabled={disabled}
        onClick={onJoin}
        className="imc-press mt-2.5 h-8 w-full rounded-[12px] text-[10.5px] font-black disabled:opacity-60"
        style={{
          background: label === "Requested" ? "rgba(236,154,30,0.12)" : INDIGO,
          color: label === "Requested" ? MUTED : "#fff",
        }}
      >
        {loading ? "..." : label}
      </button>
    </div>
  );
}

function ViewMoreButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="imc-press mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black disabled:opacity-60"
      style={{ border: `1px solid ${LINE}`, color: INDIGO }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {loading ? "Loading..." : "View more"}
    </button>
  );
}

function Avatar({ user, size = 56, ringed = false }) {
  const dim = `${size}px`;
  const inner = <DefaultAvatar user={user} size={ringed ? size - 8 : size} className="h-full w-full" />;

  if (!ringed) {
    return inner;
  }

  return (
    <div
      className="imc-ring shrink-0 rounded-full p-[2px]"
      style={{ width: dim, height: dim }}
    >
      <div className="h-full w-full rounded-full bg-[var(--imc-surface)] p-[2px]">
        {inner}
      </div>
    </div>
  );
}

function EmptyCard({ title, text }) {
  return (
    <div
      className="rounded-[22px] bg-[var(--imc-surface)] p-5 text-center shadow-[0_10px_26px_rgba(18,20,28,0.03)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <p className="text-[14px] font-black" style={{ color: INK }}>
        {title}
      </p>
      <p className="mt-1 text-[11px] font-bold" style={{ color: MUTED }}>
        {text}
      </p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      className="grid min-h-[110px] place-items-center rounded-[22px] bg-[var(--imc-surface)] shadow-[0_10px_26px_rgba(18,20,28,0.03)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: MARIGOLD }} />
    </div>
  );
}

// Shape-matched skeleton placeholders shown while the very first
// loadNetwork() call is still in flight — replaces the old generic spinner
// so each section keeps its real layout instead of collapsing to one blob.
function RequestCardSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
          style={{ border: `1px solid ${LINE}` }}
        >
          <div className="flex gap-3">
            <div className="h-14 w-14 shrink-0 rounded-full bg-[var(--imc-surface-2)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded-full bg-[var(--imc-surface-2)]" />
              <div className="h-2.5 w-1/3 rounded-full bg-[var(--imc-surface-2)]" />
              <div className="mt-3 flex gap-2">
                <div className="h-9 flex-1 rounded-[14px] bg-[var(--imc-surface-2)]" />
                <div className="h-9 flex-1 rounded-[14px] bg-[var(--imc-surface-2)]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CircleRowSkeleton() {
  return (
    <div className="no-scrollbar -mx-3 flex animate-pulse gap-3 overflow-x-auto px-3 pb-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[210px] overflow-hidden rounded-[22px] bg-[var(--imc-surface)] shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
          style={{ border: `1px solid ${LINE}` }}
        >
          <div className="h-[82px] w-full bg-[var(--imc-surface-2)]" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-2/3 rounded-full bg-[var(--imc-surface-2)]" />
            <div className="h-2.5 w-full rounded-full bg-[var(--imc-surface-2)]" />
            <div className="mt-2 h-10 w-full rounded-[14px] bg-[var(--imc-surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PeopleCardSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
          style={{ border: `1px solid ${LINE}` }}
        >
          <div className="flex gap-3">
            <div className="h-14 w-14 shrink-0 rounded-full bg-[var(--imc-surface-2)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded-full bg-[var(--imc-surface-2)]" />
              <div className="h-2.5 w-1/3 rounded-full bg-[var(--imc-surface-2)]" />
              <div className="h-2.5 w-1/4 rounded-full bg-[var(--imc-surface-2)]" />
              <div className="mt-3 h-9 w-24 rounded-full bg-[var(--imc-surface-2)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
