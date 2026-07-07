import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";

import {
  getBrowseCircles,
  getMyCircles,
  joinCircle,
  requestToJoinCircle,
  getMySentCircleJoinRequests,
} from "../../api/circleApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// Same brand tokens as Network.jsx — kept local per this codebase's
// convention of not sharing helpers/constants across page files.
const INK = "var(--imc-text)";
const MARIGOLD = "#EC9A1E";
const INDIGO = "#4338CA";
const MUTED = "var(--imc-text-muted)";
const LINE = "var(--imc-border)";

const PAGE_SIZE = 10;

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
}

function getImageUrl(image) {
  if (!image) return "";

  const url = image?.secure_url || image?.url || image?.path || image;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

export default function BrowseCircles() {
  const navigate = useNavigate();

  const [circles, setCircles] = useState([]);
  const [joinedCircleIds, setJoinedCircleIds] = useState([]);
  const [requestedCircleIds, setRequestedCircleIds] = useState([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionId, setActionId] = useState("");

  const loadedPages = useRef(new Set());
  // Defense-in-depth alongside the backend's own exclusion — a circle
  // already joined should never show up in this "circles to join" list.
  const joinedIdsRef = useRef([]);

  const loadPage = async (targetPage, { replace = false } = {}) => {
    if (loadedPages.current.has(targetPage) && !replace) return;

    try {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await getBrowseCircles({ page: targetPage, limit: PAGE_SIZE });
      const list = (res?.circles || res?.data?.circles || []).filter(
        (circle) =>
          circle?.visibility !== "private" &&
          !joinedIdsRef.current.includes(String(getId(circle)))
      );

      loadedPages.current.add(targetPage);

      setCircles((prev) => (replace || targetPage === 1 ? list : [...prev, ...list]));
      setHasMore(Boolean(res?.hasMore));
      setTotal(res?.total || 0);
      setPage(targetPage);

      const inlineRequestedIds = res?.requestedCircleIds || [];
      if (inlineRequestedIds.length > 0) {
        setRequestedCircleIds((prev) => [
          ...new Set([...prev, ...inlineRequestedIds.map(String)]),
        ]);
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [myCirclesRes, joinRequestRes] = await Promise.allSettled([
        getMyCircles(),
        getMySentCircleJoinRequests(),
      ]);

      if (myCirclesRes.status === "fulfilled") {
        const memberships =
          myCirclesRes.value?.circles || myCirclesRes.value?.data?.circles || [];
        const joinedIds = [
          ...new Set(
            memberships
              .map((item) => String(getId(item?.circle || item)))
              .filter(Boolean)
          ),
        ];
        joinedIdsRef.current = joinedIds;
        setJoinedCircleIds(joinedIds);
      }

      if (joinRequestRes.status === "fulfilled") {
        const ids = joinRequestRes.value?.circleIds || [];
        setRequestedCircleIds((prev) => [...new Set([...prev, ...ids.map(String)])]);
      }

      await loadPage(1, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoinCircle = async (circleId) => {
    if (!circleId || actionId) return;

    try {
      setActionId(circleId);
      await joinCircle(circleId);
      setJoinedCircleIds((prev) => [...new Set([...prev, circleId])]);
      navigate(`/circles/${circleId}`);
    } catch (error) {
      const message = error?.response?.data?.message || "";

      if (message.toLowerCase().includes("already joined")) {
        setJoinedCircleIds((prev) => [...new Set([...prev, circleId])]);
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

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-24"
        style={{ background: "var(--imc-bg)" }}
      >
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .imc-press:active { transform: scale(0.97); }`}</style>

        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
          style={{ background: "var(--imc-bg)", borderBottom: `1px solid ${LINE}` }}
        >
          <button
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface)]"
            style={{ border: `1px solid ${LINE}` }}
          >
            <ArrowLeft size={17} style={{ color: INK }} />
          </button>

          <div>
            <h1 className="font-serif text-[16px] font-semibold" style={{ color: INK }}>
              All circles
            </h1>
            <p className="text-[10px] font-bold" style={{ color: MUTED }}>
              {total > 0 ? `${total} circles to discover` : "Discover circles to join"}
            </p>
          </div>
        </header>

        <main className="px-4 pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingTile key={index} />
              ))}
            </div>
          ) : circles.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {circles.map((circle) => {
                  const circleId = String(getId(circle));
                  const joined = joinedCircleIds.includes(circleId);
                  const inviteOnly = circle?.visibility === "invite-only";
                  const requested = requestedCircleIds.includes(circleId);

                  return (
                    <BrowseCircleCard
                      key={circleId}
                      circle={circle}
                      joined={joined}
                      inviteOnly={inviteOnly}
                      requested={requested}
                      loading={actionId === circleId}
                      onOpen={() => navigate(`/circles/${circleId}`)}
                      onJoin={() => {
                        if (joined) navigate(`/circles/${circleId}`);
                        else if (inviteOnly) handleRequestToJoinCircle(circleId);
                        else handleJoinCircle(circleId);
                      }}
                    />
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={loadingMore}
                  className="imc-press mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--imc-surface)] text-[12px] font-black disabled:opacity-60"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: "var(--imc-text)" }} />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </>
          ) : (
            <div
              className="mt-6 rounded-[22px] bg-[var(--imc-surface)] p-5 text-center shadow-[0_10px_26px_rgba(18,20,28,0.03)]"
              style={{ border: `1px solid ${LINE}` }}
            >
              <p className="text-[14px] font-black" style={{ color: INK }}>
                No circles to discover yet
              </p>
              <p className="mt-1 text-[11px] font-bold" style={{ color: MUTED }}>
                Circles will appear here as people start creating them.
              </p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function BrowseCircleCard({ circle, joined, inviteOnly, requested, loading, onOpen, onJoin }) {
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
      className="overflow-hidden rounded-[20px] bg-[var(--imc-surface)] shadow-[0_10px_26px_rgba(18,20,28,0.035)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <div
          className="relative h-[74px] w-full"
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
              <Sparkles size={20} style={{ color: MARIGOLD }} />
            </div>
          )}

          {inviteOnly && (
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-black"
              style={{ background: "rgba(67,56,202,0.14)", color: INDIGO }}
            >
              Invite only
            </span>
          )}
        </div>

        <div className="px-3 pt-2.5">
          <h3
            className="line-clamp-1 font-serif text-[13px] font-semibold"
            style={{ color: INK }}
          >
            {circle?.name || "Circle"}
          </h3>

          <p
            className="mt-1 flex items-center gap-1 text-[9.5px] font-bold"
            style={{ color: MUTED }}
          >
            <Users size={10} />
            {circle?.membersCount || 0} members
          </p>
        </div>
      </button>

      <div className="px-3 pb-3 pt-2.5">
        <button
          disabled={disabled}
          onClick={onJoin}
          className="imc-press h-9 w-full rounded-[12px] text-[10.5px] font-black disabled:opacity-60"
          style={{
            background: label === "Requested" ? "rgba(236,154,30,0.12)" : MARIGOLD,
            color: label === "Requested" ? MUTED : INK,
          }}
        >
          {loading ? "..." : label}
        </button>
      </div>
    </div>
  );
}

function LoadingTile() {
  return (
    <div
      className="grid h-[168px] place-items-center rounded-[20px] bg-[var(--imc-surface)] shadow-[0_10px_26px_rgba(18,20,28,0.03)]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <Loader2 size={18} className="animate-spin" style={{ color: "var(--imc-text)" }} />
    </div>
  );
}
