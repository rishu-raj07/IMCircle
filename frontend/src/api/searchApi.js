import api from "./axios";

export const searchEverything = async (query) => {
  const paths = ["/search", "/search/all", "/users/search"];
  let lastError;

  for (const path of paths) {
    try {
      const res = await api.get(path, {
        params: { q: query, query },
      });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
