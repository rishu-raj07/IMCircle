import api from "./axios";

export const searchCompanies = async (q) => {
  const res = await api.get(`/meta/companies?q=${encodeURIComponent(q)}`);
  return res.data.companies || [];
};

export const searchColleges = async (q) => {
  const res = await api.get(`/meta/colleges?q=${encodeURIComponent(q)}`);
  return res.data.colleges || [];
};

export const searchLocations = async (q) => {
  const res = await api.get(`/meta/locations?q=${encodeURIComponent(q)}`);
  return res.data.locations || [];
};

export const createCompany = async (payload) => {
  const res = await api.post("/meta/companies", payload);
  return res.data.company;
};