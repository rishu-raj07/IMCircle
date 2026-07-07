import api from "./axios";

export const getFeed = async (params = {}) => {
  const res = await api.get("/feed", { params });
  return res.data;
};

export const trackFeedImpressions = async (items = []) => {
  const res = await api.post("/feed/impressions", { items });
  return res.data;
};