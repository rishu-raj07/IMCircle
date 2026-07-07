// Rank badges — permanent "early member" tiers based on signup order.
// Colours here are fixed "trophy metal" hues (like the app's marigold/indigo
// brand accents) and intentionally do NOT flip between light/dark theme.
export const RANK_BADGE_META = {
  top10: {
    label: "Top 10",
    fullLabel: "Top 10 Member",
    gradient: "linear-gradient(135deg, #FFE7A0 0%, #EC9A1E 55%, #8A5A12 100%)",
    ring: "#EC9A1E",
    tooltip: (rank) =>
      `You're member #${rank || "?"} — one of the first 10 people to ever join IMCircle.`,
  },
  top100: {
    label: "Top 100",
    fullLabel: "Top 100 Member",
    gradient: "linear-gradient(135deg, #ABA2FF 0%, #4338CA 55%, #2E2A8F 100%)",
    ring: "#4338CA",
    tooltip: (rank) =>
      `You're member #${rank || "?"} — one of the first 100 people to ever join IMCircle.`,
  },
  top1000: {
    label: "Top 1000",
    fullLabel: "Top 1000 Member",
    gradient: "linear-gradient(135deg, #DCE1E8 0%, #8B93A1 55%, #5B626E 100%)",
    ring: "#8B93A1",
    tooltip: (rank) =>
      `You're member #${rank || "?"} — one of the first 1000 people to ever join IMCircle.`,
  },
};

// Streak-milestone cards — permanent achievements based on the longest
// streak a person has ever reached, so a broken streak never takes a card
// away once it's been earned.
export const STREAK_BADGE_META = {
  copper: {
    label: "Copper Streak",
    days: 50,
    gradient: "linear-gradient(135deg, #E8B98F 0%, #B87333 55%, #7A4A1F 100%)",
    description: "50-day streak completed",
  },
  bronze: {
    label: "Bronze Streak",
    days: 100,
    gradient: "linear-gradient(135deg, #F0C29A 0%, #C97B3D 55%, #8A5A2A 100%)",
    description: "100-day streak completed",
  },
  gold: {
    label: "Gold Streak",
    days: 182,
    gradient: "linear-gradient(135deg, #FFF3C4 0%, #EC9A1E 55%, #B8790F 100%)",
    description: "Half-a-year streak completed",
  },
  diamond: {
    label: "Diamond Streak",
    days: 365,
    gradient:
      "linear-gradient(135deg, #CFF6FF 0%, #6DD5F0 35%, #6366F1 70%, #8B3FE8 100%)",
    description: "365-day streak completed — our most premium tier",
  },
};

export function getStreakBadgeTier(longestStreak = 0) {
  const streak = Number(longestStreak) || 0;

  if (streak >= 365) return "diamond";
  if (streak >= 182) return "gold";
  if (streak >= 100) return "bronze";
  if (streak >= 50) return "copper";
  return null;
}
