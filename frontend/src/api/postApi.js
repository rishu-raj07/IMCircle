import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const createPost = async (formData) => {
  const optimizedFormData =
    formData instanceof FormData
      ? await compressFormDataImages(formData, "post")
      : formData;

  const res = await api.post("/posts", optimizedFormData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Caption-only edit — media/purpose/visibility can't be changed after
// publish, only the text (matches the DM/community message edit pattern).
export const updatePost = async (postId, content) => {
  const res = await api.patch(`/posts/${postId}`, { content });
  return res.data;
};

export const likePost = async (postId) => {
  const res = await api.patch(`/posts/${postId}/like`);
  return res.data;
};

export const getPostLikers = async (postId) => {
  const res = await api.get(`/posts/${postId}/likes`);
  return res.data;
};

export const votePostPoll = async (postId, optionIndex) => {
  const res = await api.patch(`/posts/${postId}/poll/vote`, { optionIndex });
  return res.data;
};

export const getPostPollVoters = async (postId, optionIndex) => {
  const res = await api.get(`/posts/${postId}/poll/voters`, {
    params: { optionIndex },
  });
  return res.data;
};

export const repostPost = async (postId, data = {}) => {
  const res = await api.patch(`/posts/${postId}/repost`, data);
  return res.data;
};

export const sharePost = async (postId) => {
  const res = await api.patch(`/posts/${postId}/share`);
  return res.data;
};

export const savePost = async (postId) => {
  const res = await api.patch(`/posts/${postId}/save`);
  return res.data;
};

export const commentOnPost = async (postId, text) => {
  const res = await api.post(`/posts/${postId}/comment`, { text });
  return res.data;
};

export const getPostComments = async (postId) => {
  const res = await api.get(`/posts/${postId}/comments`);
  return res.data;
};

export const replyPostComment = async (
  postId,
  commentId,
  text,
  replyingToUserId
) => {
  const res = await api.post(`/posts/${postId}/comments/${commentId}/reply`, {
    text,
    replyingToUserId,
  });

  return res.data;
};

export const likePostComment = async (postId, commentId) => {
  const res = await api.patch(`/posts/${postId}/comments/${commentId}/like`);
  return res.data;
};

export const deletePostComment = async (postId, commentId) => {
  const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
  return res.data;
};

export const reportPost = async (postId, reason) => {
  const res = await api.post(`/posts/${postId}/report`, { reason });
  return res.data;
};

export const getSinglePost = async (postId) => {
  const res = await api.get(`/posts/${postId}`);
  return res.data;
};

export const deletePost = async (postId) => {
  const res = await api.delete(`/posts/${postId}`);
  return res.data;
};
