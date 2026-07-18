// Shares an IMCircle profile/journey/learning link using the native share
// sheet inside the Capacitor app (@capacitor/share), falling back to the
// Web Share API, and finally to clipboard copy on browsers that support
// neither. Safe to call from any platform.

const SITE_URL = "https://imcircle.com";

export function buildShareUrl(kind, id) {
  const map = {
    user: `${SITE_URL}/u/${id}`,
    journey: `${SITE_URL}/journey/${id}`,
    learning: `${SITE_URL}/learning/${id}`,
    // Not yet backed by a real page (see deepLinks.js) — included so the
    // link shape is ready the moment a /post or /opportunity page ships.
    post: `${SITE_URL}/post/${id}`,
    opportunity: `${SITE_URL}/opportunity/${id}`,
  };
  return map[kind] || SITE_URL;
}

export async function shareLink({ kind, id, title, text }) {
  const url = buildShareUrl(kind, id);

  try {
    const { Share } = await import("@capacitor/share");
    const { value } = await Share.canShare();
    if (value) {
      await Share.share({ title, text, url, dialogTitle: title || "Share via" });
      return { method: "capacitor" };
    }
  } catch {
    // Not running inside the native shell, or plugin unavailable — fall
    // through to the web paths below.
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { method: "web-share" };
    } catch {
      // User cancelled the native share sheet — not an error.
      return { method: "cancelled" };
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard", url };
  }

  return { method: "unsupported", url };
}

// Shares the APP ITSELF (inviting someone to install IMCircle) — always the
// Play Store link, on every platform. Distinct from shareLink() above, which
// shares a specific piece of content (a profile/journey/etc URL).
//
// On native this has to go through the Capacitor Share plugin first:
// navigator.share is frequently unavailable inside the Android WebView, so
// any "share the app" button that only tried navigator.share (skipping
// Capacitor) would silently fall straight through to a clipboard copy on
// most Android devices — no share sheet ever appeared, even though the
// button visually looked like a share action. Both the top-right Profile
// share icon and Settings > Share App now call this single implementation
// so they can't drift out of sync with each other again.
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.imcircle.app";
const APP_SHARE_TEXT =
  "Join me on IMCircle — the social network for people who grow.\n\n" +
  "Build. Learn. Share your journey. Find your circle.\n\n" +
  "Download IMCircle:\n" +
  PLAY_STORE_URL;

export async function shareApp() {
  try {
    const { Share } = await import("@capacitor/share");
    const { value } = await Share.canShare();
    if (value) {
      await Share.share({
        title: "Join IMCircle",
        text: APP_SHARE_TEXT,
        dialogTitle: "Share IMCircle",
      });
      return { method: "capacitor" };
    }
  } catch {
    // Not running inside the native shell, or the plugin genuinely isn't
    // available — fall through to the web paths below.
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join IMCircle",
        text: "Join me on IMCircle — the social network for people who grow.",
        url: PLAY_STORE_URL,
      });
      return { method: "web-share" };
    } catch (error) {
      if (error?.name === "AbortError") return { method: "cancelled" };
      // Any other web-share failure — fall through to clipboard below.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(PLAY_STORE_URL);
      window.alert("IMCircle app link copied");
      return { method: "clipboard", url: PLAY_STORE_URL };
    } catch {
      // Clipboard API blocked — last resort, a manual copy prompt.
    }
  }

  window.prompt("Copy the IMCircle app link", PLAY_STORE_URL);
  return { method: "prompt", url: PLAY_STORE_URL };
}
