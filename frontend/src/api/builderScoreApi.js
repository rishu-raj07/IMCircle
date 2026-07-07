import api from "./axios";

export const getMyBuilderScore = async () => {
  const res = await api.get("/builder-score/me");
  return res.data;
};

export const getUserBuilderScore = async (userId) => {
  const res = await api.get(`/builder-score/${userId}`);
  return res.data;
};

export const getBuilderLeaderboard = async () => {
  const res = await api.get("/builder-score/leaderboard");
  return res.data;
};
