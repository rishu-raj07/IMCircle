import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../store/authStore";
import { getSessionUser, isOnboardingComplete } from "../../utils/sessionUser";

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getSessionUser();

  // First-time users must finish ONLY the mandatory part of profile setup —
  // full name + username — before they can reach any other part of the app.
  // Everything else (photo, DOB, gender, tagline, location, interest) is
  // optional and skippable; see isOnboardingComplete() for the exact check.
  // This check runs on every private route, not just right after login, so
  // a direct URL visit or refresh can't be used to skip it — but it also
  // can't get "stuck" on optional fields since those no longer gate it.
  if (!isOnboardingComplete(user) && location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

export default ProtectedRoute;