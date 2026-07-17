// A short, pleasant two-tone "ting" played whenever a real-time
// notification arrives (see TopHeader.jsx's `new_notification` socket
// listener) — the same kind of cue most social apps play, without needing
// to ship/license an actual audio file. Synthesized entirely via the Web
// Audio API (two quick sine-wave tones, a perfect fifth apart, with a fast
// attack and a short decay) so there's nothing to load, nothing to cache,
// and nothing that can 404.
let sharedContext = null;

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  // Reuse one context across every call instead of creating a fresh one
  // per notification — browsers cap the number of concurrent contexts, and
  // there's no reason to pay that setup cost repeatedly for something this
  // short-lived.
  if (!sharedContext) {
    sharedContext = new Ctx();
  }

  return sharedContext;
}

function playTone(ctx, frequency, startTime, duration) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // Fast attack, short exponential decay — a "ting" rather than a buzz or
  // a harsh click. Peak kept modest (0.2) so this never feels like an
  // alarm, closer to a soft chime.
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Best-effort and silent on failure by design — a notification sound must
// never throw or block the actual notification handling that triggered it.
// Common, harmless failure case: some browsers block audio until the user
// has interacted with the page at least once (autoplay policy); by the
// time a real-time notification arrives the user has almost always already
// tapped something, but this stays defensive regardless.
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.18); // A5
    playTone(ctx, 1318.51, now + 0.09, 0.22); // E6 — a fifth above, staggered slightly
  } catch {
    // Ignore — never let a sound failure surface as an app error.
  }
}
