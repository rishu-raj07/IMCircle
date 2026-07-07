import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../store/authStore";
import { getSessionUser, isOnboardingComplete } from "../../utils/sessionUser";

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getSessionUser();

  // First-time users must finish the mandatory profile setup (photo,
  // username, DOB, gender, tagline, location, interest) before they can
  // reach any other part of the app. This check runs on every private
  // route, not just right after login, so a direct URL visit or refresh
  // can't be used to skip it.
  if (!isOnboardingComplete(user) && location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

export default ProtectedRoute;