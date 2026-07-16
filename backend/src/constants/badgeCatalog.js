// Static catalog for the IMCircle badge engine (Growth OS "recognition"
// layer). Every badge a user can ever hold is listed here — the DB only
// ever stores *which* keys a user has earned (see models/UserBadge.js),
// never badge metadata itself, so relabelling/re-iconing a badge later is a
// one-line change here instead of a migration.
//
// `kind` controls how a badge gets awarded:
//   "auto"      — evaluated automatically by badge.service.js's
//                 evaluateAutoBadges(), no human in the loop.
//   "spotlight" — awarded by spotlight.service.js when a user wins any
//                 weekly Spotlight category.
//   "manual"    — awarded only by an admin from the Badges admin page,
//                 because the criteria genuinely need human judgement
//                 (e.g. "who has been most helpful this month").
export const BADGE_KINDS = {
  AUTO: "auto",
  SPOTLIGHT: "spotlight",
  MANUAL: "manual",
};

export const BADGE_CATALOG = [
  {
    key: "early_builder",
    label: "Early Builder",
    icon: "Sparkles",
    tier: "platinum",
    kind: BADGE_KINDS.AUTO,
    description: "Joined IMCircle among the very first 10 members.",
  },
  {
    key: "top_50_member",
    label: "Top 50 Member",
    icon: "Medal",
    tier: "gold",
    kind: BADGE_KINDS.AUTO,
    description: "One of the first 50 people to ever join IMCircle.",
  },
  {
    key: "top_100_member",
    label: "Top 100 Member",
    icon: "Medal",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "One of the first 100 people to ever join IMCircle.",
  },
  {
    key: "builder_of_week",
    label: "Builder of Week",
    icon: "Trophy",
    tier: "gold",
    kind: BADGE_KINDS.SPOTLIGHT,
    description: "Named Builder of the Week in the Spotlight rankings.",
  },
  {
    key: "learning_champion",
    label: "Learning Champion",
    icon: "GraduationCap",
    tier: "gold",
    kind: BADGE_KINDS.SPOTLIGHT,
    description: "Recognized for consistently sharing valuable learning.",
  },
  {
    key: "top_startup",
    label: "Top Startup",
    icon: "Rocket",
    tier: "gold",
    kind: BADGE_KINDS.SPOTLIGHT,
    description: "Building the standout startup of the week.",
  },
  {
    key: "day_100_journey",
    label: "100 Day Journey",
    icon: "Flame",
    tier: "gold",
    kind: BADGE_KINDS.AUTO,
    description: "Reached a 100-day journey streak.",
  },
  {
    key: "day_365_journey",
    label: "365 Day Journey",
    icon: "Flame",
    tier: "platinum",
    kind: BADGE_KINDS.AUTO,
    description: "Reached a full 365-day journey streak — our rarest tier.",
  },
  {
    key: "community_helper",
    label: "Community Helper",
    icon: "HeartHandshake",
    tier: "silver",
    kind: BADGE_KINDS.MANUAL,
    description: "Consistently helps other members grow.",
  },
  {
    key: "spotlight_winner",
    label: "Spotlight Winner",
    icon: "Star",
    tier: "gold",
    kind: BADGE_KINDS.SPOTLIGHT,
    description: "Has won a Spotlight category at least once.",
  },
  {
    key: "verified_builder",
    label: "Verified Builder",
    icon: "BadgeCheck",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "Identity or profile verified on IMCircle.",
  },
  {
    key: "founder",
    label: "Founder",
    icon: "Rocket",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "Building a startup or company as a founder.",
  },
  {
    key: "student_leader",
    label: "Student Leader",
    icon: "GraduationCap",
    tier: "silver",
    kind: BADGE_KINDS.MANUAL,
    description: "A standout, active member of the student community.",
  },
  {
    key: "creator",
    label: "Creator",
    icon: "PenSquare",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "Actively creating content in the Creator category.",
  },
  {
    key: "developer",
    label: "Developer",
    icon: "Code2",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "Building in tech with strong developer skills.",
  },
  {
    key: "designer",
    label: "Designer",
    icon: "Palette",
    tier: "silver",
    kind: BADGE_KINDS.AUTO,
    description: "Building in design with strong design skills.",
  },
];

export const BADGE_CATALOG_BY_KEY = BADGE_CATALOG.reduce((map, badge) => {
  map[badge.key] = badge;
  return map;
}, {});

export function isValidBadgeKey(key) {
  return Boolean(BADGE_CATALOG_BY_KEY[key]);
}
