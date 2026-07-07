import api from "./axios";

export const preRegisterForVerification = async () => {
  const res = await api.post("/verification/pre-register");
  return res.data;
};

export const getVerificationStatus = async () => {
  const res = await api.get("/verification/status");
  return res.data;
};
