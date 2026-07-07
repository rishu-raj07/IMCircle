import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initDeepLinks } from "../../utils/deepLinks";

// Mounted once near the app root (see App.jsx). No-ops entirely on web —
// only active inside the native Capacitor shell. See
// frontend/src/utils/deepLinks.js for the URL-to-route mapping and its
// documented limitations (post/opportunity have no dedicated page yet).
export default function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    initDeepLinks(navigate);
  }, [navigate]);

  return null;
}
