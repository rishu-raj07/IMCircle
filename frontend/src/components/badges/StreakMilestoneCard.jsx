import { Flame, Trophy, Gem } from "lucide-react";

import { STREAK_BADGE_META } from "../../utils/badges";

const TIER_ICONS = {
  copper: Flame,
  bronze: Flame,
  gold: Trophy,
  diamond: Gem,
};

function StreakMilestoneCard({ tier, streak = 0 }) {
  const meta = STREAK_BADGE_META[tier];

  if (!meta) return null;

  const Icon = TIER_ICONS[tier] || Flame;

  return (
    <div
      className="overflow-hidden rounded-[24px] p-4 shadow-[0_10px_24px_rgba(18,20,28,0.18)]"
      style={{ background: meta.gradient }}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/25">
          <Icon size={24} color="#fff" strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-tight text-white">
            {meta.label}
          </p>
          <p className="mt-0.5 text-[11.5px] font-bold text-white/85">
            {meta.description} &middot; Best streak {streak} days
          </p>
        </div>
      </div>
    </div>
  );
}

export default StreakMilestoneCard;
