import api from "./axios";

export const getForYouNews = async ({ cursor, limit = 10, category } = {}) => {
  const res = await api.get("/news/for-you", { params: { cursor, limit, category } });
  return res.data;
};

export const getArticles = async ({ cursor, limit = 10, category } = {}) => {
  const res = await api.get("/news/articles", { params: { cursor, limit, category } });
  return res.data;
};

export const getNewsCategories = async () => {
  const res = await api.get("/news/categories");
  return res.data;
};

export const getNewsById = async (newsId) => {
  const res = await api.get(`/news/${newsId}`);
  return res.data;
};

export const openNews = async (newsId) => {
  const res = await api.post(`/news/${newsId}/open`);
  return res.data;
};

export const saveNews = async (newsId) => {
  const res = await api.post(`/news/${newsId}/save`);
  return res.data;
};

export const unsaveNews = async (newsId) => {
  const res = await api.delete(`/news/${newsId}/save`);
  return res.data;
};

export const shareNews = async (newsId) => {
  const res = await api.post(`/news/${newsId}/share`);
  return res.data;
};

export const markNewsNotInterested = async (newsId) => {
  const res = await api.post(`/news/${newsId}/not-interested`);
  return res.data;
};

export const removeNewsNotInterested = async (newsId) => {
  const res = await api.delete(`/news/${newsId}/not-interested`);
  return res.data;
};
