import cron from "node-cron";
import { ingestAllNewsSources } from "./news/newsIngestion.service.js";

const DEFAULT_INTERVAL_MINUTES = 60;

function getIntervalMinutes() {
  const configured = Number(process.env.NEWS_INGESTION_INTERVAL_MINUTES);
  if (!Number.isFinite(configured) || configured < 5 || configured > 360) {
    return DEFAULT_INTERVAL_MINUTES;
  }
  return Math.round(configured);
}

// This app runs as a single Node process (see server.js — no PM2 cluster
// config), so a plain node-cron schedule is safe here: there's only ever
// one process that could run it, unlike a multi-worker deployment where
// the same cron.schedule() would fire once per worker. If this is ever
// moved behind PM2 cluster mode / multiple instances, this needs a
// distributed lock (Mongo-based, e.g. a TTL'd lock document) before that
// happens — otherwise every instance ingests on every tick.
export function startNewsIngestionScheduler() {
  if (process.env.NEWS_INGESTION_ENABLED === "false") {
    console.log("[newsIngestionScheduler] Disabled via NEWS_INGESTION_ENABLED=false");
    return;
  }

  const intervalMinutes = getIntervalMinutes();

  cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
    try {
      await ingestAllNewsSources();
    } catch (error) {
      console.error("[newsIngestionScheduler] Scheduled run failed:", error?.message || error);
    }
  });

  console.log(`[newsIngestionScheduler] Scheduled every ${intervalMinutes} minute(s).`);

  // Also run once immediately on boot (fire-and-forget, never blocks
  // startup) — otherwise a fresh deploy/restart shows an empty News feed
  // for up to a full interval before the first tick.
  ingestAllNewsSources().catch((error) => {
    console.error("[newsIngestionScheduler] Initial run failed:", error?.message || error);
  });
}
