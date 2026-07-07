import api from "./axios";

export const followUser = async (userId) => {
  const res = await api.post(`/users/follow/${userId}`);
  return res.data;
};

export const unfollowUser = async (userId) => {
  const res = await api.delete(`/users/unfollow/${userId}`);
  return res.data;
};