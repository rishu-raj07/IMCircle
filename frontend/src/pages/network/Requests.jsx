import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileAvatar from "../../components/common/Avatar";
import { getCommunityCoverIcon } from "../../utils/media";

import {
  acceptCircleRequest,
  getReceivedCircleRequests,
  getSentCircleRequests,
  rejectCircleRequest,
} from "../../api/circleRequestApi";
import {
  getBrowseCircles,
  getMyCircles,
  getMySentCircleJoinRequests,
  joinCircle,
  requestToJoinCircle,
} from "../../api/circleApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const LINE = "var(--imc-border)";
const INK = "var(--imc-text)";
const MUTED = "var(--imc-text-muted)";
const INDIGO = "#4338CA";
const MARIGOLD = "#EC9A1E";

const CIRCLE_FILTERS = [
  { value: "all", label: "All", keywords: [] },
  { value: "exploring", label: "Exploring", keywords: ["explore", "exploring", "discovery", "general"] },
  { value: "students", label: "Students", keywords: ["student", "college", "campus", "learning", "education"] },
  { value: "startups", label: "Startups", keywords: ["startup", "founder", "entrepreneur", "business"] },
  { value: "creators", label: "Creators", keywords: ["creator", "content", "design", "art", "media"] },
  { value: "developers", label: "Developers", keywords: ["developer", "coding", "programming", "tech", "software"] },
];

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

// Never falls back to a bare "India" — the backend defaults location.country
// to "India" even for users who never entered a location, so returning that
// here would show every location-less person as being "in India" (Issue 3:
// never display a location that wasn't actually provided).
function getLocation(user) {
  if (typeof user?.location === "string") return user.location;
  return [user?.location?.city, user?.location?.state].filter(Boolean).join(", ") || user?.city || "";
}

function getInterest(user) {
  const preferences = user?.preferences?.interests || user?.preferences?.topics;
  const interests = user?.interests || preferences;
  return (
    user?.primaryInterest ||
    user?.field ||
    user?.role ||
    (Array.isArray(interests) ? interests[0] : interests) ||
    user?.skills?.[0]?.name ||
    user?.skills?.[0] ||
    "IMCircle member"
  );
}

function getMutualCircleCount(user) {
  return Number(
    user?.mutualCircleCount ??
      user?.mutualCirclesCount ??
      user?.mutualConnectionsCount ??
      0
  );
}

