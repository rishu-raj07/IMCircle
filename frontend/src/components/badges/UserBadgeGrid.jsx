import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";

import { BADGE_TIER_META } from "../../utils/badges";
import { ICON_MAP } from "./BadgeChip";

// Full badge-catalog grid for a profile's "Badges" section — earned badges
// render at full tier color, unearned ones render dimmed with a lock, same
// pattern LinkedIn/Duolingo-style achievement grids use so a profile
// visibly communicates "there's more to earn here" instead of just listing
// what's already unlocked.
function UserBadgeGrid({ badges = [] }) {
  const [selected, setSelected] = useState(null);

  if (badges.length === 0) return null;

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
          Badges
        </h3>
        <span className="text-[11px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
          {earnedCount} of {badges.length} earned
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {badges.map((badge) => {
          const Icon = ICON_MAP[badge.icon] || Sparkles;
          const meta = BADGE_TIER_META[badge.tier] || BADGE_TIER_META.silver;

          return (
            <button
              key={badge.key}
              type="button"
              onClick={() => setSelected(badge)}
              className="flex flex-col items-center gap-1.5 active:scale-95"
            >
              <div
                className="relative grid h-14 w-14 place-items-center rounded-full"
                style={{
                  background: badge.earned ? meta.gradient : "var(--imc-surface-2)",
                  border: badge.earned ? "none" : "1px solid var(--imc-border)",
                  opacity: badge.earned ? 1 : 0.55,
                }}
              >
                <Icon size={22} color={badge.earned ? "#fff" : "var(--imc-text-muted)"} strokeWidth={2.2} />
                {!badge.earned && (
                  <span
                    className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2"
                    style={{ background: "var(--imc-surface)", color: "var(--imc-text-muted)", "--tw-ring-color": "var(--imc-bg)" }}
                  >
                    <Lock size={10} />
                  </span>
                )}
              </div>
              <span
                className="line-clamp-2 text-center text-[9.5px] font-black leading-tight"
                style={{ color: badge.earned ? "var(--imc-text)" : "var(--imc-text-muted)" }}
              >
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 px-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

            <div className="flex items-center gap-3">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
                style={{
                  background: selected.earned
                    ? (BADGE_TIER_META[selected.tier] || BADGE_TIER_META.silver).gradient
                    : "var(--imc-surface-2)",
                  opacity: selected.earned ? 1 : 0.6,
                }}
              >
                {(() => {
                  const Icon = ICON_MAP[selected.icon] || Sparkles;
                  return <Icon size={26} color={selected.earned ? "#fff" : "var(--imc-text-muted)"} strokeWidth={2.2} />;
                })()}
              </div>

              <div className="min-w-0">
                <h3 className="text-[17px] font-black text-[var(--imc-text)]">{selected.label}</h3>
                <p className="mt-1 text-[12.5px] font-bold leading-5 text-[var(--imc-text-muted)]">
                  {selected.description}
                </p>
                {!selected.earned && (
                  <p className="mt-1 text-[11px] font-black" style={{ color: "var(--imc-text-muted)" }}>
                    Not earned yet
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 h-12 w-full rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserBadgeGrid;
