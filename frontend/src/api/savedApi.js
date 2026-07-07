import api from "./axios";

export const getSavedItems = async () => {
  const res = await api.get("/saved");
  return res.data;
};
