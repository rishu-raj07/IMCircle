import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const getMyProfile = async () => {
  const res = await api.get("/profile/me");
  return res.data;
};

export const updateProfile = async (data) => {
  const optimizedData =
    data instanceof FormData ? await compressFormDataImages(data, "avatar") : data;

  const res = await api.put("/profile/update", optimizedData);
  return res.data;
};

export const getUsernameSuggestions = async (name) => {
  const res = await api.get("/profile/username/suggestions", {
    params: { name },
  });
  return res.data;
};

export const checkUsernameAvailability = async (username) => {
  const res = await api.get("/profile/username/availability", {
    params: { username },
  });
  return res.data;
};

export const updateOpenToWork = async (openToWork) => {
  const res = await api.patch("/profile/open-to-work", { openToWork });
  return res.data;
};

export const updateOpenToHiring = async (openToHiring) => {
  const res = await api.patch("/profile/open-to-hiring", { openToHiring });
  return res.data;
};

export const deleteMyAccount = async () => {
  const res = await api.delete("/profile/delete");
  return res.data;
};

export const getMyBuilderScore = async () => {
  const res = await api.get("/builder-score/me");
  return res.data;
};

export const getMyPosts = async () => {
  const res = await api.get("/posts/my");
  return res.data;
};
