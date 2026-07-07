import api from "../api/axios";

const SESSION_KEY = "imcircle_session_id";
const SESSION_STARTED_KEY = "imcircle_session_started_at";
const LAST_ACTIVITY_KEY = "imcircle_last_activity_at";
const INACTIVE_MS = 30 * 60 * 1000;

function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
  }
  return sessionId;
}

function getDevice() {
  return {
    platform: navigator.platform || "",
    browser: navigator.userAgent || "",
    os: navigator.platform || "",
    userAgent: navigator.userAgent || "",
  };
}

export function trackEvent(eventName, payload = {}) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    return api.post("/analytics/event", {
      sessionId: getSessionId(),
      eventName,
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: payload.metadata || {},
      device: getDevice(),
    });
  } catch {
    return Promise.resolve();
  }
}

export function startAnalyticsSession() {
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  const inactive = lastActivity && Date.now() - lastActivity > INACTIVE_MS;

  if (inactive) {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_STARTED_KEY);
  }

  getSessionId();
  trackEvent("session_start", { metadata: { source: "app_open" } });
  trackEvent("app_open");
}

export function endAnalyticsSession(reason = "background") {
  const startedAt = Number(sessionStorage.getItem(SESSION_STARTED_KEY) || Date.now());
  trackEvent("session_end", {
    metadata: {
      reason,
      durationMs: Math.max(Date.now() - startedAt, 0),
    },
  });
}
