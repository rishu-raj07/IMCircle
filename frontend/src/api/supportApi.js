import api from "./axios";

export const reportProblem = async (message) => {
  const res = await api.post("/support/report", { message });
  return res.data;
};
