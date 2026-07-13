import api from "./axios";

export const getShareAvatarBlob = async (url) => {
  const response = await api.get("/media/avatar", {
    params: { url },
    responseType: "blob",
  });
  return response.data;
};
