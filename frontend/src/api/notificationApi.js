import api from "./axios";

const notificationPaths = ["/notifications"];

export const getNotifications = async ({ page = 1, limit = 20 } = {}) => {
  let lastError;

  for (const path of notificationPaths) {
    try {
      const res = await api.get(path, { params: { page, limit } });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const getFreshNotifications = async ({ page = 1, limit = 20 } = {}) => {
  let lastError;

  for (const path of notificationPaths) {
    try {
      const res = await api.get(path, {
        params: { page, limit, _ts: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  return getNotifications({ page, limit }).catch(() => {
    throw lastError;
  });
};

export const getUnreadNotificationCount = async () => {
  const res = await api.get("/notifications/unread-count");
  return res.data;
};

export const markNotificationRead = async (notificationId) => {
  const paths = [
    `/notifications/${notificationId}/read`,
    `/notifications/${notificationId}`,
    `/notification/${notificationId}/read`,
  ];
  let lastError;

  for (const path of paths) {
    try {
      const res = await api.patch(path, { read: true, isRead: true });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const markAllNotificationsRead = async () => {
  const paths = ["/notifications/read-all", "/notifications/mark-all-read"];
  let lastError;

  for (const path of paths) {
    try {
      const res = await api.patch(path);
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const deleteNotification = async (notificationId) => {
  const paths = [`/notifications/${notificationId}`, `/notification/${notificationId}`];
  let lastError;

  for (const path of paths) {
    try {
      const res = await api.delete(path);
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
