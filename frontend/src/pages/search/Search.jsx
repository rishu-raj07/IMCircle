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
import TrendingHashtags from "../../components/common/TrendingHashtags";
import { getCircleMembers, getCircles, getMyCircles } from "../../api/circleApi";
import { getJourneyDiscoverFeed } from "../../api/journeyApi";
import { searchEverything } from "../../api/searchApi";
import { getUserSuggestions } from "../../api/userApi";
import { trackEvent } from "../../utils/analyticsTracker";
import { trackSearchEvent } from "../../api/analyticsApi";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getJourneyCoverIcon, getCommunityCoverIcon } from "../../utils/media";

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
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${API_URL}${url}`;
  if (/^uploads[\\/]/i.test(url)) return `${API_URL}/${url.replace(/\\/g, "/")}`;
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
      item?.images?.[0] ||
      item?.media?.[0] ||
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
          getJourneyDiscoverFeed(),
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

  const journeyBuilders = useMemo(() => {
    const unique = new Map();

    journeys.forEach((raw) => {
      const milestone = raw?.data || raw;
      const journey = milestone?.journey || milestone;
      const creator = milestone?.creator || journey?.creator;
      const creatorId = getId(creator);
      const journeyId = getId(journey);
      if (!creatorId || !journeyId || unique.has(creatorId)) return;
      unique.set(creatorId, { creator, journey, milestone });
    });

    return [...unique.values()].slice(0, 8);
  }, [journeys]);

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
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="min-h-screen w-full max-w-[430px] pb-24" style={{ background: "var(--imc-bg)" }}>
        <header className="border-b px-4 pb-4 pt-[16px] backdrop-blur-xl" style={{ borderColor: "var(--imc-border)", background: "color-mix(in srgb, var(--imc-bg) 92%, transparent)" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: "var(--imc-surface)", color: "var(--imc-text)", border: "1px solid var(--imc-border)" }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex h-12 flex-1 items-center gap-2 rounded-[18px] border px-4" style={{ background: "var(--imc-surface)", borderColor: "var(--imc-border)" }}>
              <SearchIcon size={18} style={{ color: "var(--imc-indigo-text)" }} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
                autoFocus
                placeholder="Search people, journeys, communities"
                className="w-full bg-transparent text-[13px] font-semibold outline-none"
                style={{ color: "var(--imc-text)" }}
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
                    ? { background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }
                    : { background: "var(--imc-surface)", color: "var(--imc-text-muted)", border: "1px solid var(--imc-border)" }
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
              <Loader2 className="animate-spin" size={25} style={{ color: "var(--imc-indigo-text)" }} />
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
            <div className="divide-y divide-[var(--imc-border)] rounded-[18px] bg-[var(--imc-surface)]" style={{ border: "1px solid var(--imc-border)" }}>
              {results.map((item) => (
                <button
                  key={makeKey(item.type, item.data)}
                  onClick={() => openResult(item)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left first:rounded-t-[18px] last:rounded-b-[18px]"
                  style={{ borderColor: "var(--imc-border)" }}
                >
                  <ResultImage item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
                      {item.data?.fullName || item.data?.name || item.data?.username || item.data?.title || "Result"}
                    </p>
                    <p className="truncate text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                      {item.data?.description || item.data?.headline || getHeadline(item.data)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : !query.trim() ? (
            <>
              <TrendingHashtags />

              {journeyBuilders.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}><Sparkles size={16} /></span>
                    <div>
                      <h2 className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>Builders on a journey</h2>
                      <p className="text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>People sharing progress in public</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {journeyBuilders.map((item) => (
                      <JourneyBuilderRecommendation key={`${getId(item.creator)}:${getId(item.journey)}`} item={item} navigate={navigate} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            query.trim() && (
              <div className="rounded-[24px] bg-[var(--imc-surface)] p-6 text-center" style={{ border: "1px solid var(--imc-border)" }}>
                <Compass className="mx-auto" size={26} style={{ color: "var(--imc-indigo-text)" }} />
                <p className="mt-3 text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
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
        background: "var(--imc-action-soft)",
        color: "var(--imc-indigo-text)",
      }}
    >
      {image ? (
        <img src={image} alt={data?.name || data?.title || "Result"} className="h-full w-full object-cover" />
      ) : item.type === "circle" ? (
        <img src={getCommunityCoverIcon()} alt="" className="h-full w-full object-cover" />
      ) : item.type === "person" ? (
        <img src={getGenderAvatarIcon(data)} alt="" className="h-full w-full object-cover" />
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
      style={{ border: "1px solid var(--imc-border)" }}
    >
        <ResultImage item={item} large />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
            {data?.fullName || data?.name || data?.username || data?.title || "Result"}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            {data?.description || data?.headline || getHeadline(data)}
          </p>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
        >
          <X size={17} />
        </button>
    </div>
  );
}

function JourneyBuilderRecommendation({ item, navigate }) {
  const { creator, journey, milestone } = item;
  const creatorId = getId(creator);
  const journeyId = getId(journey);
  const cover = getCoverImage(journey) || getCoverImage(milestone);
  const avatar = getUserImage(creator);
  const currentDay = Number(journey?.currentDay || milestone?.day || 1);
  const targetDays = Number(journey?.targetDays || journey?.totalDays || 100);
  const progress = Math.min(100, Math.max(1, Math.round((currentDay / Math.max(1, targetDays)) * 100)));

  return (
    <article className="overflow-hidden rounded-[20px] border" style={{ background: "var(--imc-surface)", borderColor: "var(--imc-border)" }}>
      <button
        type="button"
        onClick={() => creator?.username ? navigate(`/profile/${creator.username}`) : navigate(`/profile/user/${creatorId}`)}
        className="flex w-full items-center gap-2.5 px-3 py-3 text-left"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: "var(--imc-surface-2)", color: "var(--imc-indigo-text)" }}>
          <SafeImage
            src={avatar}
            fallback={<img src={getGenderAvatarIcon(creator)} alt="" className="h-full w-full object-cover" />}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black" style={{ color: "var(--imc-text)" }}>{getName(creator)}</p>
          <p className="truncate text-[9.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>{getHeadline(creator)}</p>
        </div>
        <span className="text-[9.5px] font-black" style={{ color: "var(--imc-indigo-text)" }}>View profile</span>
      </button>
      <button type="button" onClick={() => navigate(`/journey/${journeyId}`)} className="flex w-full gap-3 border-t p-3 text-left" style={{ borderColor: "var(--imc-border)" }}>
        <div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-[14px]" style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)" }}>
          {cover ? (
            <SafeImage
              src={cover}
              fallback={<img src={getJourneyCoverIcon()} alt="" className="h-14 w-14 rounded-full object-cover" />}
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={getJourneyCoverIcon()} alt="" className="h-14 w-14 rounded-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black" style={{ color: "var(--imc-text)" }}>{journey?.title || "Building in public"}</p>
          <p className="mt-1 text-[9.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>Day {currentDay} of {targetDays} · {progress}% complete</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--imc-surface-2)" }}><div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--imc-indigo-text)" }} /></div>
        </div>
      </button>
    </article>
  );
}

function SafeImage({ src, fallback, className }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
}

export default Search;
