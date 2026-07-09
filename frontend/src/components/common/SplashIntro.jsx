import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { perfMark } from "../../utils/perfLog.js";

// A short, premium-feeling animated handoff from Capacitor's native splash
// screen into the app. The native splash (capacitor.config.ts) shows first
// and auto-hides quickly — just long enough to cover the WebView's initial
// blank frame — then this overlay takes over with the actual "designed"
// intro: the logo settles in with a soft scale + fade, a one-line brand
// message follows a beat later, then both fade out to reveal the real app
// underneath (already mounted behind it, so there's no extra loading flash
// once this disappears).
//
// Background color intentionally matches both the native splash
// (capacitor.config.ts SplashScreen.backgroundColor) and colors.xml's
// splashBackground so the handoff between native splash -> this overlay
// -> app content is seamless with no color flash.
//
// HOLD_MS + FADE_OUT_S is a fixed, synchronous setTimeout — it never waits
// on network/auth/anything async — so total splash time is always
// HOLD_MS + FADE_OUT_S*1000 (~1.5s) regardless of device speed or backend
// latency, well inside the ≤2s budget. If the splash is ever seen lasting
// "several seconds", this component isn't the cause — see perf logs for
// app_boot_start vs splash_intro_hide_timer_fired to confirm.
const HOLD_MS = 1150;
const FADE_OUT_S = 0.35;

// Android can silently reload the WebView's JS/renderer (not the whole
// Activity) after it's been backgrounded by an external system UI — most
// visibly, Google's native "Checking info..." Credential Manager screen
// during Google Sign-In. When that happens, main.jsx re-runs from scratch
// and this component remounts, replaying the full intro even though the
// user never actually relaunched the app — that's the rapid repeat splash
// seen around Google Sign-In, not a bug in the login flow itself (verified:
// nothing in the auth code path calls location.reload/href).
//
// sessionStorage survives that kind of same-session WebView reload (it's
// backed by the browser process, not the renderer), so it's used here to
// play this intro at most once per app session instead of every time the
// WebView happens to reload underneath the user.
const SESSION_FLAG = "imcircle_splash_shown";

function hasShownThisSession() {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "true";
  } catch {
    return false; // sessionStorage unavailable — fail open, show the intro
  }
}

function markShownThisSession() {
  try {
    sessionStorage.setItem(SESSION_FLAG, "true");
  } catch {
    // Ignore — worst case the intro can replay once more than intended.
  }
}

function SplashIntro() {
  const [visible, setVisible] = useState(() => !hasShownThisSession());

  useEffect(() => {
    if (!visible) return undefined;

    perfMark("splash_intro_mounted");
    const timer = setTimeout(() => {
      perfMark("splash_intro_hide_timer_fired");
      markShownThisSession();
      setVisible(false);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence onExitComplete={() => perfMark("splash_intro_exit_complete")}>
      {visible && (
        <motion.div
          key="splash-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_OUT_S, ease: "easeOut" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-[#FFFCF7]"
          aria-hidden="true"
        >
          <motion.img
            src="/logo.png"
            alt=""
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-[58%] max-w-[240px] object-contain"
          />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="px-8 text-center text-[13px] font-semibold text-[var(--imc-text-muted)]"
          >
            Your circle decides your future — find your right circle on IMCircle.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashIntro;
