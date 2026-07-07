import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleDot,
  Compass,
  Loader2,
  Search as SearchIcon,
  Sparkles,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import { getCircleMembers, getCircles, getMyCircles } from "../../api/circleApi";
import { getJourneyFeed } from "../../api/journeyApi";
import { searchEverything } from "../../api/searchApi";
import { getUserSuggestions } from "../../api/userApi";
import { trackEvent } from "../../utils/analyticsTracker";
import { trackSearchEvent } from "../../api/analyticsApi";

const INK = "#12141C";
const PAPER = "#F8F4EA";
const MARIGOLD = "#EC9A1E";
const GOLD_TINT = "#FDF3E3";
const MUTED = "#6B7280";
const LINE = "rgba(18,20,28,0.08)";
const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const RECENT_SEARCH_KEY = "imcircle_recent_search_result";

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getHeadline(user) {
  return user?.headline || user?.role || user?.field || user?.username || "IMCircle user";
}

function getImageUrl(value) {
  if (!value) return "";

  const url =
    value?.secure_url ||
    value?.url ||
    value?.path ||
    value?.avatar?.url ||
    value?.profileImage?.url ||
    value?.coverImage?.url ||
    value?.image?.url ||
    value;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getUserImage(user) {
  return getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.photo ||
      user?.picture ||
      user?.image
  );
}

function getCoverImage(item) {
  return getImageUrl(
    item?.coverImage ||
      item?.cover ||
      item?.banner ||
      item?.image ||
      item?.thumbnail ||
      item?.journey?.coverImage
  );
}

function normalizeArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function itemText(item) {
  const data = item?.data || item;
  return [
    data?._id,
    data?.id,
    data?.fullName,
    data?.name,
    data?.username,
    data?.headline,
    data?.title,
    data?.description,
    data?.content,
    ...(Array.isArray(data?.tags) ? data.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function makeKey(type, data) {
  return `${type}:${getId(data) || data?.username || data?.name || data?.title}`;
}

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "journey", label: "Journey" },
  { value: "circle", label: "Community" },
  { value: "person", label: "User" },
];

function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const validFilter = (value) =>
    FILTER_TABS.some((tab) => tab.value === value) ? value : "all";

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [globalResults, setGlobalResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [myCircles, setMyCircles] = useState([]);
  const [circleMembers, setCircleMembers] = useState([]);
  const [circles, setCircles] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeFilter, setActiveFilter] = useState(() =>
    validFilter(searchParams.get("type"))
  );

  // Dedupes "appeared in search results" events so re-rendering the same
  // person for the same query (which happens on every keystroke re-render)
  // doesn't spam the backend with duplicate SearchEvent rows.
  const trackedAppearancesRef = useRef(new Set());

  const applyFilter = (value) => {
    setActiveFilter(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") next.delete("type");
        else next.set("type", value);
        return next;
      },
      { replace: true }
    );
  };

  const loadBase = async () => {
    try {
      setLoading(true);

      const [suggestionsRes, myCirclesRes, circlesRes, journeysRes] =
        await Promise.allSettled([
          getUserSuggestions(),
          getMyCircles(),
          getCircles(),
          getJourneyFeed(),
        ]);

      const users = normalizeArray(
        suggestionsRes.value?.users,
        suggestionsRes.value?.people,
        suggestionsRes.value?.suggestions,
        suggestionsRes.value?.data?.users
      );
      setSuggestedUsers(users);

      const memberships = normalizeArray(
        myCirclesRes.value?.circles,
        myCirclesRes.value?.data?.circles
      );
      const owned = memberships.map((item) => item?.circle || item).filter(Boolean);
      setMyCircles(owned);

      const memberLoads = await Promise.allSettled(
        owned.map((circle) => getCircleMembers(getId(circle)))
      );

      const members = memberLoads.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        return normalizeArray(result.value?.members, result.value?.data?.members)
          .map((member) => member?.user || member)
          .filter(Boolean);
      });
      setCircleMembers(members);

      setCircles(
        normalizeArray(circlesRes.value?.circles, circlesRes.value?.data?.circles)
      );

      setJourneys(
        normalizeArray(
          journeysRes.value?.journeys,
          journeysRes.value?.feed,
          journeysRes.value?.milestones,
          journeysRes.value?.data?.journeys,
          journeysRes.value?.data
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || "null");
      if (recent?.type && recent?.data) setSelected(recent);
    } catch {
      setSelected(null);
    }
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setGlobalResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const data = await searchEverything(cleanQuery);
        const users = normalizeArray(data?.users, data?.people, data?.data?.users);
        const circlesFound = normalizeArray(data?.circles, data?.data?.circles);
        const journeysFound = normalizeArray(data?.journeys, data?.data?.journeys);
        const posts = normalizeArray(data?.posts, data?.data?.posts);

        setGlobalResults([
          ...users.map((item) => ({ type: "person", data: item, rank: 30, reason: "Global result" })),
          ...circlesFound.map((item) => ({ type: "circle", data: item, rank: 26, reason: "Circle community" })),
          ...journeysFound.map((item) => ({ type: "journey", data: item, rank: 24, reason: "Journey" })),
          ...posts.map((item) => ({ type: "post", data: item, rank: 10, reason: "Post" })),
        ]);

        trackEvent("search", {
          entityType: "search",
          metadata: {
            query: cleanQuery.slice(0, 80),
            resultCount: users.length + circlesFound.length + journeysFound.length + posts.length,
          },
        }).catch(() => {});
      } catch {
        setGlobalResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const map = new Map();

    const add = (type, data, rank, reason) => {
      if (!data) return;
      if (cleanQuery && !itemText(data).includes(cleanQuery)) return;

      const key = makeKey(type, data);
      const current = map.get(key);
      if (!current || rank > current.rank) {
        map.set(key, { type, data, rank, reason });
      }
    };

    circleMembers.forEach((user) => add("person", user, 100, ""));
    suggestedUsers.forEach((user) => add("person", user, 72, ""));
    myCircles.forEach((circle) => add("circle", circle, 95, ""));
    circles.forEach((circle) => add("circle", circle, 64, ""));
    journeys.forEach((journey) => add("journey", journey?.journey || journey, 58, ""));
    globalResults.forEach((item) => add(item.type, item.data, item.rank, item.reason));

    const all = [...map.values()].sort((a, b) => b.rank - a.rank);

    if (activeFilter === "all") return all;
    return all.filter((item) => item.type === activeFilter);
  }, [
    activeFilter,
    circleMembers,
    circles,
    globalResults,
    journeys,
    myCircles,
    query,
    suggestedUsers,
  ]);

  // Records "this person appeared in someone's search results" — this had
  // no caller anywhere in the app before, which is why a profile's search
  // appearances/clicks always read 0 on the Analytics page even after real
  // searches happened. Debounced against `results` re-renders (which fire
  // on every keystroke) and deduped per query+person so typing doesn't
  // spam duplicate events.
  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    const timeout = setTimeout(() => {
      results
        .filter((item) => item.type === "person")
        .forEach((item) => {
          const personId = getId(item.data);
          if (!personId) return;

          const dedupeKey = `${cleanQuery.toLowerCase()}:${personId}`;
          if (trackedAppearancesRef.current.has(dedupeKey)) return;
          trackedAppearancesRef.current.add(dedupeKey);

          trackSearchEvent({
            query: cleanQuery.slice(0, 80),
            resultType: "user",
            resultId: personId,
            owner: personId,
            action: "appeared",
          }).catch(() => {});
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [results, query]);

  const openResult = (item) => {
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(item));
    } catch {
      // Recent search is only a convenience.
    }
    setSelected(item);

    const data = item.data;
    const id = getId(data);

    if (item.type === "person" && id) {
      trackSearchEvent({
        query: query.trim().slice(0, 80) || "recent",
        resultType: "user",
        resultId: id,
        owner: id,
        action: "clicked",
      }).catch(() => {});
    }

    if (item.type === "circle" && id) navigate(`/circles/${id}`);
    else if (item.type === "journey" && id) navigate(`/journey/${id}`);
    else if (item.type === "person" && data?.username)
      navigate(`/profile/${data.username}`, { state: { source: "search" } });
    else if (item.type === "person" && id)
      navigate(`/profile/user/${id}`, { state: { source: "search" } });
  };

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "#DED8CC" }}>
      <div className="min-h-screen w-full max-w-[430px] pb-24" style={{ background: PAPER }}>
        <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-4 backdrop-blur-xl" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: PAPER, color: INK }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex h-12 flex-1 items-center gap-2 rounded-[18px] px-4" style={{ background: PAPER }}>
              <SearchIcon size={18} style={{ color: MUTED }} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
                autoFocus
                placeholder="Search people, journeys, communities"
                className="w-full bg-transparent text-[13px] font-semibold outline-none"
                style={{ color: INK }}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => applyFilter(tab.value)}
                className="shrink-0 rounded-full px-4 py-1.5 text-[11.5px] font-black transition"
                style={
                  activeFilter === tab.value
                    ? { background: MARIGOLD, color: INK }
                    : { background: PAPER, color: MUTED, border: `1px solid ${LINE}` }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pt-5">
          {loading ? (
            <div className="grid min-h-[180px] place-items-center">
              <Loader2 className="animate-spin" size={25} style={{ color: MARIGOLD }} />
            </div>
          ) : selected ? (
            <SelectedResult
              item={selected}
              onClear={() => {
                setSelected(null);
                localStorage.removeItem(RECENT_SEARCH_KEY);
              }}
              onOpen={() => openResult(selected)}
            />
          ) : results.length > 0 ? (
            <div className="divide-y rounded-[18px] bg-[var(--imc-surface)]" style={{ border: `1px solid ${LINE}`, borderColor: LINE }}>
              {results.map((item) => (
                <button
                  key={makeKey(item.type, item.data)}
                  onClick={() => openResult(item)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left first:rounded-t-[18px] last:rounded-b-[18px]"
                  style={{ borderColor: LINE }}
                >
                  <ResultImage item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-black" style={{ color: INK }}>
                      {item.data?.fullName || item.data?.name || item.data?.username || item.data?.title || "Result"}
                    </p>
                    <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                      {item.data?.description || item.data?.headline || getHeadline(item.data)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            query.trim() && (
              <div className="rounded-[24px] bg-[var(--imc-surface)] p-6 text-center" style={{ border: `1px solid ${LINE}` }}>
                <Compass className="mx-auto" size={26} style={{ color: MARIGOLD }} />
                <p className="mt-3 text-[14px] font-black" style={{ color: INK }}>
                  No results
                </p>
              </div>
            )
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function ResultIcon({ type }) {
  const Icon =
    type === "circle" ? UsersRound : type === "journey" ? Sparkles : type === "post" ? CircleDot : User;

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px]" style={{ background: INK, color: MARIGOLD }}>
      <Icon size={22} />
    </div>
  );
}

function ResultImage({ item, large = false }) {
  const data = item.data || {};
  const size = large ? 50 : 42;
  const image = item.type === "person" ? getUserImage(data) : getCoverImage(data);
  const Icon =
    item.type === "circle" ? UsersRound : item.type === "journey" ? Sparkles : item.type === "post" ? CircleDot : User;

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden ${item.type === "person" ? "rounded-full" : "rounded-[16px]"}`}
      style={{
        width: size,
        height: size,
        background: INK,
        color: MARIGOLD,
      }}
    >
      {image ? (
        <img src={image} alt={data?.name || data?.title || "Result"} className="h-full w-full object-cover" />
      ) : (
        <Icon size={large ? 34 : 21} />
      )}
    </div>
  );
}

function SelectedResult({ item, onClear, onOpen }) {
  const data = item.data || {};

  return (
    <div
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] bg-[var(--imc-surface)] p-3 text-left"
      style={{ border: `1px solid ${LINE}` }}
    >
        <ResultImage item={item} large />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black" style={{ color: INK }}>
            {data?.fullName || data?.name || data?.username || data?.title || "Result"}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: MUTED }}>
            {data?.description || data?.headline || getHeadline(data)}
          </p>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: PAPER, color: INK }}
        >
          <X size={17} />
        </button>
    </div>
  );
}

export default Search;
