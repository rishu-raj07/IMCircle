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

// GET /api/meta/version — deliberately unauthenticated on the backend, so
// this call works even for a logged-out user on a stale cached bundle. See
// backend/src/controllers/meta.controller.js's getVersionInfo for the exact
// response shape ({frontendVersion, backendVersion, buildDate, commitHash,
// androidVersionName, androidVersionCode}).
export const getVersionInfo = async () => {
  const res = await api.get("/meta/version", {
    params: { _ts: Date.now() },
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  return res.data;
};