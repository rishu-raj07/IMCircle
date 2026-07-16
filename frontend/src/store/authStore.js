import {
  getUser,
  removeAuthData,
  setAccessToken,
  setUser,
  isAuthSessionValid,
  clearPushToken,
} from "../utils/storage";
import { trackEvent } from "../utils/analyticsTracker";
import { syncPushTokenAfterLogin } from "../utils/pushNotifications";
import { clearReferralCode } from "../utils/referral";

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

  // If a push token was captured on this device before the user logged
  // in (see pushNotifications.js — it's deliberately withheld from the
  // backend while unauthenticated to avoid a 401), send it now that
  // there's a real session. No-op on web / no cached token.
  syncPushTokenAfterLogin();

  // The referral code (if any) has now done its job — the backend already
  // attributed it to `referredBy` if this was a brand-new account. Clearing
  // it here (rather than right after capture) means it survives the whole
  // multi-screen OTP flow but doesn't linger and risk being replayed on a
  // later, unrelated login on the same device.
  clearReferralCode();
};

export const logoutUser = () => {
  trackEvent("logout").catch(() => {});
  removeAuthData();
  // Only clears the locally-cached token here — the actual "stop pushing
  // to this device" API call must happen *before* the session's auth
  // cookies are invalidated (see utils/pushNotifications.js's
  // unregisterPushToken, called explicitly ahead of logoutApi() at each
  // logout call site), otherwise it'd fail as an unauthenticated request.
  clearPushToken();
};

export const isAuthenticated = () => {
  return isAuthSessionValid();
};

export const currentUser = () => {
  return getUser();
};
