import { useCallback, useEffect, useRef, useState } from "react";
import { getVersionInfo } from "../api/metaApi";
import { IS_NATIVE } from "../config/platform";

// Native-only counterpart to useVersionCheck.js (which is web/PWA-only — a
// bundled APK can't hot-swap its JS the way a web tab can). This compares
// the app's OWN installed versionCode (read on-device via @capacitor/app)
// against the backend's latestVersionCode/minimumSupportedVersionCode/
// forceUpdate (see GET /api/meta/version), and decides whether to show an
// optional "update available" prompt or a non-dismissible required one.
const DISMISS_KEY_PREFIX = "imcircle_update_dismissed_v";
const DISMISS_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function useNativeUpdateCheck() {
  const [info, setInfo] = useState(null);
  const [installedVersionCode, setInstalledVersionCode] = useState(null);
  const [visible, setVisible] = useState(false);
  const checkedOnceRef = useRef(false);

  const checkNow = useCallback(async () => {
    if (!IS_NATIVE) return;

    try {
      const [{ App }, versionInfo] = await Promise.all([
        import("@capacitor/app"),
        getVersionInfo(),
      ]);

      const appInfo = await App.getInfo().catch(() => null);
      // `build` is the Android versionCode (as a string) / iOS build number.
      const installed = Number(appInfo?.build) || null;

      setInfo(versionInfo);
      setInstalledVersionCode(installed);

      if (!installed || !versionInfo) return;

      const latest = Number(versionInfo.latestVersionCode) || 0;
      const minimum = Number(versionInfo.minimumSupportedVersionCode) || 0;
      const updateAvailable = latest > installed;
      const updateRequired =
        (minimum > 0 && installed < minimum) || versionInfo.forceUpdate === true;

      if (!updateAvailable && !updateRequired) return;

      if (updateRequired) {
        setVisible(true);
        return;
      }

      // Optional update — respect a per-version dismissal, snoozed for
      // ~24h rather than forever, so it resurfaces as a gentle reminder.
      const dismissKey = `${DISMISS_KEY_PREFIX}${latest}`;
      const dismissedAt = Number(localStorage.getItem(dismissKey)) || 0;
      const stillSnoozed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_SNOOZE_MS;

      if (!stillSnoozed) setVisible(true);
    } catch {
      // Best-effort — never blocks app usage if the check itself fails
      // (offline, plugin unavailable, endpoint down, etc).
    }
  }, []);

  useEffect(() => {
    if (!IS_NATIVE) return undefined;

    // Check once on launch.
    checkNow();
    checkedOnceRef.current = true;

    // Check again whenever the app returns from background — the spec's
    // "check when app returns from background" requirement. Does NOT poll
    // on an interval or reload anything, so this can't create a render
    // loop or repeatedly interrupt the person mid-session.
    let removeListener;
    import("@capacitor/app")
      .then(({ App }) => {
        const handle = App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) checkNow();
        });
        removeListener = () => handle.remove?.();
      })
      .catch(() => {});

    return () => removeListener?.();
  }, [checkNow]);

  const dismiss = useCallback(() => {
    if (info?.latestVersionCode) {
      localStorage.setItem(
        `${DISMISS_KEY_PREFIX}${info.latestVersionCode}`,
        String(Date.now())
      );
    }
    setVisible(false);
  }, [info]);

  const openStore = useCallback(async () => {
    const playStoreUrl =
      info?.playStoreUrl || "https://play.google.com/store/apps/details?id=com.imcircle.app";
    const marketUrl = "market://details?id=com.imcircle.app";

    // Try the native Play Store app first (market://) — nicer experience,
    // opens directly in the Play Store app instead of a browser tab. Falls
    // back to the https:// URL (opens in-browser, or hands off to the Play
    // Store app anyway on most Android configurations) if that fails.
    try {
      window.location.href = marketUrl;
    } catch {
      window.location.href = playStoreUrl;
    }

    // Belt-and-braces: if market:// silently no-ops (no Play Store app
    // available, e.g. some emulators), still land on the https:// link
    // shortly after.
    window.setTimeout(() => {
      window.location.href = playStoreUrl;
    }, 800);
  }, [info]);

  const updateRequired = Boolean(
    info &&
      installedVersionCode &&
      (((Number(info.minimumSupportedVersionCode) || 0) > 0 &&
        installedVersionCode < Number(info.minimumSupportedVersionCode)) ||
        info.forceUpdate === true)
  );

  return {
    visible: IS_NATIVE && visible,
    updateRequired,
    info,
    dismiss,
    openStore,
  };
}
