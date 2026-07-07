import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const createProject = async (data) => {
  const optimizedData =
    data instanceof FormData ? await compressFormDataImages(data, "banner") : data;

  const res = await api.post("/projects", optimizedData);
  return res.data;
};

export const getProjects = async (params = {}) => {
  const res = await api.get("/projects", { params });
  return res.data;
};

export const getMyProjects = async () => {
  const res = await api.get("/projects/my");
  return res.data;
};

export const getProjectById = async (projectId) => {
  const res = await api.get(`/projects/${projectId}`);
  return res.data;
};

export const updateProject = async (projectId, data) => {
  const optimizedData =
    data instanceof FormData ? await compressFormDataImages(data, "banner") : data;

  const res = await api.patch(`/projects/${projectId}`, optimizedData);
  return res.data;
};

export const deleteProject = async (projectId) => {
  const res = await api.delete(`/projects/${projectId}`);
  return res.data;
};
