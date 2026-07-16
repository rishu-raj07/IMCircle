// Growth OS referral engine (client side).
//
// A referral link is just an existing IMCircle URL with `?ref=<username>`
// appended (see PART 5/23 of the growth spec) — no separate /join route.
// Whoever lands on ANY page carrying that param has the code captured here
// once, at boot, and it rides along in localStorage through however many
// screens the signup flow takes (mobile OTP send -> verify, or a single
// Google tap) until account creation actually happens on the backend.
const STORAGE_KEY = "imcircle_referral_code";
const STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — matches typical referral-attribution windows

export function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    const cleaned = String(ref).trim().toLowerCase().slice(0, 30);
    if (!cleaned) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: cleaned, capturedAt: Date.now() }));
  } catch {
    // Best-effort — a failed capture just means no referral attribution,
    // never a broken app.
  }
}

export function getReferralCode() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw?.code || !raw?.capturedAt) return "";
    if (Date.now() - raw.capturedAt > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return "";
    }
    return raw.code;
  } catch {
    return "";
  }
}

export function clearReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  (window.location.hostname === "localhost" ? "https://imcircle.com" : window.location.origin)
).replace(/\/$/, "");

/** Builds this user's shareable referral link to their own profile. */
export function buildReferralLink(username) {
  if (!username) return PUBLIC_APP_URL;
  return `${PUBLIC_APP_URL}/profile/${encodeURIComponent(username)}?ref=${encodeURIComponent(username)}`;
}
