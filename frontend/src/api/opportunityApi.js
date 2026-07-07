import api from "./axios";

export const createOpportunity = async (data) => {
  const res = await api.post("/opportunities", data);
  return res.data;
};

export const getOpportunities = async (params = {}) => {
  const res = await api.get("/opportunities", { params });
  return res.data;
};

export const getMyOpportunities = async () => {
  const res = await api.get("/opportunities/my");
  return res.data;
};

export const getAppliedOpportunities = async () => {
  const res = await api.get("/opportunities/applied");
  return res.data;
};

export const getOpportunityById = async (id) => {
  const res = await api.get(`/opportunities/${id}`);
  return res.data;
};

export const updateOpportunity = async (id, data) => {
  const res = await api.patch(`/opportunities/${id}`, data);
  return res.data;
};

export const deleteOpportunity = async (id) => {
  const res = await api.delete(`/opportunities/${id}`);
  return res.data;
};

export const applyOpportunity = async (id, data) => {
  const res = await api.post(`/opportunities/${id}/apply`, data);
  return res.data;
};