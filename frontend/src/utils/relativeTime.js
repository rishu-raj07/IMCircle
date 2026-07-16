// Single shared relative-time formatter (PART 12 of the growth spec) —
// "20 sec ago / 8 mins ago / 3 hrs ago / 6 days ago / 2 months ago / 1 year
// ago", applied consistently across posts, learning, replies, journey,
// messages, notifications, and milestones instead of each surface having
// its own slightly-different local formatTime().
//
// Deliberately never falls back to an absolute calendar date ("24 Aug
// 2026") no matter how old the timestamp is — everything stays relative,
// all the way up through years.
export function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now"; // clock skew guard

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return diffSec <= 1 ? "just now" : `${diffSec} sec ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export default formatRelativeTime;
