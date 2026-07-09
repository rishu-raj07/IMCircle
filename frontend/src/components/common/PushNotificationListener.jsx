import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initPushNotifications } from "../../utils/pushNotifications";

// Mounted once near the app root (see App.jsx), same pattern as
// DeepLinkListener. No-ops entirely on web and on a fresh un-authenticated
// screen doesn't matter either way — registering a push token without a
// logged-in session simply fails the backend call harmlessly and gets
// retried the next time this mounts with a valid session (e.g. right
// after login, since App.jsx renders this above AppRoutes for the whole
// app lifetime, not just protected routes).
//
// The native "Allow notifications?" permission dialog is a separate
// Android Activity that takes focus away from the WebView — if it fires
// while SplashIntro's own fade-out timer/transition is still running
// (SplashIntro finishes ~1.5s after app open), the WebView's JS timers and
// CSS transitions can stall or stutter while backgrounded, which is what
// showed up as the splash logo getting stuck "vibrating" instead of
// cleanly handing off to the app underneath. Waiting until well after the
// splash has finished before ever requesting this permission avoids the
// two interrupting each other.
const NOTIFICATION_PROMPT_DELAY_MS = 2500;

export default function PushNotificationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = window.setTimeout(() => {
      initPushNotifications(navigate);
    }, NOTIFICATION_PROMPT_DELAY_MS);

    return () => window.clearTimeout(id);
  }, [navigate]);

  return null;
}
