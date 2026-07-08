import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  removeAuthData,
} from "../utils/storage";
import { API_URL } from "../config/platform.js";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const GET_CACHE_TTL = 5 * 60 * 1000;
const getCache = new Map();
const pendingGetControllers = new Map();

function getRequestKey(config) {
  const params = config.params
    ? new URLSearchParams(config.params).toString()
    : "";
  return `${config.method || "get"}:${config.url || ""}?${params}`;
}

function shouldBypassGetCache(config) {
  const url = config.url || "";

  if (url.startsWith("/messages")) return true;

  // Follow relationships (and who follows/is-followed-by whom) change
  // often and are exactly the kind of data where a stale 5-minute-old
  // cached response is misleading — always hit the network for these.
  if (/\/users\/.+\/(followers|following|circle)$/.test(url)) return true;
  if (url === "/users/followers" || url === "/users/following") return true;

  // Journey feeds/details change constantly (new milestones, edited
  // descriptions, follow state) and a stale cached response here has
  // repeatedly masked backend fixes during development — always hit the
  // network for anything under /journeys. Same reasoning for the combined
  // Home feed (/feed), which is what actually powers the Home page.
  if (url.startsWith("/journeys")) return true;
  if (url.startsWith("/feed")) return true;

  // Builder score/streak changes the moment a user posts, and the header
  // badge needs to reflect that immediately — a 5-minute-old cached "0"
  // sitting next to a correct, freshly-fetched streak elsewhere in the app
  // is exactly the kind of mismatch that's confusing to see.
  if (url.startsWith("/builder-score")) return true;

  return false;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if ((config.method || "get").toLowerCase() === "get") {
    if (shouldBypassGetCache(config)) return config;

    const key = getRequestKey(config);
    const cached = getCache.get(key);

    if (cached && Date.now() - cached.cachedAt < GET_CACHE_TTL) {
      config.adapter = async () => ({
        data: cached.data,
        status: 200,
        statusText: "OK",
        headers: cached.headers || {},
        config,
        request: null,
      });
      return config;
    }

    const previous = pendingGetControllers.get(key);
    previous?.abort?.();

    if (!config.signal) {
      const controller = new AbortController();
      pendingGetControllers.set(key, controller);
      config.signal = controller.signal;
    }

    config.metadata = { ...(config.metadata || {}), cacheKey: key };
  }

  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || "get").toLowerCase();
    const cacheKey = response.config?.metadata?.cacheKey;

    // A successful mutation invalidates cached GET responses (so the next
    // read for that data hits the network instead of serving something
    // stale) — but it must NOT abort other GETs that happen to still be
    // in flight. This used to call `.abort()` on every pending GET
    // controller here, which meant an unrelated background POST (most
    // commonly AnalyticsTracker's screen_view/time_on_screen beacons,
    // which fire on every route change) could silently kill a page's own
    // just-started data-loading requests a few dozen ms after mount —
    // exactly the "page loads empty until I hit Refresh" bug seen in
    // production on the Network and Profile pages. Refresh "fixed" it only
    // because by then the analytics beacons had already resolved.
    if (method !== "get") {
      getCache.clear();
    }

    if (method === "get" && cacheKey) {
      pendingGetControllers.delete(cacheKey);
      getCache.set(cacheKey, {
        data: response.data,
        headers: response.headers,
        cachedAt: Date.now(),
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    const cacheKey = originalRequest?.metadata?.cacheKey;
    if (cacheKey) pendingGetControllers.delete(cacheKey);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/google") &&
      !originalRequest.url.includes("/auth/mobile/verify-otp") &&
      !originalRequest.url.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const res = await api.post("/auth/refresh-token");
        const newAccessToken = res.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("No access token returned");
        }

        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeAuthData();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
