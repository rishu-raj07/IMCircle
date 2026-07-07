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
// once every required field (photo, username, dob, gender, tagline,
// location, interest) is filled in. The extra fallback checks exist so
// accounts created before this flag existed (already has headline/location/
// gender/username filled in) aren't forced back through the flow.
export function isOnboardingComplete(user) {
  return Boolean(
    user?.onboardingCompleted ||
      user?.isProfileCompleted ||
      (user?.headline && user?.location?.city && user?.gender && user?.username)
  );
}
