import { getAccessToken, getUser } from "./storage";

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeUser(value) {
  return value?.user || value?.data?.user || value?.data || value || null;
}

function decodeJwt(token) {
  try {
    if (!token) return null;

    const payload = token.split(".")[1];
    if (!payload) return null;

    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getSessionUser() {
  const storedUser = getUser();
  if (storedUser) return storedUser;

  const keys = [
    "bn_user",
    "user",
    "currentUser",
    "authUser",
    "bharat_user",
    "bharatUser",
    "loggedInUser",
  ];

  for (const key of keys) {
    const parsed = normalizeUser(safeJsonParse(localStorage.getItem(key)));
    if (parsed) return parsed;
  }

  const decoded = decodeJwt(getAccessToken());
  if (!decoded) return null;

  return {
    _id: decoded.id || decoded._id || decoded.userId || decoded.sub,
    id: decoded.id || decoded._id || decoded.userId || decoded.sub,
    fullName: decoded.fullName,
    name: decoded.name,
    username: decoded.username,
    avatar: decoded.avatar,
    profileImage: decoded.profileImage,
    picture: decoded.picture,
    photo: decoded.photo,
  };
}

// A user only needs to pass through the mandatory first-login profile setup
// once. `onboardingCompleted` is the authoritative flag set by the backend
// once every required field is filled in — see hasRequiredBasics() in
// backend/src/controllers/profile.controller.js, which this fallback must
// mirror exactly: fullName (a real one, not the "BN User" placeholder every
// account is created with before setup), username, gender, and
// primaryInterest. The fallback exists only for accounts created before
// onboardingCompleted/isProfileCompleted existed as fields.
//
// NOTE: dob and location.city are deliberately NOT checked here, even
// though earlier versions of this function required both. Both are labeled
// "(optional)" in the profile setup form's own UI (BasicInfo.jsx /
// LocationField), but requiring them here meant a user who trusted that
// label and left either blank could save their profile successfully and
// still fail this check on every single page load — since ProtectedRoute
// redirects to /profile-setup whenever this returns false, that was an
// unescapable redirect loop for anyone who skipped either field.
export function isOnboardingComplete(user) {
  return Boolean(
    user?.onboardingCompleted ||
      user?.isProfileCompleted ||
      (user?.fullName &&
        user.fullName !== "BN User" &&
        user?.username &&
        user?.gender &&
        user?.primaryInterest)
  );
}
