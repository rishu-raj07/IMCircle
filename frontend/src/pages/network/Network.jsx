import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Contact,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  PlusCircle,
  Search,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";

import {
  getReceivedCircleRequests,
  acceptCircleRequest,
  rejectCircleRequest,
  sendCircleRequest,
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
import { getUserSuggestions, matchContacts } from "../../api/userApi";
import { getMyProfile } from "../../api/profileApi";

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
const PEOPLE_REVEAL_INITIAL = 5;
const PEOPLE_REVEAL_STEP = 10;
const PERMISSION_STATUS_KEY = "imcircle_permission_status";
const CONTACT_MATCHES_KEY = "imcircle_contact_matches_cache";
const INVITE_TEXT =
  "Join me on IMCircle, the social network for people who grow. Download/open IMCircle and connect with me.";

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getInitial(user) {
  return getName(user).charAt(0).toUpperCase();
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

function normalizeContactPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
}

function getContactName(contact) {
  if (Array.isArray(contact?.name)) return contact.name.filter(Boolean).join(" ");
  return contact?.name || contact?.displayName || "Contact";
}

function getContactPhones(contact) {
  const phones = Array.isArray(contact?.tel) ? contact.tel : [];
  return phones.map(normalizeContactPhone).filter(Boolean);
}

function getInviteLinks() {
  const text = encodeURIComponent(INVITE_TEXT);
  return {
    whatsapp: `https://wa.me/?text=${text}`,
    sms: `sms:?&body=${text}`,
  };
}

function getCachedContactMatches() {
  try {
    const cached = JSON.parse(localStorage.getItem(CONTACT_MATCHES_KEY) || "[]");
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

function getCachedPermissionStatus() {
  try {
    return localStorage.getItem(PERMISSION_STATUS_KEY) || "idle";
  } catch {
    return "idle";
  }
}

function setCachedContactState(status, matches = []) {
  try {
    localStorage.setItem(PERMISSION_STATUS_KEY, status);
    localStorage.setItem(CONTACT_MATCHES_KEY, JSON.stringify(matches));
    window.dispatchEvent(new Event("imcircle-permissions-updated"));
  } catch {
    // Local cache is only a convenience for this page.
  }
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

  const [myCirclesVisibleCount, setMyCirclesVisibleCount] = useState(REVEAL_INITIAL);
  const [suggestedVisibleCount, setSuggestedVisibleCount] = useState(REVEAL_INITIAL);
  const [suggestedPage, setSuggestedPage] = useState(0);
  const [suggestedHasMore, setSuggestedHasMore] = useState(true);
  const [loadingMoreSuggested, setLoadingMoreSuggested] = useState(false);
  const [peopleVisibleCount, setPeopleVisibleCount] = useState(PEOPLE_REVEAL_INITIAL);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [permissionStatus, setPermissionStatus] = useState(() => getCachedPermissionStatus());
  const [permissionMessage, setPermissionMessage] = useState("");
  const [contactMatches, setContactMatches] = useState(() => getCachedContactMatches());
  const [contactSyncAttempted, setContactSyncAttempted] = useState(
    () => getCachedPermissionStatus() === "allowed"
  );
  const [contactsSupported, setContactsSupported] = useState(() =>
    typeof navigator !== "undefined" && Boolean(navigator.contacts?.select)
  );

  const topRequests = useMemo(() => requests.slice(0, 3), [requests]);

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
      ] = await Promise.allSettled([
        getMyProfile(),
        getReceivedCircleRequests(),
        getTrendingCircles(),
        getUserSuggestions(),
        getSentCircleRequests(),
        getMyCircles(),
        getMyCircleInvites(),
        getMySentCircleJoinRequests(),
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
    } catch (error) {
      // best-effort — non-critical
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  useEffect(() => {
    const syncCachedContacts = () => {
      const cachedStatus = getCachedPermissionStatus();
      const cachedMatches = getCachedContactMatches();
      setPermissionStatus(cachedStatus);
      setContactMatches(cachedMatches);
      setContactSyncAttempted(cachedStatus === "allowed");
    };

    window.addEventListener("imcircle-permissions-updated", syncCachedContacts);
    window.addEventListener("storage", syncCachedContacts);

    return () => {
      window.removeEventListener("imcircle-permissions-updated", syncCachedContacts);
      window.removeEventListener("storage", syncCachedContacts);
    };
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

  const handleCircleRequest = async (userId) => {
    const id = String(userId || "");
    if (!id || actionId || requestedUserIds.includes(id)) return;

    setRequestedUserIds((prev) => [...new Set([...prev, id])]);

    try {
      setActionId(id);
      await sendCircleRequest(id);
    } catch {
      setRequestedUserIds((prev) => prev.filter((item) => item !== id));
    } finally {
      setActionId("");
    }
  };

  const requestMediaAndContacts = async () => {
    if (permissionStatus === "loading") return;

    setPermissionStatus("loading");
    setPermissionMessage("");
    setContactSyncAttempted(true);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Contacts can still be used even if media/microphone is denied.
        }
      }

      if (!navigator.contacts?.select) {
        setContactsSupported(false);
        setPermissionStatus("denied");
        setCachedContactState("denied", []);
        setPermissionMessage("Contact permission is not available on this browser. Invite friends instead.");
        return;
      }

      const contacts = await navigator.contacts.select(["name", "tel"], {
        multiple: true,
      });

      const cleanContacts = (contacts || [])
        .map((contact) => ({
          name: getContactName(contact),
          phones: getContactPhones(contact),
        }))
        .filter((contact) => contact.phones.length > 0);

      if (!cleanContacts.length) {
        setPermissionStatus("allowed");
        setContactMatches([]);
        setCachedContactState("allowed", []);
        setPermissionMessage("No phone numbers were selected from contacts.");
        return;
      }

      const res = await matchContacts(cleanContacts);
      const matches = res?.matches || [];
      setContactMatches(matches);
      setPermissionStatus("allowed");
      setCachedContactState("allowed", matches);
      setPermissionMessage(
        matches.length
          ? "These contacts are already on IMCircle."
          : "None of the selected contacts are on IMCircle yet. Invite them below."
      );
    } catch (error) {
      setPermissionStatus("denied");
      setCachedContactState("denied", []);
      setPermissionMessage("Permission was not allowed. You can still invite people to IMCircle.");
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
          <div className="px-3 pt-4">
            <h1
              className="font-serif text-[22px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--imc-text)" }}
            >
              Network
            </h1>
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
                  Search people, work, skills
                </span>
              </button>

              <button
                onClick={() => navigate("/messages")}
                className="grid h-[50px] w-[50px] place-items-center rounded-[16px] bg-[var(--imc-surface)] active:scale-95"
                style={{ border: `1px solid rgba(67,56,202,0.25)`, color: INDIGO }}
              >
                <MessageCircle size={19} strokeWidth={2.25} />
              </button>
            </div>

            {/* Slim stats + create strip — replaces the old black hero block */}
            <section
              className="mt-4 flex items-center gap-3 rounded-[20px] bg-[var(--imc-surface)] p-3"
              style={{ border: `1px solid ${LINE}` }}
            >
              <div className="flex flex-1 items-center justify-between px-1">
                <StatPill value={requests.length} label="Requests" />
                <StatPill
                  value={
                    !me
                      ? "—"
                      : Array.isArray(me?.followers)
                      ? me.followers.length
                      : Math.max(Number(me?.stats?.followersCount) || 0, 0)
                  }
                  label="Followers"
                />
                <StatPill
                  value={
                    !me
                      ? "—"
                      : Array.isArray(me?.following)
                      ? me.following.length
                      : Math.max(Number(me?.stats?.followingCount) || 0, 0)
                  }
                  label="Following"
                />
              </div>

              <button
                onClick={() => navigate("/create-circle")}
                className="imc-press flex h-10 shrink-0 items-center gap-1.5 rounded-[14px] px-3 text-[11px] font-black active:scale-[0.98]"
                style={{ background: MARIGOLD, color: INK }}
              >
                <PlusCircle size={15} />
                New circle
              </button>
            </section>

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

            <SectionTitle
              title="Suggested for you"
              badge={
                trendingPersonalized && trendingInterest
                  ? `For ${trendingInterest}`
                  : undefined
              }
            />

            {loading ? (
              <CircleRowSkeleton />
            ) : circles.length > 0 ? (
              <>
                <section className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
                  {circles.slice(0, suggestedVisibleCount).map((circle) => {
                    const circleId = String(getId(circle));
                    const joined = joinedCircleIds.includes(circleId);
                    const inviteOnly = circle?.visibility === "invite-only";
                    const requested = requestedCircleIds.includes(circleId);

                    return (
                      <CircleCard
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

                {(circles.length > suggestedVisibleCount || suggestedHasMore) && (
                  <ViewMoreButton
                    onClick={handleShowMoreSuggested}
                    loading={loadingMoreSuggested}
                  />
                )}
              </>
            ) : (
              <EmptyCard
                title="No circles to suggest yet"
                text="Circles will appear here as people start creating and joining them."
              />
            )}

            <SectionTitle
              title="Suggested people"
              action="Refresh"
              onAction={loadNetwork}
            />

            {loading ? (
              <PeopleCardSkeleton />
            ) : people.length > 0 ? (
              <>
                <section className="space-y-3">
                  {people.slice(0, peopleVisibleCount).map((person) => {
                    const userId = String(getId(person));
                    const requested = requestedUserIds.includes(userId);

                    return (
                      <PeopleCard
                        key={userId}
                        person={person}
                        requested={requested}
                        loading={actionId === userId}
                        onCircle={() => handleCircleRequest(userId)}
                        onView={() =>
                          person?.username
                            ? navigate(`/profile/${person.username}`)
                            : navigate(`/profile/user/${userId}`)
                        }
                      />
                    );
                  })}
                </section>

                {people.length > peopleVisibleCount && (
                  <ViewMoreButton
                    onClick={() =>
                      setPeopleVisibleCount((count) =>
                        Math.min(count + PEOPLE_REVEAL_STEP, people.length)
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

            <ContactsSection
              status={permissionStatus}
              message={permissionMessage}
              matches={contactMatches}
              syncAttempted={contactSyncAttempted}
              contactsSupported={contactsSupported}
              requestedUserIds={requestedUserIds}
              actionId={actionId}
              onRequest={requestMediaAndContacts}
              onCircle={handleCircleRequest}
              onView={(person) => {
                const userId = String(getId(person));
                person?.username
                  ? navigate(`/profile/${person.username}`)
                  : navigate(`/profile/user/${userId}`);
              }}
            />
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

function SectionTitle({ title, badge, action, onAction }) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between px-1">
      <div className="flex items-baseline gap-2">
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

function ContactsSection({
  status,
  message,
  matches,
  contactsSupported,
  syncAttempted,
  requestedUserIds,
  actionId,
  onRequest,
  onCircle,
  onView,
}) {
  const showInvite = syncAttempted && status !== "loading" && matches.length === 0;

  return (
    <>
      <SectionTitle title="Contacts" />
      {matches.length > 0 && (
        <>
          <section className="space-y-3">
          {matches.map((match) => {
            const person = match?.user || {};
            const userId = String(getId(person));
            const requested = requestedUserIds.includes(userId);

            return (
              <div key={`${userId}-${match?.contactName || ""}`}>
                <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                  From contacts: {match?.contactName || getName(person)}
                </p>
                <PeopleCard
                  person={person}
                  requested={requested}
                  loading={actionId === userId}
                  onCircle={() => onCircle(userId)}
                  onView={() => onView(person)}
                />
              </div>
            );
          })}
          </section>

          <button
            type="button"
            onClick={onRequest}
            disabled={status === "loading"}
            className="imc-press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[14px] text-[11px] font-black disabled:opacity-60"
            style={{ background: "var(--imc-surface-2)", color: INK, border: `1px solid ${LINE}` }}
          >
            {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Contact size={14} />}
            {status === "loading" ? "Syncing contacts..." : "Sync contacts again"}
          </button>
        </>
      )}

      {matches.length === 0 && (
        <section
          className="rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
          style={{ border: `1px solid ${LINE}` }}
        >
          <div className="flex gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px]"
              style={{ background: "rgba(67,56,202,0.1)", color: INDIGO }}
            >
              <Contact size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-black" style={{ color: INK }}>
                Find friends from contacts
              </h2>
              <p className="mt-1 text-[11px] font-bold leading-4" style={{ color: MUTED }}>
                Sync contacts to show people you already know on IMCircle.
              </p>

              {message && syncAttempted && (
                <p className="mt-3 text-[11px] font-bold leading-4" style={{ color: MUTED }}>
                  {message}
                </p>
              )}

              {!contactsSupported && syncAttempted && (
                <p className="mt-2 text-[10px] font-bold leading-4" style={{ color: MUTED }}>
                  Contact picker is not available on this browser.
                </p>
              )}

              <button
                type="button"
                onClick={onRequest}
                disabled={status === "loading"}
                className="imc-press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[14px] text-[11px] font-black disabled:opacity-60"
                style={{ background: MARIGOLD, color: INK }}
              >
                {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Contact size={14} />}
                {status === "loading" ? "Syncing contacts..." : "Sync contacts"}
              </button>
            </div>
          </div>

          {showInvite && <ContactInviteActions />}
        </section>
      )}
    </>
  );
}

function ContactInviteActions() {
  const inviteLinks = getInviteLinks();

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <a
        href={inviteLinks.whatsapp}
        target="_blank"
        rel="noreferrer"
        className="imc-press flex h-10 items-center justify-center gap-2 rounded-[14px] text-[11px] font-black text-white"
        style={{ background: "#25D366" }}
      >
        <MessageCircle size={14} />
        WhatsApp
      </a>

      <a
        href={inviteLinks.sms}
        className="imc-press flex h-10 items-center justify-center gap-2 rounded-[14px] text-[11px] font-black"
        style={{ background: "var(--imc-surface-2)", color: INK, border: `1px solid ${LINE}` }}
      >
        <Phone size={14} />
        SMS
      </a>
    </div>
  );
}

function RequestCard({ request, actionId, onAccept, onReject }) {
  const sender = request?.sender || {};
  const requestId = getId(request);
  const isLoading = actionId === requestId;

  return (
    <div
      className="rounded-[22px] bg-[var(--imc-surface)] p-4 shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
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

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={isLoading}
              onClick={() => onAccept(requestId)}
              className="imc-press flex h-9 items-center justify-center gap-1 rounded-[14px] text-[11px] font-black text-white disabled:opacity-60"
              style={{ background: INK }}
            >
              <Check size={14} />
              {isLoading ? "..." : "Accept"}
            </button>

            <button
              disabled={isLoading}
              onClick={() => onReject(requestId)}
              className="imc-press flex h-9 items-center justify-center gap-1 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black disabled:opacity-60"
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
            className="imc-press h-10 w-full rounded-[14px] text-[11px] font-black disabled:opacity-60"
            style={{
              background: label === "Requested" ? "rgba(236,154,30,0.12)" : MARIGOLD,
              color: label === "Requested" ? MUTED : INK,
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
  const avatar = getUserAvatar(user);
  const dim = `${size}px`;

  const inner = (
    <div
      className="grid h-full w-full place-items-center overflow-hidden rounded-full font-serif font-semibold"
      style={{ background: INK, color: MARIGOLD, fontSize: size * 0.32 }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={getName(user)}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        getInitial(user) || <User size={size * 0.4} />
      )}
    </div>
  );

  if (!ringed) {
    return (
      <div className="shrink-0 rounded-full" style={{ width: dim, height: dim }}>
        {inner}
      </div>
    );
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
