// Lightweight startup/auth performance tracer.
//
// Purpose: answer "which step of app boot / Google login is actually slow"
// from real device logs (chrome://inspect or logcat) instead of guessing.
// Every mark is timestamped against the same origin (module load time) so
// the gap between any two marks is directly the milliseconds spent on
// whatever ran between them.
//
// Deliberately just console.log — no analytics/network call here, since a
// perf logger that itself makes the thing it's measuring slower defeats the
// point.
const ORIGIN = typeof performance !== "undefined" ? performance.now() : Date.now();

const since = () =>
  Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - ORIGIN);

let lastMark = 0;

export function perfMark(label, extra) {
  const t = since();
  const delta = t - lastMark;
  lastMark = t;

  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[perf] +${t}ms (Δ${delta}ms) ${label}${suffix}`);

  return t;
}

// For spans that don't happen in strict boot order (e.g. a network request
// that overlaps with other work) — returns a function that logs the elapsed
// time when called, without touching the shared `lastMark` timeline above.
export function perfSpan(label) {
  const start = since();

  return (extra) => {
    const end = since();
    const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
    console.log(`[perf] ${label} took ${end - start}ms${suffix}`);
    return end - start;
  };
}
