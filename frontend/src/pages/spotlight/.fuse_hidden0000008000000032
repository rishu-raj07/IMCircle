import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Heart,
  MessageSquare,
  PenSquare,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import ImageLoader from "../../components/common/ImageLoader";
import CircleAction from "../../components/common/CircleAction";
import { getGenderAvatarIcon } from "../../utils/avatar";
import {
  getSpotlightNav,
  getSpotlightWeek,
  getSpotlightTopActive,
  submitSpotlightNomination,
  upvoteSpotlightWinner,
} from "../../api/spotlightApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const INDIGO = "#4338CA";
const MARIGOLD = "#EC9A1E";

const NOMINATE_TARGET_TYPES = [
  { value: "post", label: "Post" },
  { value: "journey", label: "Journey" },
  { value: "learning", label: "Learning" },
  { value: "milestone", label: "Milestone" },
  { value: "user", label: "Person" },
  { value: "startup", label: "Startup" },
];

// Short, human "role" tag shown next to a winner's name — derived from
// which category they won, so it never needs its own data source.
const ROLE_TAG = {
  builder_of_week: { label: "Builder", bg: "rgba(67,56,202,0.12)", color: INDIGO },
  student_of_week: { label: "Student", bg: "rgba(236,154,30,0.14)", color: "#B4720F" },
  founder_of_week: { label: "Founder", bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  creator_of_week: { label: "Creator", bg: "rgba(219,39,119,0.12)", color: "#DB2777" },
  developer_of_week: { label: "Developer", bg: "rgba(37,99,235,0.12)", color: "#2563EB" },
  designer_of_week: { label: "Designer", bg: "rgba(13,148,136,0.12)", color: "#0D9488" },
  learning_of_week: { label: "Learner", bg: "rgba(22,163,74,0.12)", color: "#16A34A" },
  biggest_milestone: { label: "Journey", bg: "rgba(236,154,30,0.14)", color: "#B4720F" },
  rising_builder: { label: "Rising", bg: "rgba(234,179,8,0.14)", color: "#A16207" },
  most_helpful_member: { label: "Helper", bg: "rgba(8,145,178,0.12)", color: "#0891B2" },
  consistency_streak: { label: "Streak", bg: "rgba(217,45,32,0.1)", color: "#D92D20" },
};

// Rank 1/2/3 get a medal-style left accent + rank-number color; everything
// past that stays neutral.
const RANK_ACCENT = ["#EC9A1E", "#94A3B8", "#EA8A4C"];

function getImageUrl(image) {
  if (!image) return "";
  const url = image?.url || image?.secure_url || image?.path || image;
  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

// Username, no "@" — the convention every card in the app now follows
// (PostCard/JourneyCard show username instead of display name).
function getUsername(user) {
  return user?.username || user?.fullName || user?.name || "member";
}

function formatWeekLabel(week) {
  if (!week?.weekNumber) return "";
  return `Week ${week.weekNumber}`;
}

function formatDateRange(week) {
  if (!week?.startDate) return "";
  const start = new Date(week.startDate);
  const end = week.endDate ? new Date(week.endDate) : null;
  const opts = { day: "numeric", month: "short" };
  const startLabel = start.toLocaleDateString("en-IN", opts);
  const endLabel = end ? end.toLocaleDateString("en-IN", opts) : "";
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
}

function StatChip({ icon, value, color }) {
  return (
    <span className="flex items-center gap-1">
      <span style={{ color }}>{icon}</span>
      {value}
    </span>
  );
}

// One ranked leaderboard row — simplified to a flat list row (hairline
// divider instead of a bordered card-in-a-card) so the list scans quickly:
// rank number, avatar, name + role, a one-line reason, and a real stats row
// (streak, journey updates, likes, profile views, impact score — all
// sourced from existing fields, see spotlight.service.js's
// getUserStatsSnapshot). Circle action + upvote sit in a compact column on
// the right instead of a separate bordered "Impact" box.
function LeaderboardRow({ rank, category, onUpvote, isLast, allowUpvote = true }) {
  const navigate = useNavigate();
  const winner = category.winner;
  if (!winner) return null;

  const accent = RANK_ACCENT[rank - 1] || "var(--imc-text-faint)";
  const roleTag = ROLE_TAG[category.key] || { label: category.label, bg: "var(--imc-surface-2)", color: "var(--imc-text-muted)" };
  const reasonLine = winner.reason?.[0] || category.label;
  const stats = winner.stats || {};

  const openProfile = () => navigate(`/profile/user/${winner.user?._id}`);

  return (
    // The whole row is tappable now (opens the person's profile), not just
    // the avatar/name — the Circle button and upvote pill stop propagation
    // so they still act independently instead of also firing a navigation.
    <div
      role="button"
      tabIndex={0}
      onClick={openProfile}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openProfile()}
      className="flex cursor-pointer items-center gap-3 py-3 active:opacity-80"
      style={!isLast ? { borderBottom: "1px solid var(--imc-border)" } : undefined}
    >
      <span className="w-6 shrink-0 text-center text-[13px] font-bold" style={{ color: accent }}>
        #{rank}
      </span>

      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: "var(--imc-action-soft)" }}>
        {getImageUrl(winner.user?.avatar) ? (
          <ImageLoader
            src={getImageUrl(winner.user?.avatar)}
            alt={getUsername(winner.user)}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full"
            width={112}
          />
        ) : (
          <img
            src={getGenderAvatarIcon(winner.user)}
            alt={getUsername(winner.user)}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="min-w-0 truncate text-[13.5px] font-bold" style={{ color: "var(--imc-text)" }}>
            {getUsername(winner.user)}
          </span>
          {winner.user?.verification?.isVerified && <BadgeCheck size={12} className="shrink-0" style={{ color: INDIGO }} />}
          <span className="shrink-0 text-[11px] font-semibold" style={{ color: roleTag.color }}>
            · {roleTag.label}
          </span>
        </div>

        {winner.user?.headline && (
          <p className="mt-0.5 truncate text-[11px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
            {winner.user.headline}
          </p>
        )}

        <p className="mt-0.5 truncate text-[11.5px] font-medium" style={{ color: "var(--imc-text-muted)" }}>
          {[winner.user?.primaryInterest || winner.user?.field, reasonLine].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-1 flex items-center gap-2.5 text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
          <StatChip icon={<Flame size={11} />} value={`${stats.streak || 0}d`} color={MARIGOLD} />
          <StatChip icon={<MessageSquare size={11} />} value={stats.updates || 0} color="var(--imc-text-muted)" />
          <StatChip icon={<Heart size={11} />} value={stats.likes || 0} color="#D92D20" />
          <StatChip icon={<Eye size={11} />} value={stats.views || 0} color="var(--imc-text-muted)" />
          <StatChip icon={<ArrowUp size={11} />} value={`${stats.activityScore || 0} activity`} color={INDIGO} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <CircleAction
          userId={winner.user?._id}
          isSelf={Boolean(winner.user?.isMine)}
          isCircleMember={Boolean(winner.user?.inCircle)}
          isRequested={Boolean(winner.user?.circleRequested)}
          size="xs"
        />

        {allowUpvote && (
          <button
            type="button"
            onClick={() => onUpvote(category.key)}
            className="flex items-center gap-1 rounded-full px-2 py-1 active:scale-95"
            style={
              winner.upvotedByMe
                ? { background: INDIGO, color: "#fff" }
                : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
            }
          >
            <ArrowUp size={11} strokeWidth={3} />
            <span className="text-[10px] font-bold">{winner.upvoteCount || 0}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// The form behind "Launch Spotlight" — submits straight to the real backend
// nomination pipeline (POST /spotlight/nominate -> SpotlightNomination),
// the same one the admin's Nominations tab reviews. Lets the person pick
// which category they're nominating for (defaulting to the first one this
// week has), what kind of thing it is, and why — nothing here is faked or
// client-only.
function NominateSheet({ open, categories, onClose }) {
  const [categoryKey, setCategoryKey] = useState("");
  const [targetType, setTargetType] = useState("user");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && !categoryKey && categories?.length > 0) {
      setCategoryKey(categories[0].key);
    }
  }, [open, categories, categoryKey]);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setNote("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (submitting || !categoryKey) return;
    setSubmitting(true);
    try {
      await submitSpotlightNomination({
        category: categoryKey,
        targetType,
        note,
      });
      setDone(true);
    } catch {
      // best-effort — the sheet just stays open so they can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--imc-text)" }}>
            Nominate for Spotlight
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--imc-surface-2)" }}>
            <X size={16} style={{ color: "var(--imc-text)" }} />
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: "var(--imc-action-soft)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--imc-indigo-text)" }}>
              Nomination submitted
            </p>
            <p className="mt-1 text-[11.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              Our team reviews nominations before each week's Spotlight is generated.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[11.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
              Which category?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(categories || []).map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setCategoryKey(category.key)}
                  className="rounded-full px-3.5 py-2 text-[11px] font-bold"
                  style={
                    categoryKey === category.key
                      ? { background: "var(--imc-indigo)", color: "#fff" }
                      : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)", border: "1px solid var(--imc-border)" }
                  }
                >
                  {category.emoji} {category.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
              What kind of thing are you nominating?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {NOMINATE_TARGET_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTargetType(option.value)}
                  className="rounded-full px-3.5 py-2 text-[11px] font-bold"
                  style={
                    targetType === option.value
                      ? { background: "var(--imc-indigo)", color: "#fff" }
                      : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)", border: "1px solid var(--imc-border)" }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder="Tell us why they deserve it..."
              rows={3}
              className="mt-4 w-full resize-none rounded-2xl p-3 text-[12.5px] font-semibold outline-none"
              style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)", color: "var(--imc-text)" }}
            />

            <button
              type="button"
              disabled={submitting || !categoryKey}
              onClick={handleSubmit}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: "var(--imc-indigo)" }}
            >
              <Send size={15} />
              {submitting ? "Submitting..." : "Submit nomination"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// All-categories reference sheet, opened from the header's "Categories"
// button — purely informational (what exists / their emoji), reusing
// whatever category metadata the currently-loaded week already has instead
// of a separate API call.
function CategoriesSheet({ open, categories, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--imc-text)" }}>
            Spotlight categories
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--imc-surface-2)" }}>
            <X size={16} style={{ color: "var(--imc-text)" }} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <div
              key={category.key}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <span className="text-[16px]">{category.emoji}</span>
              <span className="truncate text-[11.5px] font-bold" style={{ color: "var(--imc-text)" }}>
                {category.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Launchpad-style week strip: a horizontally scrollable row of "Week N"
// pills (oldest on the left, current week on the right) with explicit
// prev/next scroll buttons, and the selected week highlighted. Backed by
// GET /spotlight/nav, which is pure date math (spotlight.service.js's
// listRecentWeekMetas) — it always returns a full, scrollable list even for
// weeks nobody has generated data for yet, so the strip never looks broken.
function WeekStrip({ weeks, selectedWeekKey, onSelect }) {
  const stripRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selectedWeekKey, weeks.length]);

  if (weeks.length === 0) return null;

  const scrollBy = (delta) => stripRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => scrollBy(-180)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
      >
        <ChevronLeft size={16} />
      </button>

      <div ref={stripRef} className="no-scrollbar flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
        {weeks.map((week) => {
          const active = week.weekKey === selectedWeekKey;
          return (
            <button
              key={week.weekKey}
              ref={active ? selectedRef : null}
              type="button"
              onClick={() => onSelect(week.weekKey)}
              className="shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-bold"
              style={
                active
                  ? { background: INDIGO, color: "#fff" }
                  : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
              }
            >
              {formatWeekLabel(week)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(180)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function Spotlight() {
  const navigate = useNavigate();
  const [navWeeks, setNavWeeks] = useState([]);
  const [navLoading, setNavLoading] = useState(true);
  const [selectedWeekKey, setSelectedWeekKey] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [weekLoading, setWeekLoading] = useState(true);
  const [nominateOpen, setNominateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeLoading, setActiveLoading] = useState(true);
  // "activity" (the real, dynamic ranking: streak x5 + referrals x3 +
  // this-week consistency x1, see getUserStatsSnapshot in
  // spotlight.service.js) is the default — it's the actual answer to "who's
  // most active in the app right now", not just who got upvoted or won one
  // category's metric. "trending" (upvotes) and "impact" (that category's
  // own metricValue) stay available as alternate lenses.
  const [sortMode, setSortMode] = useState("activity");

  // Load the browsable week strip once, then default the selection to the
  // current (last / rightmost) week in that list.
  useEffect(() => {
    (async () => {
      try {
        const res = await getSpotlightNav(30);
        const weeks = res?.weeks || [];
        setNavWeeks(weeks);
        if (weeks.length > 0) setSelectedWeekKey(weeks[weeks.length - 1].weekKey);
      } catch {
        setNavWeeks([]);
      } finally {
        setNavLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedWeekKey) return;

    let cancelled = false;
    setWeekLoading(true);

    (async () => {
      try {
        const res = await getSpotlightWeek(selectedWeekKey);
        if (!cancelled) setWeekData(res?.week || null);
      } catch {
        if (!cancelled) setWeekData(null);
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedWeekKey]);

  // The real, distinct-people ranking (GET .../top-active) — computed fresh
  // from live data every time, independent of the per-category winner docs,
  // so rank 2 is genuinely a different person from rank 1 instead of the
  // same person's second category win.
  useEffect(() => {
    if (!selectedWeekKey) return;

    let cancelled = false;
    setActiveLoading(true);

    (async () => {
      try {
        const res = await getSpotlightTopActive(selectedWeekKey, 12);
        if (!cancelled) setActiveUsers(res?.entries || []);
      } catch {
        if (!cancelled) setActiveUsers([]);
      } finally {
        if (!cancelled) setActiveLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedWeekKey]);

  const handleUpvote = async (categoryKey) => {
    if (!weekData) return;

    // Optimistic toggle so the tap feels instant; reverts if the request
    // fails (e.g. the category genuinely has nobody to upvote yet).
    const previous = weekData;
    const next = {
      ...weekData,
      categories: weekData.categories.map((category) => {
        if (category.key !== categoryKey || !category.winner) return category;
        const wasUpvoted = category.winner.upvotedByMe;
        return {
          ...category,
          winner: {
            ...category.winner,
            upvotedByMe: !wasUpvoted,
            upvoteCount: (category.winner.upvoteCount || 0) + (wasUpvoted ? -1 : 1),
          },
        };
      }),
    };
    setWeekData(next);

    try {
      await upvoteSpotlightWinner(selectedWeekKey, categoryKey);
    } catch {
      setWeekData(previous);
    }
  };

  // "activity" uses the real cross-user leaderboard (GET .../top-active) —
  // genuinely distinct people, rank 2 is a different person from rank 1,
  // never the same builder shown twice. "trending"/"impact" still browse
  // the per-category winners (deduped by person, since with few active
  // users the same builder can legitimately win several categories at
  // once and shouldn't repeat in the list).
  const loading =
    navLoading ||
    (weekLoading && !weekData) ||
    (sortMode === "activity" && activeLoading && activeUsers.length === 0);

  const rankedCategories =
    sortMode === "activity"
      ? activeUsers
      : (() => {
          const sorted = (weekData?.categories || [])
            .filter((category) => category.winner)
            .slice()
            .sort((a, b) =>
              sortMode === "impact"
                ? (b.winner.metricValue || 0) - (a.winner.metricValue || 0)
                : (b.winner.upvoteCount || 0) - (a.winner.upvoteCount || 0)
            );

          const seenUsers = new Set();
          return sorted.filter((category) => {
            const userId = String(category.winner.user?._id || "");
            if (!userId || seenUsers.has(userId)) return false;
            seenUsers.add(userId);
            return true;
          });
        })();

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[430px] pb-24" style={{ background: "var(--imc-bg)" }}>
        <div
          className="sticky top-0 z-20 px-4 py-4"
          style={{ background: "var(--imc-bg)", borderBottom: "1px solid var(--imc-border)" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
              style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                style={{ background: `linear-gradient(135deg, ${INDIGO}, #6D5CE0)` }}
              >
                <Sparkles size={20} color="#fff" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h1 className="truncate text-[18px] font-bold" style={{ color: "var(--imc-text)" }}>
                    Spotlight
                  </h1>
                  <Sparkles size={13} style={{ color: MARIGOLD }} />
                </div>
                <p className="truncate text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  Celebrating real journeys, daily effort and consistent growth on IMCircle.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <WeekStrip weeks={navWeeks} selectedWeekKey={selectedWeekKey} onSelect={setSelectedWeekKey} />
          </div>
        </div>

        <div className="px-4 pt-4">
          {loading && (
            <p className="py-10 text-center text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
              Loading Spotlight...
            </p>
          )}

          {!loading && !weekData && (
            <div className="rounded-[22px] p-6 text-center" style={{ background: "var(--imc-surface)" }}>
              <Sparkles size={28} className="mx-auto" style={{ color: MARIGOLD }} />
              <p className="mt-3 text-[14px] font-bold" style={{ color: "var(--imc-text)" }}>
                Nothing in Spotlight yet
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                Every week, IMCircle's most active builders, learners, and journeys get featured here. Check back soon.
              </p>
            </div>
          )}

          {!loading && weekData && (
            <>
              <div className="mb-3">
                <p className="text-[17px] font-bold" style={{ color: "var(--imc-text)" }}>
                  {formatWeekLabel(weekData)} {weekData.status === "live" && <span>🎉</span>}
                </p>
                <p className="text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  {formatDateRange(weekData)}
                </p>
              </div>

              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: "var(--imc-text)" }}>
                  <Trophy size={15} style={{ color: MARIGOLD }} />
                  Top Journeys &amp; Builders
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSortMode((m) => (m === "activity" ? "trending" : m === "trending" ? "impact" : "activity"))
                  }
                  className="text-[11px] font-bold"
                  style={{ color: "var(--imc-indigo-text)" }}
                >
                  {sortMode === "activity" ? "⚡ Activity" : sortMode === "trending" ? "↗ Trending" : "🎯 Impact"}
                </button>
              </div>

              {rankedCategories.length === 0 && (
                <div className="rounded-[22px] p-6 text-center" style={{ background: "var(--imc-surface)" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--imc-text)" }}>
                    Nothing here yet
                  </p>
                </div>
              )}

              {rankedCategories.length > 0 && (
                <div>
                  {rankedCategories.map((category, index) => (
                    <LeaderboardRow
                      key={category.key}
                      rank={index + 1}
                      category={category}
                      onUpvote={handleUpvote}
                      isLast={index === rankedCategories.length - 1}
                      allowUpvote={sortMode !== "activity"}
                    />
                  ))}
                </div>
              )}

              <div
                className="mt-5 flex items-center gap-3 rounded-[24px] p-4"
                style={{ background: "var(--imc-action-soft)" }}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: INDIGO }}>
                  <Trophy size={18} color="#fff" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold leading-4" style={{ color: "var(--imc-text)" }}>
                    We don't celebrate achievements. We celebrate effort.
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-medium leading-4" style={{ color: "var(--imc-text-muted)" }}>
                    Keep showing up. Keep building. Your journey matters.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/create-journey")}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[12.5px] font-bold text-white active:scale-[0.99]"
                style={{ background: INDIGO }}
              >
                Share Your Journey
                <PenSquare size={13} />
              </button>
            </>
          )}
        </div>

        <NominateSheet
          open={nominateOpen}
          categories={weekData?.categories || []}
          onClose={() => setNominateOpen(false)}
        />
        <CategoriesSheet
          open={categoriesOpen}
          categories={weekData?.categories || []}
          onClose={() => setCategoriesOpen(false)}
        />

        <BottomNav />
      </div>
    </div>
  );
}

export default Spotlight;
