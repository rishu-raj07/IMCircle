import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// A short, premium-feeling animated handoff from Capacitor's native splash
// screen into the app. The native splash (capacitor.config.ts) shows first
// and auto-hides quickly — just long enough to cover the WebView's initial
// blank frame — then this overlay takes over with the actual "designed"
// intro: the logo settles in with a soft scale + fade, holds for a beat,
// then fades out to reveal the real app underneath (already mounted behind
// it, so there's no extra loading flash once this disappears).
//
// Background color intentionally matches both the native splash
// (capacitor.config.ts SplashScreen.backgroundColor) and colors.xml's
// splashBackground so the handoff between native splash -> this overlay
// -> app content is seamless with no color flash.
const HOLD_MS = 750;
const FADE_OUT_S = 0.35;

function SplashIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_OUT_S, ease: "easeOut" }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#FFFCF7]"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashIntro;