function getImageUrl(image) {
  if (!image) return "";
  const url =
    image?.secure_url ||
    image?.url ||
    image?.path ||
    image?.avatar?.secure_url ||
    image?.avatar?.url ||
    image?.profileImage?.secure_url ||
    image?.profileImage?.url ||
    image?.profileImage ||
    image?.picture ||
    image;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function normalizeList(response, key) {
  const list = response?.[key] || response?.data?.[key] || response?.data || response;
  return Array.isArray(list) ? list : [];
}

export default function Requests() {
  const navigate = useNavigate();
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [circles, setCircles] = useState([]);
  const [joinedCircleIds, setJoinedCircleIds] = useState([]);
  const [requestedCircleIds, setRequestedCircleIds] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const [receivedRes, sentRes, circlesRes, myCirclesRes, joinsRes] = await Promise.allSettled([
        getReceivedCircleRequests(),
        getSentCircleRequests(),
        getBrowseCircles({ page: 1, limit: 50 }),
        getMyCircles(),
        getMySentCircleJoinRequests(),
      ]);

      if (!active) return;

      if (receivedRes.status === "fulfilled") setReceived(normalizeList(receivedRes.value, "requests"));
      if (sentRes.status === "fulfilled") setSent(normalizeList(sentRes.value, "requests"));
      if (circlesRes.status === "fulfilled") {
        setCircles(
          normalizeList(circlesRes.value, "circles").filter((circle) => circle?.visibility !== "private")
        );
        setRequestedCircleIds(
          (circlesRes.value?.requestedCircleIds || circlesRes.value?.data?.requestedCircleIds || []).map(String)
        );
      }
      if (myCirclesRes.status === "fulfilled") {
        setJoinedCircleIds(
          normalizeList(myCirclesRes.value, "circles")
            .map((item) => String(getId(item?.circle || item)))
            .filter(Boolean)
        );
      }
      if (joinsRes.status === "fulfilled") {
        const ids = joinsRes.value?.circleIds || joinsRes.value?.data?.circleIds || [];
        setRequestedCircleIds((previous) => [...new Set([...previous, ...ids.map(String)])]);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const query = search.trim().toLowerCase();

  const filteredSent = useMemo(
    () => sent.filter((request) => {
      const receiver = request?.receiver || {};
      return !query || `${getName(receiver)} ${receiver?.headline || ""} ${getLocation(receiver)}`.toLowerCase().includes(query);
    }),
    [sent, query]
  );

  const filteredReceived = useMemo(
    () => received.filter((request) => {
      const sender = request?.sender || {};
      return !query || `${getName(sender)} ${sender?.headline || ""} ${getLocation(sender)}`.toLowerCase().includes(query);
    }),
    [received, query]
  );

  const filteredCircles = useMemo(() => {
    const filter = CIRCLE_FILTERS.find((item) => item.value === activeFilter);
    return circles.filter((circle) => {
      const haystack = `${circle?.name || ""} ${circle?.description || ""} ${(circle?.tags || []).join(" ")}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesFilter = activeFilter === "all" || filter?.keywords?.some((keyword) => haystack.includes(keyword));
      return matchesSearch && matchesFilter;
    });
  }, [circles, activeFilter, query]);

  const removeReceived = (requestId) => {
    setReceived((current) => current.filter((request) => String(getId(request)) !== String(requestId)));
  };

  const handleReceivedAction = async (requestId, action) => {
    if (!requestId || actionId) return;
    try {
      setActionId(requestId);
      if (action === "accept") await acceptCircleRequest(requestId);
      else await rejectCircleRequest(requestId);
      removeReceived(requestId);
    } finally {
      setActionId("");
    }
  };

  const handleCircleAction = async (circle) => {
    const circleId = String(getId(circle));
    if (!circleId || actionId) return;
    if (joinedCircleIds.includes(circleId)) {
      navigate(`/circles/${circleId}`);
      return;
    }

    const inviteOnly = circle?.visibility === "invite-only";
    if (inviteOnly && requestedCircleIds.includes(circleId)) return;

    try {
      setActionId(circleId);
      if (inviteOnly) {
        setRequestedCircleIds((current) => [...new Set([...current, circleId])]);
        await requestToJoinCircle(circleId);
      } else {
        await joinCircle(circleId);
        setJoinedCircleIds((current) => [...new Set([...current, circleId])]);
      }
    } catch (error) {
      if (inviteOnly) setRequestedCircleIds((current) => current.filter((id) => id !== circleId));
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] pb-[max(28px,env(safe-area-inset-bottom))]">
        <header className="border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-4 pb-3 pt-[14px] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--imc-surface)] active:scale-95"
              style={{ border: `1px solid ${LINE}` }}
            >
              <ArrowLeft size={19} style={{ color: INK }} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[18px] font-black" style={{ color: INK }}>Requests & Circles</h1>
              <p className="text-[10.5px] font-semibold" style={{ color: MUTED }}>Manage requests and find your next circle</p>
            </div>
          </div>

          <label className="mt-3 flex h-11 items-center gap-2.5 rounded-[15px] bg-[var(--imc-surface)] px-3.5" style={{ border: `1px solid ${LINE}` }}>
            <Search size={17} style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people or circles"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </label>
        </header>

        <main className="space-y-7 px-4 py-5">
          <PageSection title="Requests you sent" count={filteredSent.length}>
            {loading ? <LoadingRow /> : filteredSent.length ? (
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {filteredSent.map((request) => (
                  <SentRequestCard
                    key={getId(request)}
                    user={request?.receiver}
                    onOpen={() => navigate(request?.receiver?.username ? `/profile/${request.receiver.username}` : `/profile/user/${request?.receiverId || getId(request?.receiver)}`)}
                  />
                ))}
              </div>
            ) : <EmptyLine text="You have no pending sent requests." />}
          </PageSection>

          <PageSection title="New circle requests" count={filteredReceived.length}>
            {loading ? <LoadingRow /> : filteredReceived.length ? (
              <div className="space-y-2.5">
                {filteredReceived.map((request) => (
                  <ReceivedRequestCard
                    key={getId(request)}
                    user={request?.sender}
                    loading={actionId === String(getId(request))}
                    onOpen={() => navigate(request?.sender?.username ? `/profile/${request.sender.username}` : `/profile/user/${getId(request?.sender)}`)}
                    onAccept={() => handleReceivedAction(String(getId(request)), "accept")}
                    onIgnore={() => handleReceivedAction(String(getId(request)), "ignore")}
                  />
                ))}
              </div>
            ) : <EmptyLine text="New circle requests will appear here." />}
          </PageSection>

          <PageSection title="Explore new circles" count={filteredCircles.length}>
            <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {CIRCLE_FILTERS.map((filter) => {
                const active = activeFilter === filter.value;
                return (
                  <button
                    type="button"
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className="h-9 shrink-0 rounded-full px-4 text-[11px] font-black active:scale-95"
                    style={{
                      background: active ? INDIGO : "var(--imc-surface)",
                      border: `1px solid ${active ? INDIGO : LINE}`,
                      color: active ? "white" : MUTED,
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3"><CircleSkeleton /><CircleSkeleton /></div>
            ) : filteredCircles.length ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredCircles.map((circle) => {
                  const id = String(getId(circle));
                  return (
                    <CircleCard
                      key={id}
                      circle={circle}
                      joined={joinedCircleIds.includes(id)}
                      requested={requestedCircleIds.includes(id)}
                      loading={actionId === id}
                      onOpen={() => navigate(`/circles/${id}`)}
                      onAction={() => handleCircleAction(circle)}
                    />
                  );
                })}
              </div>
            ) : <EmptyLine text="No circles match this filter yet. Try another category." />}
          </PageSection>
        </main>
      </div>
    </div>
  );
}

function PageSection({ title, count, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-black" style={{ color: INK }}>{title}</h2>
        <span className="grid min-w-5 place-items-center rounded-full bg-[var(--imc-indigo-soft)] px-1.5 py-0.5 text-[9px] font-black text-[var(--imc-indigo-text)]">{count}</span>
      </div>
      {children}
    </section>
  );
}

function SentRequestCard({ user, onOpen }) {
  const mutualCount = getMutualCircleCount(user);
  return (
    <button type="button" onClick={onOpen} aria-label={`Open ${getName(user)} profile`} className="w-[176px] min-w-[176px] rounded-[20px] bg-[var(--imc-surface)] p-3.5 text-left shadow-sm active:scale-[0.98]" style={{ border: `1px solid ${LINE}` }}>
      <ProfileAvatar user={user} size={54} className="border-2 border-[var(--imc-indigo-soft)]" />
      <p className="mt-2.5 truncate text-[12.5px] font-black" style={{ color: INK }}>{getName(user)}</p>
      <p className="mt-1 flex items-center gap-1 truncate text-[9.5px] font-semibold" style={{ color: MUTED }}><Briefcase size={10} />{getInterest(user)}</p>
      <p className="mt-1 flex items-center gap-1 truncate text-[9px] font-semibold text-[var(--imc-text-faint)]"><MapPin size={10} />{getLocation(user)}</p>
      <p className="mt-1 flex items-center gap-1 truncate text-[9px] font-semibold text-[var(--imc-text-faint)]"><Users size={10} />{mutualCount} mutual {mutualCount === 1 ? "circle" : "circles"}</p>
      <span className="mt-3 inline-flex h-7 items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-2.5 text-[9px] font-black" style={{ color: MUTED }}>
        <Clock3 size={11} /> Pending
      </span>
    </button>
  );
}

function ReceivedRequestCard({ user, loading, onOpen, onAccept, onIgnore }) {
  const mutualCount = getMutualCircleCount(user);
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }} className="cursor-pointer rounded-[18px] bg-[var(--imc-surface)] p-3.5 active:scale-[0.99]" style={{ border: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-3">
        <ProfileAvatar user={user} size={50} className="border-2 border-[var(--imc-indigo-soft)]" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12.5px] font-black" style={{ color: INK }}>{getName(user)}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[9.5px] font-semibold" style={{ color: MUTED }}><Briefcase size={10} />{getInterest(user)}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-semibold text-[var(--imc-text-faint)]"><MapPin size={10} />{getLocation(user)}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-semibold text-[var(--imc-text-faint)]"><Users size={10} />{mutualCount} mutual {mutualCount === 1 ? "circle" : "circles"}</p>
        </div>
        <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); onIgnore(); }} aria-label="Ignore request" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] disabled:opacity-50"><X size={15} style={{ color: MUTED }} /></button>
        <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); onAccept(); }} className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--imc-indigo-text)] bg-[var(--imc-action-soft)] px-3 text-[10px] font-black text-[var(--imc-indigo-text)] disabled:opacity-50">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
        </button>
      </div>
    </div>
  );
}

function CircleCard({ circle, joined, requested, loading, onOpen, onAction }) {
  const cover = getImageUrl(circle?.coverImage);
  const inviteOnly = circle?.visibility === "invite-only";
  const label = joined ? "Open" : requested ? "Requested" : inviteOnly ? "Request" : "Join";
  return (
    <article className="overflow-hidden rounded-[19px] bg-[var(--imc-surface)]" style={{ border: `1px solid ${LINE}` }}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-[82px] bg-[linear-gradient(135deg,rgba(67,56,202,0.14),rgba(236,154,30,0.18))]">
          {cover ? <img src={cover} alt={circle?.name || "Circle"} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><img src={getCommunityCoverIcon()} alt="" className="h-8 w-8 rounded-full object-cover" /></div>}
          {inviteOnly && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[8px] font-black" style={{ color: INDIGO }}>Invite only</span>}
        </div>
        <div className="px-3 pt-2.5">
          <h3 className="truncate text-[12px] font-black" style={{ color: INK }}>{circle?.name || "Circle"}</h3>
          <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold" style={{ color: MUTED }}><Users size={10} />{circle?.membersCount || 0} members</p>
        </div>
      </button>
      <div className="p-3 pt-2.5">
        <button type="button" disabled={loading || requested} onClick={onAction} className="h-9 w-full rounded-[11px] text-[10px] font-black disabled:opacity-65" style={{ background: joined ? "var(--imc-surface-2)" : requested ? "var(--imc-indigo-soft)" : INDIGO, color: joined ? INK : requested ? "var(--imc-indigo-text)" : "white" }}>
          {loading ? "..." : label}
        </button>
      </div>
    </article>
  );
}

function EmptyLine({ text }) {
  return <div className="rounded-[16px] bg-[var(--imc-surface)] px-4 py-4 text-[10.5px] font-semibold" style={{ border: `1px solid ${LINE}`, color: MUTED }}>{text}</div>;
}

function LoadingRow() {
  return <div className="flex h-20 items-center justify-center rounded-[16px] bg-[var(--imc-surface)]" style={{ border: `1px solid ${LINE}` }}><Loader2 size={18} className="animate-spin" style={{ color: INDIGO }} /></div>;
}

function CircleSkeleton() {
  return <div className="grid h-[168px] place-items-center rounded-[19px] bg-[var(--imc-surface)]" style={{ border: `1px solid ${LINE}` }}><Loader2 size={17} className="animate-spin" style={{ color: INDIGO }} /></div>;
}
