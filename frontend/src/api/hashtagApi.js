import api from "./axios";

export const getTrendingHashtags = async (limit) => {
  const res = await api.get("/hashtags/trending", { params: { limit } });
  return res.data;
};

export const searchHashtags = async (q) => {
  const res = await api.get("/hashtags/search", { params: { q } });
  return res.data;
};

export const getHashtagFeed = async (tag, params = {}) => {
  const res = await api.get(`/hashtags/${encodeURIComponent(tag)}`, { params });
  return res.data;
};
