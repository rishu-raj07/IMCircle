import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  endAnalyticsSession,
  startAnalyticsSession,
  trackEvent,
} from "../../utils/analyticsTracker";

export default function AnalyticsTracker() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const screenStart = useRef(Date.now());

  // The admin panel is a separate product surface with its own auth/session
  // model — mixing admin screen views into the same user-activity analytics
  // stream would pollute the very dashboard the admin panel is trying to
  // report on, and could mis-attribute admin browsing to whichever regular
  // user account happens to be logged in in the same browser.
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) return;
    startAnalyticsSession();

    const activityEvents = ["click", "scroll", "keydown", "touchstart"];
    const markActivity = () => {
      localStorage.setItem("imcircle_last_activity_at", String(Date.now()));
    };

    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        endAnalyticsSession("background");
      } else {
        trackEvent("app_foreground");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", () => endAnalyticsSession("unload"));

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (isAdminRoute) return;

    const now = Date.now();
    const previous = previousPath.current;

    if (previous) {
      trackEvent("time_on_screen", {
        entityType: "screen",
        entityId: previous,
        metadata: { path: previous, durationMs: now - screenStart.current },
      });
    }

    trackEvent("screen_view", {
      entityType: "screen",
      entityId: location.pathname,
      metadata: { path: location.pathname },
    });

    previousPath.current = location.pathname;
    screenStart.current = now;
  }, [location.pathname]);

  return null;
}
