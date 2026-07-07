import api from "./axios";

export const getMyAnalyticsDashboard = async () => {
  const res = await api.get("/analytics/dashboard/me");
  return res.data;
};

export const getMyAnalytics = async () => {
  const res = await api.get("/analytics/me");
  return res.data;
};

export const getFollowerGrowthAnalytics = async () => {
  const res = await api.get("/analytics/followers/me");
  return res.data;
};

export const getMySearchAnalytics = async () => {
  const res = await api.get("/analytics/search/me");
  return res.data;
};

export const trackImpression = async ({ contentType, contentId, source }) => {
  const res = await api.post("/analytics/impression", {
    contentType,
    contentId,
    source,
  });
  return res.data;
};

export const trackProfileView = async (userId, source = "direct") => {
  const res = await api.post(`/analytics/profile-view/${userId}`, {
    source,
  });
  return res.data;
};

export const trackSearchEvent = async (data) => {
  const res = await api.post("/analytics/search", data);
  return res.data;
};