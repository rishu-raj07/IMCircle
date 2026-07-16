import api from "./axios";

export const getSpotlightCategories = async () => {
  const res = await api.get("/spotlight/categories");
  return res.data;
};

export const getCurrentSpotlight = async () => {
  const res = await api.get("/spotlight/current");
  return res.data;
};

export const getSpotlightNav = async (count = 12) => {
  const res = await api.get("/spotlight/nav", { params: { count } });
  return res.data;
};

export const getSpotlightWeek = async (weekKey) => {
  const res = await api.get(`/spotlight/weeks/${weekKey}`);
  return res.data;
};

export const upvoteSpotlightWinner = async (weekKey, category) => {
  const res = await api.post(`/spotlight/weeks/${weekKey}/${category}/upvote`);
  return res.data;
};

// Real cross-user leaderboard — distinct people ranked by activity score
// (streak/referrals/consistency), not one row per category.
export const getSpotlightTopActive = async (weekKey, limit = 12) => {
  const res = await api.get(`/spotlight/weeks/${weekKey}/top-active`, { params: { limit } });
  return res.data;
};

export const getSpotlightArchive = async ({ limit, before } = {}) => {
  const res = await api.get("/spotlight/weeks", { params: { limit, before } });
  return res.data;
};

export const getUserSpotlightWins = async (userId) => {
  const res = await api.get(`/spotlight/user/${userId}`);
  return res.data;
};

export const submitSpotlightNomination = async (payload) => {
  const res = await api.post("/spotlight/nominate", payload);
  return res.data;
};

export const getMyNominations = async () => {
  const res = await api.get("/spotlight/nominations/mine");
  return res.data;
};
