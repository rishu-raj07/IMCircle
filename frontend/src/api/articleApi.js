import api from "./axios";

export const getArticles = async ({ cursor, limit = 10, category, tag, search, language, feed } = {}) => {
  const res = await api.get("/articles", {
    params: { cursor, limit, category, tag, search, language, feed },
  });
  return res.data;
};

export const getFeaturedArticles = async () => {
  const res = await api.get("/articles/featured");
  return res.data;
};

export const getArticleBySlug = async (slug) => {
  const res = await api.get(`/articles/${slug}`);
  return res.data;
};

export const getRelatedArticles = async (articleId) => {
  const res = await api.get(`/articles/${articleId}/related`);
  return res.data;
};

export const saveArticle = async (articleId) => {
  const res = await api.post(`/articles/${articleId}/save`);
  return res.data;
};

export const unsaveArticle = async (articleId) => {
  const res = await api.delete(`/articles/${articleId}/save`);
  return res.data;
};

export const shareArticle = async (articleId) => {
  const res = await api.post(`/articles/${articleId}/share`);
  return res.data;
};

export const recordArticleView = async (articleId) => {
  const res = await api.post(`/articles/${articleId}/view`);
  return res.data;
};

// --- Community Article authoring ---

export const createArticleDraft = async () => {
  const res = await api.post("/articles");
  return res.data;
};

export const getArticleForEdit = async (articleId) => {
  const res = await api.get(`/articles/${articleId}/edit`);
  return res.data;
};

export const updateArticleDraft = async (articleId, payload) => {
  const res = await api.patch(`/articles/${articleId}`, payload);
  return res.data;
};

export const publishArticle = async (articleId, { confirmOriginal } = {}) => {
  const res = await api.post(`/articles/${articleId}/publish`, { confirmOriginal });
  return res.data;
};

export const archiveArticle = async (articleId) => {
  const res = await api.post(`/articles/${articleId}/archive`);
  return res.data;
};

export const deleteArticleDraft = async (articleId) => {
  const res = await api.delete(`/articles/${articleId}`);
  return res.data;
};

export const getMyArticles = async (status) => {
  const res = await api.get("/articles/me", { params: { status } });
  return res.data;
};

export const getUserArticles = async (userId, status) => {
  const res = await api.get(`/users/${userId}/articles`, { params: { status } });
  return res.data;
};
