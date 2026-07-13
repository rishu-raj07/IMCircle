import { Flame, Share2, ArrowRight } from "lucide-react";

function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  return new Date(dateA).toDateString() === new Date(dateB).toDateString();
}

/**
 * Prominent streak display with loss-aversion messaging. Meant to sit
 * somewhere a user sees every time they open the app (top of Home) so the
 * "don't break the streak" nudge actually has a chance to work.
 *
 * `compact` renders a smaller strip suited to the Profile page instead of
 * the full hero treatment on Home.
 */
function StreakCard({
  builderScore,
  compact = false,
  onShare,
  variant = "share",
  onPrimaryAction,
  hasActiveJourney = true,
}) {
  const streak = builderScore?.currentStreak || 0;
  const longestStreak = builderScore?.longestStreak || 0;
  const level = builderScore?.level || "Explorer";
  const postedToday = isSameDay(builderScore?.lastActiveDate, new Date());

  if (compact) {
    const isPrompt = variant === "prompt";

    // A streak only means something while a journey is actively running —
    // without one, calling it a "Day X streak" implies there's daily
    // progress to log when there isn't, so lead with starting a journey.
    const title = !hasActiveJourney
      ? "Start a journey"
      : streak > 0
      ? `Day ${streak} streak`
      : "Start your streak";

    const subtitle = isPrompt
      ? !hasActiveJourney
        ? streak > 0
          ? `Start a new journey to keep your ${streak}-day streak alive`
          : "Start a journey to begin your streak"
        : streak > 0
        ? "Post daily to grow your journey"
        : "Start a journey to begin your streak"
      : `${level} · Best ${longestStreak} days`;

    const promptTitle = isPrompt && hasActiveJourney && streak > 0 ? "Keep your streak alive!" : title;

    if (isPrompt) {
      return (
        <button
          type="button"
          onClick={onPrimaryAction}
          className="flex min-h-[58px] w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left shadow-[0_7px_20px_rgba(91,55,238,0.08)] active:scale-[0.99]"
          style={{
            background: "linear-gradient(100deg, var(--imc-surface), var(--imc-action-soft))",
            border: "1px solid var(--imc-action-border)",
          }}
        >
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={{
              background: streak > 0 ? "rgba(245,158,11,0.16)" : "rgba(148,163,184,0.14)",
              border: streak > 0 ? "1px solid rgba(245,158,11,0.28)" : "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <Flame
              size={18}
              fill={streak > 0 ? "#D97706" : "none"}
              style={{ color: streak > 0 ? "#D97706" : "var(--imc-text-muted)" }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black" style={{ color: "var(--imc-text)" }}>{promptTitle}</p>
            <p className="mt-0.5 truncate text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              {subtitle}
            </p>
          </div>

          {hasActiveJourney && streak > 0 ? (
            <div className="flex shrink-0 items-center gap-3 border-l pl-4" style={{ borderColor: "var(--imc-action-border)" }}>
              <div className="min-w-[42px] text-center">
                <p className="text-[21px] font-black leading-5" style={{ color: "var(--imc-indigo-text)" }}>{streak}</p>
                <p className="mt-0.5 text-[8px] font-black" style={{ color: "var(--imc-text)" }}>Day Streak</p>
              </div>
              <ArrowRight size={15} style={{ color: "var(--imc-indigo-text)" }} />
            </div>
          ) : (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
              style={{ background: "rgba(245,158,11,0.16)", color: "#D97706" }}
            >
              <ArrowRight size={15} />
            </span>
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onShare}
        className="flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] active:scale-[0.99]"
        style={{
          background: "var(--imc-surface)",
          border: "1px solid var(--imc-border)",
        }}
      >
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{
            background: streak > 0 ? "rgba(245,158,11,0.16)" : "rgba(148,163,184,0.14)",
            border: streak > 0 ? "1px solid rgba(245,158,11,0.28)" : "1px solid rgba(148,163,184,0.2)",
          }}
        >
          <Flame
            size={20}
            fill={streak > 0 ? "#D97706" : "none"}
            style={{ color: streak > 0 ? "#D97706" : "var(--imc-text-muted)" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black" style={{ color: "var(--imc-text)" }}>{title}</p>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            {subtitle}
          </p>
        </div>

        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB" }}
        >
          <Share2 size={15} />
        </span>
      </button>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-[26px] px-4 py-4"
      style={{ background: "linear-gradient(135deg, #12141C 0%, #2E2A8F 100%)" }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.16)" }} />

      <div className="relative flex items-center gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: streak > 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)" }}
        >
          <Flame
            size={26}
            fill={streak > 0 ? "#ffffff" : "none"}
            style={{ color: streak > 0 ? "#ffffff" : "rgba(255,255,255,0.35)" }}
            strokeWidth={2.3}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-[26px] font-semibold leading-none text-white">
              {streak}
            </span>
            <span className="text-[12px] font-black text-white/70">
              {streak === 1 ? "day streak" : "day streak"}
            </span>
          </div>

          <p className="mt-1 text-[11px] font-semibold text-white/45">
            {postedToday
              ? `Nice — today's update is in. Best run: ${longestStreak} days.`
              : streak > 0
              ? "Share a learning today to keep it alive."
              : "Post your first Learning of the Day to start one."}
          </p>
        </div>

        <button
          type="button"
          onClick={onShare}
          disabled={streak === 0}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full active:scale-95 disabled:opacity-30"
          style={{ background: "rgba(255,255,255,0.16)", color: "#ffffff" }}
          aria-label="Share your streak"
        >
          <Share2 size={17} />
        </button>
      </div>
    </section>
  );
}

export default StreakCard;
