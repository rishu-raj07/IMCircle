import { useCallback, useEffect, useState } from "react";
import { getVersionInfo } from "../api/metaApi";
import { SW_NEEDS_REFRESH_EVENT, VERSION_CHECK_INTERVAL_MS } from "../utils/versionCheckConstants";

// Compares what's actually running (baked into the bundle at build time —
// see vite.config.js's `define`) against what the backend currently serves
// (GET /api/meta/version). A mismatch means this tab/app is running an
// older build than what's deployed — the classic "why does it still show
// the old thing" support complaint, now detectable instead of guessed at.
//
// Polls on an interval + on focus/visibility (same pattern used by the
// Notifications page) rather than depending solely on the service worker's
// own update signal — the SW only exists on web, and even there, "never
// rely on just one mechanism" is the same defensive principle the
// Socket.io notification work in this app already follows.
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState(null);

  const checkNow = useCallback(async () => {
    try {
      const info = await getVersionInfo();
      setLatestVersionInfo(info);

      const runningVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";
      if (runningVersion && info?.frontendVersion && info.frontendVersion !== runningVersion) {
        setUpdateAvailable(true);
      }
    } catch {
      // best-effort — a failed check just means we try again next interval,
      // never surfaces as an error to the user
    }
  }, []);

  useEffect(() => {
    checkNow();

    const interval = window.setInterval(checkNow, VERSION_CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") checkNow();
    };

    // Fired by main.jsx's registerSW({ onNeedRefresh }) the moment a new
    // service worker has finished installing and is waiting to activate —
    // a much faster web-specific signal than waiting for the next poll.
    const onSwNeedsRefresh = () => setUpdateAvailable(true);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkNow);
    window.addEventListener(SW_NEEDS_REFRESH_EVENT, onSwNeedsRefresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkNow);
      window.removeEventListener(SW_NEEDS_REFRESH_EVENT, onSwNeedsRefresh);
    };
  }, [checkNow]);

  const applyUpdate = useCallback(() => {
    // If main.jsx's registerSW stashed an updateSW() function (web, a new
    // SW is actually waiting), use it — it activates the new SW and reloads
    // in one step. Otherwise (native, or no SW involved) a plain reload is
    // enough since there's no cache layer to invalidate first.
    if (typeof window.__imcUpdateServiceWorker === "function") {
      window.__imcUpdateServiceWorker();

      // Safety net: `updateAvailable` can also flip true purely from the
      // version-poll path (backend reports a newer version than this
      // bundle's baked-in __APP_VERSION__) even when there's no actual new
      // service worker waiting to activate yet — e.g. the backend deployed
      // fine but a frontend build failed partway through and never
      // published new static assets/sw.js. In that case updateSW(true) has
      // nothing to do and silently no-ops, leaving the button looking
      // broken ("I clicked Update and nothing happened"). If the page
      // hasn't already navigated away from a real SW activation within a
      // couple seconds, force a hard reload so this always gets the user
      // unstuck one way or another instead of leaving them stranded on a
      // stale bundle with a dead button.
      window.setTimeout(() => window.location.reload(), 2500);
    } else {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, latestVersionInfo, applyUpdate };
}
