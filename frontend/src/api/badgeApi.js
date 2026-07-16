import api from "./axios";

export const getBadgeCatalog = async () => {
  const res = await api.get("/badges/catalog");
  return res.data;
};

export const getMyBadges = async () => {
  const res = await api.get("/badges/me");
  return res.data;
};

export const getUserBadges = async (userId) => {
  const res = await api.get(`/badges/user/${userId}`);
  return res.data;
};
