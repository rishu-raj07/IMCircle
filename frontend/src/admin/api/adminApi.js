import axios from "axios";

export const ADMIN_AUTH_KEY = "imcircle_admin_auth";

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getAdminAuth() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function setAdminAuth(value) {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(value));
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}

adminApi.interceptors.request.use((config) => {
  const auth = getAdminAuth();
  if (auth?.adminAccessToken) {
    config.headers.Authorization = `Bearer ${auth.adminAccessToken}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminAuth();
      if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export const adminAuthApi = {
  sendOtp: (mobile) => adminApi.post("/admin/auth/send-otp", { mobile }),
  verifyOtp: (mobile, otp) => adminApi.post("/admin/auth/verify-otp", { mobile, otp }),
  me: () => adminApi.get("/admin/auth/me"),
  logout: () => adminApi.post("/admin/auth/logout"),
};

export default adminApi;
