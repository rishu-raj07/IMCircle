import api from "./axios";

export const getPostComments = async (postId) => {
  const res = await api.get(`/posts/${postId}/comments`);
  return res.data;
};

export const commentPost = async (postId, text) => {
  const res = await api.post(`/posts/${postId}/comments`, { text });
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