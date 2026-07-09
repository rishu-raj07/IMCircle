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
export default function PushNotificationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    initPushNotifications(navigate);
  }, [navigate]);

  return null;
}
