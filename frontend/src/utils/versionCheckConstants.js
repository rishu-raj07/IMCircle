// Shared between main.jsx (fires the event) and useVersionCheck.js (listens
// for it) — kept in its own tiny file so neither has to import the other.
export const SW_NEEDS_REFRESH_EVENT = "imc:sw-needs-refresh";

// 5 minutes — frequent enough to catch a deploy within one session without
// hammering the endpoint (it's also hit on every tab focus/visibility
// change, which covers the common "left the tab open overnight" case
// immediately rather than waiting out the interval).
export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
