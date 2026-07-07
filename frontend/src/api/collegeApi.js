import api from "./axios";

export const searchColleges = async (query) => {
  const res = await api.get("/colleges/search", {
    params: { q: query },
  });

  return res.data?.colleges || res.data?.data || [];
};

export const createCollege = async (data) => {
  const res = await api.post("/colleges", data);
  return res.data?.college || res.data?.data || res.data;
};

export const getCollegeBySlug = async (slug) => {
  const res = await api.get(`/colleges/${slug}`);
  return res.data?.college || res.data?.data || res.data;
};