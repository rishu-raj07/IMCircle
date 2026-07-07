import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const createLearning = async (formData) => {
  const optimizedFormData =
    formData instanceof FormData
      ? await compressFormDataImages(formData, "learning")
      : formData;

  const res = await api.post("/learnings", optimizedFormData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const getLearnings = async (params = {}) => {
  const res = await api.get("/learnings", { params });
  return res.data;
};

export const getSingleLearning = async (learningId) => {
  const res = await api.get(`/learnings/${learningId}`);
  return res.data;
};

export const getMyLearnings = async (params = {}) => {
  const res = await api.get("/learnings/my", { params });
  return res.data;
};

export const getUserLearnings = async (userId) => {
  const res = await api.get(`/learnings/user/${userId}`);
  return res.data;
};

export const likeLearning = async (learningId) => {
  const res = await api.patch(`/learnings/${learningId}/like`);
  return res.data;
};

export const unlikeLearning = async (learningId) => {
  const res = await api.patch(`/learnings/${learningId}/unlike`);
  return res.data;
};

export const repostLearning = async (learningId, caption = "") => {
  const res = await api.post(`/learnings/${learningId}/repost`, { caption });
  return res.data;
};

export const shareLearning = async (learningId) => {
  const res = await api.patch(`/learnings/${learningId}/share`);
  return res.data;
};

export const saveLearning = async (learningId) => {
  const res = await api.patch(`/learnings/${learningId}/save`);
  return res.data;
};

export const unsaveLearning = async (learningId) => {
  const res = await api.patch(`/learnings/${learningId}/unsave`);
  return res.data;
};

export const commentLearning = async (learningId, text) => {
  const res = await api.post(`/learnings/${learningId}/comment`, { text });
  return res.data;
};

export const getLearningComments = async (learningId) => {
  const res = await api.get(`/learnings/${learningId}/comments`);
  return res.data;
};

export const deleteLearning = async (learningId) => {
  const res = await api.delete(`/learnings/${learningId}`);
  return res.data;
};
export const viewLearning = async (learningId) => {
  const res = await api.post(`/learnings/${learningId}/view`);
  return res.data;
};

export const getLearningViewers = async (learningId) => {
  const res = await api.get(`/learnings/${learningId}/viewers`);
  return res.data;
};

export const getLearningActivity = async (learningId) => {
  const res = await api.get(`/learnings/${learningId}/activity`);
  return res.data;
};
