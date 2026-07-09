// Per-request step timer for diagnosing "which backend step is slow"
// without guessing. Usage:
//
//   const timer = startTimer("auth.googleLogin");
//   ... work ...
//   timer.step("verify_google_token");
//   ... more work ...
//   timer.step("user_lookup");
//   timer.done(); // logs total + a per-step breakdown
//
// Deliberately just console.log (structured, one line per step) — cheap
// enough to leave on in production for auth endpoints, and greppable in
// server logs by request label.
export function startTimer(label) {
  const start = process.hrtime.bigint();
  let last = start;
  const steps = [];

  return {
    step(name) {
      const now = process.hrtime.bigint();
      const stepMs = Number(now - last) / 1e6;
      const totalMs = Number(now - start) / 1e6;
      last = now;
      steps.push({ name, stepMs: Math.round(stepMs * 100) / 100 });
      console.log(
        `[perf] ${label} :: ${name} took ${stepMs.toFixed(1)}ms (total ${totalMs.toFixed(1)}ms)`
      );
      return stepMs;
    },
    done(extra) {
      const now = process.hrtime.bigint();
      const totalMs = Number(now - start) / 1e6;
      const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
      console.log(
        `[perf] ${label} :: TOTAL ${totalMs.toFixed(1)}ms — steps: ${steps
          .map((s) => `${s.name}=${s.stepMs}ms`)
          .join(", ")}${suffix}`
      );
      return totalMs;
    },
  };
}
