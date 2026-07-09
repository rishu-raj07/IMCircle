const ACCESS_TOKEN_KEY = "bn_access_token";
const USER_KEY = "bn_user";
const AUTH_EXPIRES_KEY = "bn_auth_expires_at";
const PENDING_AUTH_KEY = "bn_pending_auth";
const PUSH_TOKEN_KEY = "bn_push_token";

const AUTH_DAYS = 60;
const memoryStorage = {};

const canUseLocalStorage = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;

    const testKey = "__bn_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);

    return true;
  } catch {
    return false;
  }
};

const setItem = (key, value) => {
  try {
    if (canUseLocalStorage()) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStorage[key] = value;
    }
  } catch {
    memoryStorage[key] = value;
  }
};

const getItem = (key) => {
  try {
    if (canUseLocalStorage()) {
      return window.localStorage.getItem(key);
    }

    return memoryStorage[key] || null;
  } catch {
    return memoryStorage[key] || null;
  }
};

const removeItem = (key) => {
  try {
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
  } catch {
    delete memoryStorage[key];
  }
};

export const setAccessToken = (token) => {
  setItem(ACCESS_TOKEN_KEY, token);
  setItem(
    AUTH_EXPIRES_KEY,
    String(Date.now() + AUTH_DAYS * 24 * 60 * 60 * 1000)
  );
};

export const getAccessToken = () => {
  return (
    getItem(ACCESS_TOKEN_KEY) ||
    getItem("accessToken") ||
    getItem("token") ||
    getItem("bharat_token")
  );
};

export const setUser = (user) => {
  setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  try {
    const user = getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const isAuthSessionValid = () => {
  const token = getAccessToken();
  const user = getUser();
  const expiresAt = Number(getItem(AUTH_EXPIRES_KEY));

  return Boolean(token && user && expiresAt && Date.now() < expiresAt);
};

export const setPendingAuth = (data) => {
  setItem(PENDING_AUTH_KEY, JSON.stringify(data));
};

export const getPendingAuth = () => {
  try {
    const data = getItem(PENDING_AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const removePendingAuth = () => {
  removeItem(PENDING_AUTH_KEY);
};

export const setPendingRegister = setPendingAuth;
export const getPendingRegister = getPendingAuth;
export const removePendingRegister = removePendingAuth;

export const removeAuthData = () => {
  removeItem(ACCESS_TOKEN_KEY);
  removeItem(USER_KEY);
  removeItem(AUTH_EXPIRES_KEY);
};

// Caches this device's FCM registration token locally so logoutUser() can
// tell the backend to stop pushing to it, without needing to re-fetch a
// fresh token just to remove one (see utils/pushNotifications.js).
export const setPushToken = (token) => {
  setItem(PUSH_TOKEN_KEY, token);
};

export const getPushToken = () => {
  return getItem(PUSH_TOKEN_KEY);
};

export const clearPushToken = () => {
  removeItem(PUSH_TOKEN_KEY);
};
