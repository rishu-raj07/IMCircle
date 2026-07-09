// Native push notification wiring for Android/iOS via
// @capacitor/push-notifications. Mirrors the defensive pattern in
// deepLinks.js: dynamically import the Capacitor plugin and no-op
// entirely if it's unavailable (a plain web build), so this is always
// safe to call unconditionally.
//
// Backend counterpart: backend/src/services/push.service.js sends the
// actual push, fired from every notification-creation call site via
// socket.js's emitNotification — nothing here decides *what* pushes,
// only how this device registers to receive them and what happens when
// the user taps one.
import { IS_ANDROID, IS_IOS } from "../config/platform.js";
import { registerPushToken, removePushToken } from "../api/userApi.js";
import { setPushToken, getPushToken, clearPushToken, isAuthSessionValid } from "./storage.js";

const IS_NATIVE = IS_ANDROID || IS_IOS;

// Must match the channelId push.service.js sends android.notification.channelId
// as — without a matching channel, Android 8+ silently drops the
// notification tray entry (the app still gets the data payload, but the
// user never sees anything).
const ANDROID_CHANNEL_ID = "imcircle_default";

let initialized = false;

export async function initPushNotifications(navigate) {
  if (!IS_NATIVE || initialized) return;
  initialized = true;

  let PushNotifications;
  try {
    ({ PushNotifications } = await import("@capacitor/push-notifications"));
  } catch {
    return; // web build without the native plugin available at runtime
  }

  try {
    if (IS_ANDROID) {
      await PushNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: "General",
        description: "Likes, comments, messages, circle activity and more",
        importance: 4, // IMPORTANCE_HIGH — shows as a heads-up banner
        visibility: 1,
      });
    }

    const permStatus = await PushNotifications.checkPermissions();
    let receive = permStatus.receive;

    if (receive === "prompt" || receive === "prompt-with-rationale") {
      const requested = await PushNotifications.requestPermissions();
      receive = requested.receive;
    }

    if (receive !== "granted") return;

    PushNotifications.addListener("registration", (token) => {
      const value = token?.value;
      if (!value) return;

      setPushToken(value);

      // Do NOT send this to the backend unless someone is actually logged
      // in. POST /users/me/push-token is behind `protect` — calling it
      // while logged out (this listener is mounted app-wide, including on
      // /login, and fires ~2.5s after ANY page mount) returns 401. That
      // 401 is not harmless: axios.js's interceptor treats it as "session
      // expired", tries /auth/refresh-token, which also fails (there was
      // never a session), and then does removeAuthData() +
      // window.location.href = "/login" — a full hard reload of the very
      // page the user is already on. That reload remounts the whole app,
      // resets React state (wiping whatever the user was typing, e.g. a
      // phone number), and ~2.5s later this same listener fires again,
      // repeating forever. The token is safely cached via setPushToken()
      // above regardless, and syncPushTokenAfterLogin() below (called from
      // authStore.js's saveLoginData) sends it right after a successful
      // login, so nothing is lost by skipping it here while logged out.
      if (!isAuthSessionValid()) return;

      registerPushToken(value).catch(() => {
        // Non-fatal — next app open (or the periodic re-registration below)
        // will retry. Never surface this to the user.
      });
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.error("[pushNotifications] Registration failed:", error?.error || error);
    });

    // App was in the foreground when the push arrived — the OS won't show
    // a tray notification in that case, and this app already has a
    // real-time socket event (see notificationStore/Notifications.jsx)
    // covering the in-app bell, so there's nothing else to do here beyond
    // not letting an unhandled listener warning show up in logs.
    PushNotifications.addListener("pushNotificationReceived", () => {});

    // User tapped a system tray notification (app was backgrounded/closed).
    // The data payload's `link` is the same route the in-app notification
    // list would navigate to for this exact notification (see
    // notification.controller.js's deriveTarget / push.service.js).
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = action?.notification?.data?.link;
      navigate(link || "/notifications");
    });

    await PushNotifications.register();
  } catch (error) {
    console.error("[pushNotifications] Init failed:", error?.message || error);
  }
}

// Called from authStore.saveLoginData() right after a successful login.
// If this device already captured a push token while logged out (the
// "registration" listener above only fires once per install, the first
// time PushNotifications.register() succeeds — it won't fire again just
// because the user subsequently logs in), that token was cached locally
// via setPushToken() but deliberately never sent to the backend while
// unauthenticated. This is the other half of that: send it now that
// there's a real session to attach it to. Best-effort, native-only,
// silently ignored on failure — same as the original registration path.
export async function syncPushTokenAfterLogin() {
  if (!IS_NATIVE || !isAuthSessionValid()) return;

  const token = getPushToken();
  if (!token) return;

  registerPushToken(token).catch(() => {});
}

// Called from authStore.logoutUser() so a signed-out device stops
// receiving pushes meant for the account that just logged out of it.
// Best-effort and native-only; failures are swallowed since logout must
// never be blocked or interrupted by this.
export async function unregisterPushToken() {
  if (!IS_NATIVE) return;

  const token = getPushToken();
  if (!token) return;

  try {
    await removePushToken(token);
  } catch {
    // Ignore — a stale token left registered server-side is a minor
    // annoyance (one unnecessary push attempt that then self-prunes via
    // push.service.js's invalid-token cleanup), not worth blocking logout.
  } finally {
    clearPushToken();
  }
}
