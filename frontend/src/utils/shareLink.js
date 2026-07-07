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
