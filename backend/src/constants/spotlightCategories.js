// Weekly Spotlight category catalog — the "homepage of everything
// important happening inside IMCircle" (see Spotlight product brief).
// Each category maps to a scoring function in spotlight.service.js's
// CATEGORY_SCORERS. Adding a new category is: add the metadata here, add a
// matching scorer there.
export const SPOTLIGHT_CATEGORIES = [
  {
    key: "builder_of_week",
    label: "Builder of Week",
    icon: "Trophy",
    emoji: "🏆",
    badgeKey: "builder_of_week",
  },
  {
    key: "student_of_week",
    label: "Student of Week",
    icon: "GraduationCap",
    emoji: "🎓",
    badgeKey: "student_leader",
  },
  {
    key: "founder_of_week",
    label: "Startup of Week",
    icon: "Rocket",
    emoji: "🚀",
    badgeKey: "top_startup",
  },
  {
    key: "creator_of_week",
    label: "Creator of Week",
    icon: "PenSquare",
    emoji: "🎨",
    badgeKey: "creator",
  },
  {
    key: "developer_of_week",
    label: "Developer of Week",
    icon: "Code2",
    emoji: "💻",
    badgeKey: "developer",
  },
  {
    key: "designer_of_week",
    label: "Designer of Week",
    icon: "Palette",
    emoji: "🎨",
    badgeKey: "designer",
  },
  {
    key: "learning_of_week",
    label: "Learning Champion",
    icon: "BookOpen",
    emoji: "📚",
    badgeKey: "learning_champion",
  },
  {
    key: "biggest_milestone",
    label: "Journey Winner",
    icon: "Flame",
    emoji: "🔥",
    badgeKey: null,
  },
  {
    key: "rising_builder",
    label: "Rising Builder",
    icon: "TrendingUp",
    emoji: "⭐",
    badgeKey: null,
  },
  {
    key: "most_helpful_member",
    label: "Most Helpful Member",
    icon: "HeartHandshake",
    emoji: "💡",
    badgeKey: "community_helper",
  },
  {
    key: "consistency_streak",
    label: "Streak Leader",
    icon: "Zap",
    emoji: "⚡",
    badgeKey: null,
  },
];

export const SPOTLIGHT_CATEGORY_KEYS = SPOTLIGHT_CATEGORIES.map((c) => c.key);

export const SPOTLIGHT_CATEGORY_BY_KEY = SPOTLIGHT_CATEGORIES.reduce((map, category) => {
  map[category.key] = category;
  return map;
}, {});

export function isValidSpotlightCategory(key) {
  return Boolean(SPOTLIGHT_CATEGORY_BY_KEY[key]);
}
