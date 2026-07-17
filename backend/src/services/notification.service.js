import Notification from "../models/Notification.js";
import { emitNotification } from "../socket/socket.js";

// Single place that knows how to turn `{ entityType, entityId }` into a
// frontend route. Anything not listed here just gets whatever `link` the
// caller explicitly passed (or no link — the frontend already falls back
// to the actor's profile when a notification has nothing better to open).
const LINK_BUILDERS = {
  post: (id) => `/post/${id}`,
  journey: (id) => `/journey/${id}`,
  // A milestone doesn't have its own route — milestones are viewed inside
  // their parent journey's timeline, so `metadata.journeyId` (passed by the
  // caller, who already has the milestone loaded) is what actually gets
  // used here; falls back to treating `id` itself as the journey id only
  // if no journeyId was given.
  journey_milestone: (id, metadata) => `/journey/${metadata?.journeyId || id}`,
  learning: (id) => `/learning-view/${id}`,
  circle: (id) => `/circles/${id}`,
  message: (id) => `/chat/${id}`,
  user: (id, metadata) =>
    metadata?.username ? `/profile/${metadata.username}` : `/profile/user/${id}`,
  spotlight: () => "/spotlight",
  badge: (id, metadata) =>
    metadata?.username ? `/profile/${metadata.username}` : "/profile",
};

const DEFAULT_TITLES = {
  like: "New like",
  post_like: "New like",
  comment: "New comment",
  reply: "New reply",
  mention: "You were mentioned",
  repost: "New repost",
  follow: "New follower",
  circle_request: "Circle request",
  circle_accepted: "Circle request accepted",
  circle_declined: "Circle request declined",
  circle_joined: "New Circle member",
  journey_follow: "New journey follower",
  journey_like: "New reaction",
  journey_comment: "New reply",
  journey_repost: "Journey reposted",
  learning_like: "New like",
  learning_comment: "New thought",
  learning_repost: "Learning reposted",
  learning_share: "Learning shared",
  message: "New message",
  message_request: "New message request",
  badge: "New badge",
  spotlight: "Spotlight",
  builder_of_week: "Builder of the Week",
  referral: "Referral joined",
  system: "IMCircle",
  admin: "Announcement",
};

function buildLink({ entityType, entityId, link, metadata }) {
  if (link) return link;
  if (!entityType) return "";

  const builder = LINK_BUILDERS[entityType];
  if (!builder) return "";

  return builder(entityId, metadata) || "";
}

/**
 * The one place every controller should call to create a notification.
 * Never throws — a notification failure must never fail the like/follow/
 * comment/etc action that triggered it, so every error is caught, logged,
 * and swallowed. Returns the created/updated Notification doc, or null if
 * nothing was created (self-action, missing ids, or a swallowed error).
 *
 * @param {Object} params
 * @param {string|ObjectId} params.recipientId - who receives it
 * @param {string|ObjectId} params.actorId - who triggered it
 * @param {string} params.type - e.g. "like", "follow", "circle_request"
 * @param {string} [params.entityType] - "post" | "journey" | "journey_milestone"
 *   | "learning" | "circle" | "message" | "user" | "badge" | "spotlight"
 * @param {string|ObjectId} [params.entityId] - id of that entity
 * @param {string} params.message - full human-readable message, INCLUDING
 *   the actor's name (matches the existing convention across the app —
 *   e.g. "Priya liked your post" — since the frontend renders this string
 *   as-is rather than re-composing it from a separate actor field)
 * @param {string} [params.title] - overrides the type's default title
 * @param {string} [params.link] - overrides the auto-derived link
 * @param {Object} [params.metadata] - stored as `data`; also consulted by
 *   the link builders above (e.g. `metadata.journeyId`, `metadata.username`)
 * @param {boolean} [params.allowSelf] - when true, skips the "never notify
 *   a user about their own action" guard. Only for system-generated types
 *   where the recipient and the nominal actor are legitimately the same
 *   person (or there's no real actor at all) — e.g. a badge you earned
 *   automatically, where `actorId` has nothing meaningful to be but the
 *   recipient themselves.
 * @param {boolean} [params.dedupe] - when true, this call is idempotent:
 *   re-triggering the same (type, entityType, entityId, actor, recipient)
 *   combination reuses and resurfaces (marks unread again) the SAME
 *   document instead of creating a new row. Use this for anything a user
 *   can toggle or repeat (like, follow, journey-follow, circle request) —
 *   see the model's `deduplicationKey` unique index, which is what
 *   actually enforces this atomically even under concurrent requests.
 */
async function create({
  recipientId,
  actorId,
  type,
  entityType = "",
  entityId = null,
  message = "",
  title = "",
  link = "",
  metadata = {},
  dedupe = false,
  allowSelf = false,
}) {
  try {
    if (!recipientId || !actorId || !type) return null;

    // Never notify a user about their own action — every call site should
    // already avoid calling this for self-actions, but this is the one
    // place it's guaranteed regardless of what any given controller does.
    // System-generated types (badge, spotlight, system, admin) opt out via
    // `allowSelf` since they don't have a real "someone else did this" actor.
    if (!allowSelf && String(recipientId) === String(actorId)) return null;

    const resolvedLink = buildLink({ entityType, entityId, link, metadata });

    const baseDoc = {
      recipient: recipientId,
      receiver: recipientId,
      user: recipientId,
      actor: actorId,
      sender: actorId,
      type,
      title: title || DEFAULT_TITLES[type] || "Notification",
      message,
      targetType: entityType,
      targetId: entityId || undefined,
      link: resolvedLink,
      data: metadata,
    };

    let notification;

    if (dedupe) {
      const deduplicationKey = [
        type,
        entityType || "none",
        entityId ? String(entityId) : "none",
        String(actorId),
        String(recipientId),
      ].join(":");

      notification = await Notification.findOneAndUpdate(
        { deduplicationKey },
        {
          $set: {
            ...baseDoc,
            isRead: false,
            read: false,
            readAt: null,
          },
          $setOnInsert: { deduplicationKey },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      notification = await Notification.create(baseDoc);
    }

    emitNotification(recipientId, notification);
    return notification;
  } catch (error) {
    // A duplicate-key race on the sparse unique index (two simultaneous
    // requests both trying to insert the same dedup key) is expected and
    // harmless — the loser just means the winner's document already
    // represents this notification correctly.
    if (error?.code !== 11000) {
      console.error(
        `[notificationService] Failed to create "${type}" notification for recipient ${recipientId}:`,
        error?.message
      );
    }
    return null;
  }
}

/**
 * Deletes the dedup'd notification for a toggle-off action (e.g. unlike).
 * Documented decision (see Issue 2 spec): unlike REMOVES the like
 * notification rather than leaving a stale "liked your post" around for
 * something that's no longer true — consistent with how a real-time social
 * feed should reflect current state. This only ever targets the exact
 * dedup key, so it can never touch another user's notification or a
 * different type of notification about the same post.
 */
async function removeByDedupeKey({ type, entityType, entityId, actorId, recipientId }) {
  try {
    if (!actorId || !recipientId) return;

    const deduplicationKey = [
      type,
      entityType || "none",
      entityId ? String(entityId) : "none",
      String(actorId),
      String(recipientId),
    ].join(":");

    await Notification.deleteOne({ deduplicationKey });
  } catch (error) {
    console.error(
      `[notificationService] Failed to remove "${type}" notification:`,
      error?.message
    );
  }
}

const notificationService = { create, removeByDedupeKey };

export default notificationService;
export { create, removeByDedupeKey };
