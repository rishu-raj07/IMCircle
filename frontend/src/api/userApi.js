import api from "./axios";

export const getUserByUsername = async (username) => {
  const res = await api.get(`/users/${username}`);
  return res.data;
};

export const getUserById = async (userId) => {
  const res = await api.get(`/users/id/${userId}`);
  return res.data;
};

export const getUserSuggestions = async () => {
  const res = await api.get("/users/suggestions");
  return res.data;
};

export const matchContacts = async (contacts = []) => {
  const res = await api.post("/users/contacts/match", { contacts });
  return res.data;
};

// Real name/username/skill search against the backend — unlike suggestions,
// this can surface any user regardless of whether they were preloaded, e.g.
// typing an exact username like "rishuraj07". Backend requires 2+ chars.
export const searchUsers = async (query) => {
  const q = (query || "").trim();
  if (q.length < 2) return { success: true, count: 0, users: [] };

  const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
  return res.data;
};

export const getUserFollowersById = async (userId) => {
  const res = await api.get(`/users/${userId}/followers`);
  return res.data;
};

export const getUserFollowingById = async (userId) => {
  const res = await api.get(`/users/${userId}/following`);
  return res.data;
};

// Unlike followers/following, this is gated server-side — the backend
// returns 403 with `requiresCircle: true` if the caller isn't already in
// the target user's Circle (or isn't the owner). Callers should catch that
// and prompt to send a Circle request instead of treating it as a hard error.
export const getUserCircleById = async (userId) => {
  const res = await api.get(`/users/${userId}/circle`);
  return res.data;
};

export const followUserById = async (userId) => {
  const res = await api.patch(`/users/${userId}/follow`);
  return res.data;
};

export const unfollowUserById = async (userId) => {
  const res = await api.patch(`/users/${userId}/unfollow`);
  return res.data;
};

export const removeFollowerById = async (userId) => {
  const res = await api.delete(`/users/${userId}/follower`);
  return res.data;
};

export const removeCircleUserById = async (userId) => {
  const res = await api.delete(`/users/${userId}/circle`);
  return res.data;
};
export const addToCircleById = async (userId) => {
  const res = await api.patch(`/users/${userId}/circle`);
  return res.data;
};

// Add/verify a mobile number on the current user's own account (My Account
// page) — distinct from the login/signup mobile OTP flow.
export const sendProfileMobileOtp = async (mobile) => {
  const res = await api.post("/users/me/mobile/send-otp", { mobile });
  return res.data;
};

export const verifyProfileMobileOtp = async (mobile, otp) => {
  const res = await api.post("/users/me/mobile/verify-otp", { mobile, otp });
  return res.data;
};

export const blockUserById = async (userId) => {
  const res = await api.patch(`/users/${userId}/block`);
  return res.data;
};

export const unblockUserById = async (userId) => {
  const res = await api.patch(`/users/${userId}/unblock`);
  return res.data;
};

export const getBlockedUsers = async () => {
  const res = await api.get("/users/me/blocked");
  return res.data;
};

export const reportUserById = async (userId, reason) => {
  const res = await api.post(`/users/${userId}/report`, { reason });
  return res.data;
};
