// See firebaseAdmin.js for why this uses the modular `firebase-admin/messaging`
// import instead of `admin.messaging()` — that method doesn't exist on the
// plain ESM default export for this package version.
import { getMessaging } from "firebase-admin/messaging";
import User from "../models/User.js";
import { getFirebaseApp } from "../config/firebaseAdmin.js";
import { deriveTarget } from "../utils/notificationTarget.js";

// The single place that turns an in-app Notification document into an
// actual phone push. Called from socket.js's emitNotification — every
// notification-creation call site across the app (post/message/circle/
// journey/learning controllers, etc.) already calls that one function, so
// hooking in here means every notification type pushes without touching
// any of those ~12 call sites individually.
//
// Fire-and-forget by design: this must never slow down or fail the API
// request that triggered the notification, and a push failure (bad token,
// Firebase not configured, network hiccup) must never surface as an error
// to the user performing the like/comment/follow/etc that triggered it.
export async function sendPushToUser(recipientId, notification) {
  try {
    const app = getFirebaseApp();
    if (!app || !recipientId) {
      console.log(
        `[push.service] Skipped: ${!app ? "Firebase app not initialized" : "no recipientId"}`
      );
      return;
    }

    const user = await User.findById(recipientId).select("pushTokens");
    const tokens = (user?.pushTokens || []).filter(Boolean);
    if (tokens.length === 0) {
      console.log(`[push.service] Skipped: user ${recipientId} has no pushTokens`);
      return;
    }

    const target = deriveTarget(notification);

    const title = notification?.title || "IMCircle";
    const body = notification?.message || "You have a new notification";

    // FCM data payloads must be flat string->string maps — every value
    // here is coerced to a string, and undefined/null become "".
    const data = {
      type: String(notification?.type || ""),
      link: String(target.link || ""),
      targetType: String(target.targetType || ""),
      targetId: target.targetId ? String(target.targetId) : "",
      notificationId: notification?._id ? String(notification._id) : "",
    };

    const response = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: { channelId: "imcircle_default" },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    });

    // Temporary visibility while diagnosing a "push never shows up" report —
    // sendEachForMulticast's per-token result is the only way to tell
    // "Firebase accepted and should have delivered this" apart from "it was
    // silently rejected" (bad token, wrong sender ID, app not registered for
    // this project, etc.), and previously nothing logged on the success
    // path at all, which made a real send indistinguishable from "never
    // attempted" in the logs. Safe to remove once push is confirmed working.
    console.log(
      `[push.service] Sent "${notification?.type}" to ${tokens.length} token(s) for user ${recipientId}: ` +
        `${response.successCount} succeeded, ${response.failureCount} failed.`
    );
    response.responses.forEach((result, index) => {
      if (!result.success) {
        console.log(
          `[push.service]   token ${index} failed: ${result.error?.code || result.error?.message || "unknown error"}`
        );
      }
    });

    // Prune any token Firebase says is dead — otherwise every future push
    // to this user keeps re-trying it and the array grows unbounded over
    // time as people reinstall the app / clear data.
    const deadTokens = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code || "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        deadTokens.push(tokens[index]);
      }
    });

    if (deadTokens.length > 0) {
      await User.updateOne(
        { _id: recipientId },
        { $pull: { pushTokens: { $in: deadTokens } } }
      );
    }
  } catch (error) {
    console.error("[push.service] Push send skipped:", error.message);
  }
}
