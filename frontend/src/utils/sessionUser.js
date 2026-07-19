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

// A user only needs to pass through the MANDATORY part of onboarding once —
// the mandatory part is now just fullName + username (basicOnboardingCompleted
// in the product spec). `onboardingCompleted` is the authoritative flag set
// by the backend — see hasRequiredBasics() in
// backend/src/controllers/profile.controller.js, which this fallback must
// mirror exactly. This intentionally does NOT check gender, primaryInterest,
// dob, or location.city — those are all optional profile fields now, and
// requiring any of them here meant a user who skipped one (which the UI
// explicitly invites them to do via "Skip for now" / "(optional)" labels)
// could save successfully but still fail this check on every page load —
// since ProtectedRoute redirects to /profile-setup whenever this returns
// false, that was an unescapable redirect loop. The fallback (the
// fullName/username check) exists only for accounts created before
// onboardingCompleted/isProfileCompleted existed as fields.
export function isOnboardingComplete(user) {
  return Boolean(
    user?.onboardingCompleted ||
      user?.isProfileCompleted ||
      (user?.fullName && user.fullName !== "BN User" && user?.username)
  );
}

// Separate from the mandatory gate above — this is the "encourage, don't
// block" signal used for discoverability messaging (People recommendations,
// Discover eligibility, Search relevance, Circle recommendations) and for
// deciding whether to show the profile-completion nudge card on Home.
// Never used to gate route access.
//
// NOTE: the User schema (backend/src/models/User.js) stores a single
// `primaryInterest` string, not an `interests` array — this checks that
// field rather than a nonexistent `interests` array, since introducing a
// mismatched field name here would make this permanently false for every
// user and silently block a feature that already works.
export function hasDiscoverabilityBasics(user) {
  const location = user?.location;
  const hasLocation = Boolean(
    location?.city || location?.name || (typeof location === "string" && location.trim())
  );

  return Boolean(
    (user?.headline?.trim() || user?.tagline?.trim()) &&
      user?.primaryInterest?.trim() &&
      hasLocation
  );
}

// The publish-gate check. Used to also require tagline + interest +
// location before letting anyone post — that turned out to be the actual
// cause of a real bug report ("some users can't post"): location search
// was broken (India-only, fixed separately), so anyone it failed for was
// silently blocked from posting at all with no clear error, just a modal
// asking them to fill in a field they couldn't fill in. Narrowed to just
// requiring a username, which every account already has from signup (see
// [[hasDiscoverabilityBasics]] just above for the profile-completeness
// check other features still use — this one only gates publishing).
// Browsing, liking, replying, following, circle requests, search, and
// messages are NEVER gated by this — only publishing new content (posts,
// journey updates, learning posts, reposts with thoughts). See
// [[canPublishContent]] usage in CreatePost/CreateJourney/CreateLearning.
export function canPublishContent(profile) {
  return Boolean(profile?.username?.trim());
}
