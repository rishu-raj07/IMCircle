import api from "./axios";

export const searchCompanies = async (query) => {
  const res = await api.get("/companies/search", {
    params: { q: query },
  });

  return res.data?.companies || res.data?.data || [];
};

export const createCompany = async (data) => {
  const res = await api.post("/companies", data);
  return res.data?.company || res.data?.data || res.data;
};

export const getCompanyBySlug = async (slug) => {
  const res = await api.get(`/companies/${slug}`);
  return res.data?.company || res.data?.data || res.data;
};

export const verifyCompanyWebsite = async (website) => {
  const res = await api.post("/companies/verify-domain", { website });
  return res.data?.verification;
};
