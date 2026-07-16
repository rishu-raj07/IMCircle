import {
  Sparkles,
  Medal,
  Trophy,
  GraduationCap,
  Rocket,
  Flame,
  HeartHandshake,
  Star,
  BadgeCheck,
  PenSquare,
  Code2,
  Palette,
  BookOpen,
  TrendingUp,
} from "lucide-react";

import { BADGE_TIER_META } from "../../utils/badges";

// Backend badge/spotlight catalogs ship `icon` as a plain string (see
// backend/src/constants/badgeCatalog.js) so metadata can travel over JSON —
// this is where that string gets resolved back into an actual icon.
const ICON_MAP = {
  Sparkles,
  Medal,
  Trophy,
  GraduationCap,
  Rocket,
  Flame,
  HeartHandshake,
  Star,
  BadgeCheck,
  PenSquare,
  Code2,
  Palette,
  BookOpen,
  TrendingUp,
};

// Small, prestigious inline badge — used beside a username in feed cards,
// search results, and the profile header. `compact` renders icon-only
// (for tight rows); otherwise it shows icon + label as a pill.
function BadgeChip({ badge, compact = false, size = 16 }) {
  if (!badge) return null;

  const Icon = ICON_MAP[badge.icon] || Sparkles;
  const meta = BADGE_TIER_META[badge.tier] || BADGE_TIER_META.silver;

  if (compact) {
    return (
      <span
        title={badge.label}
        className="grid shrink-0 place-items-center rounded-full"
        style={{
          width: size + 8,
          height: size + 8,
          background: meta.gradient,
          boxShadow: `0 1px 4px ${meta.ring}55`,
        }}
      >
        <Icon size={size * 0.6} color="#fff" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      title={badge.description || badge.label}
      className="inline-flex shrink-0 items-center gap-1 rounded-full py-1 pl-1 pr-2.5"
      style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)" }}
    >
      <span
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
        style={{ background: meta.gradient }}
      >
        <Icon size={11} color="#fff" strokeWidth={2.5} />
      </span>
      <span className="text-[10.5px] font-black" style={{ color: "var(--imc-text)" }}>
        {badge.label}
      </span>
    </span>
  );
}

export { ICON_MAP };
export default BadgeChip;
