import cron from "node-cron";

import { getISOWeekKey, generateWeeklySpotlight, publishWeek } from "./spotlight.service.js";

// Every Monday at 00:10 server time: the week that just ended (Mon-Sun,
// now complete) is generated from its full data and auto-published — this
// is what makes "Every week archives permanently" true without depending
// on someone remembering to log into the admin dashboard. Admins can still
// review and hand-edit winners any time before this runs;
// generateWeeklySpotlight never overwrites a category an admin already set
// (see its `setBy` guard), and re-running publishWeek on an already
// published week is a harmless no-op.
export function startSpotlightScheduler() {
  cron.schedule("10 0 * * 1", async () => {
    try {
      const justEndedWeekDate = new Date();
      justEndedWeekDate.setUTCDate(justEndedWeekDate.getUTCDate() - 1);
      const { weekKey: justEndedWeekKey } = getISOWeekKey(justEndedWeekDate);

      await generateWeeklySpotlight(justEndedWeekKey);
      await publishWeek(justEndedWeekKey);
    } catch (error) {
      console.error("[spotlightScheduler] weekly generation failed:", error?.message || error);
    }
  });
}
