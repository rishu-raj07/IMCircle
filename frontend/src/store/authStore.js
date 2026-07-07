import {
  getUser,
  removeAuthData,
  setAccessToken,
  setUser,
  isAuthSessionValid,
} from "../utils/storage";
import { trackEvent } from "../utils/analyticsTracker";

// Every successful login/register path (mobile OTP, email/password, Google)
// converges on this one function, so it's the single choke point to fire a
// "login" analytics event from — rather than instrumenting each auth entry
// point separately and risking missing one.
export const saveLoginData = (data) => {
  if (data?.accessToken) {
    setAccessToken(data.accessToken);
  }

  if (data?.user) {
    setUser(data.user);
  }

  trackEvent("login", {
    entityType: "user",
    entityId: data?.user?._id || data?.user?.id,
    metadata: { method: data?.method || "unknown" },
  }).catch(() => {});
};

export const logoutUser = () => {
  trackEvent("logout").catch(() => {});
  removeAuthData();
};

export const isAuthenticated = () => {
  return isAuthSessionValid();
};

export const currentUser = () => {
  return getUser();
};