import api from "./axios";

export const getMyReferralStats = async () => {
  const res = await api.get("/referrals/me");
  return res.data;
};

export const getMyReferredUsers = async () => {
  const res = await api.get("/referrals/me/referred");
  return res.data;
};

export const getUserReferralCount = async (userId) => {
  const res = await api.get(`/referrals/user/${userId}`);
  return res.data;
};
