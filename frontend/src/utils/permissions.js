// Shared helpers so every feature that touches a browser/native permission
// (location, microphone, camera) behaves the same way: ask once, respect a
// denial instead of re-prompting on every tap, and fall back cleanly when
// the Permissions API itself isn't available.
//
// Two layers of state are used together:
//  1. `navigator.permissions.query(...)` — the live, authoritative answer
//     when the browser/WebView supports it (Android WebView does; Safari
//     does not support 'microphone'/'camera' queries, only 'geolocation').
//  2. A localStorage record of the last outcome we personally observed —
//     used as a fallback where the live query is unsupported, and to avoid
//     hammering getUserMedia()/getCurrentPosition() again immediately after
//     a denial even on browsers where querying isn't available.
const STORAGE_PREFIX = "imcircle_permission_state_";

export function getStoredPermissionState(name) {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${name}`) || "unknown";
  } catch {
    return "unknown";
  }
}

export function setStoredPermissionState(name, state) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, state);
  } catch {
    // best-effort — non-critical
  }
}

// Returns 'granted' | 'denied' | 'prompt' | null (null = unsupported/unknown,
// caller should fall back to the stored state).
export async function queryPermissionState(name) {
  try {
    if (!navigator.permissions?.query) return null;

    const status = await navigator.permissions.query({ name });
    return status?.state || null;
  } catch {
    // Some browsers (Safari, some WebViews) throw for names they don't
    // recognize (e.g. 'microphone') instead of returning a status.
    return null;
  }
}

// Combines the live query with our own history so callers can decide
// whether it's worth prompting again without spamming the user. A denial
// is only considered "final" once both layers agree (or the live query is
// unsupported and our own history says denied) — if the user has since
// flipped the permission on in system settings, the live query will
// reflect that immediately and we'll ask again normally.
export async function shouldAttemptPermission(name) {
  const live = await queryPermissionState(name);

  if (live === "granted") return true;
  if (live === "denied") return false;
  if (live === "prompt") return true;

  // Live query unsupported/unknown — fall back to what we last observed
  // ourselves via a real getUserMedia/getCurrentPosition attempt.
  return getStoredPermissionState(name) !== "denied";
}
