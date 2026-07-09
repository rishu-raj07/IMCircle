// Every notification-creation call site across the app stores its target a
// little differently (post.controller.js uses a bare `post` field,
// JourneyMilestoneLike.js uses `data: { journey, milestone }`, the new
// learning-share notification uses `learning`/`data.learning`, etc). Rather
// than touching every one of those call sites, normalize them all here, at
// read time, into one consistent shape: { targetType, targetId, postId,
// journeyId, learningId, circleId, link }.
//
// Extracted out of notification.controller.js so push.service.js (sending
// native push notifications) can compute the same `link` a tapped
// notification should open, without duplicating this logic.
export function deriveTarget(raw) {
  const data = raw?.data || {};
  const type = String(raw?.type || "").toLowerCase();

  const postId = raw?.post ? String(raw.post) : data.post ? String(data.post) : "";
  const milestoneId = raw?.milestone
    ? String(raw.milestone)
    : data.milestone
    ? String(data.milestone)
    : "";
  const journeyId = raw?.journey ? String(raw.journey) : data.journey ? String(data.journey) : "";
  const learningId = raw?.learning
    ? String(raw.learning)
    : data.learning
    ? String(data.learning)
    : "";
  const repostId = raw?.repost ? String(raw.repost) : data.repost ? String(data.repost) : "";
  const circleId = raw?.circle ? String(raw.circle) : data.circle ? String(data.circle) : "";
  const conversationId = raw?.conversationId
    ? String(raw.conversationId)
    : data.conversationId
    ? String(data.conversationId)
    : "";

  const actorId = String(raw?.actor || raw?.sender || data.senderId || "");

  let targetType = raw?.targetType || "";
  let targetId = raw?.targetId ? String(raw.targetId) : "";

  if (!targetType) {
    if (postId) {
      targetType = "post";
      targetId = postId;
    } else if (milestoneId) {
      targetType = "journey_milestone";
      targetId = milestoneId;
    } else if (journeyId) {
      targetType = "journey";
      targetId = journeyId;
    } else if (learningId) {
      targetType = "learning";
      targetId = learningId;
    } else if (type === "message" || conversationId) {
      targetType = "message";
      targetId = conversationId;
    } else if (circleId) {
      targetType = "circle";
      targetId = circleId;
    } else if (type.startsWith("connection_") || type.includes("follow")) {
      targetType = "user";
      targetId = actorId;
    } else if (type.startsWith("circle_")) {
      targetType = "circle";
      targetId = circleId;
    } else {
      targetType = "user";
      targetId = actorId;
    }
  }

  // Direct-message notifications ("message") always carry a conversationId
  // even when targetType came from raw.targetType directly (older/edge-case
  // documents) — the frontend needs this to open the exact chat.
  const resolvedConversationId =
    targetType === "message" ? conversationId || targetId : conversationId;

  let link = raw?.link || "";
  if (!link) {
    if (targetType === "journey" && journeyId) link = `/journey/${journeyId}`;
    else if (targetType === "journey_milestone" && journeyId) link = `/journey/${journeyId}`;
    else if (targetType === "learning" && learningId) link = `/learning-view/${learningId}`;
    else if (targetType === "circle" && circleId) link = `/circles/${circleId}`;
    else if (targetType === "message" && resolvedConversationId) link = `/chat/${resolvedConversationId}`;
    // "post" has no dedicated single-post route yet — leave link empty and
    // let the frontend fall back to a safe existing route (the recipient's
    // own profile, since these are always "commented/liked your post").
  }

  return {
    targetType,
    targetId,
    postId,
    journeyId,
    learningId,
    repostId,
    circleId,
    conversationId: resolvedConversationId,
    senderId: actorId,
    link,
  };
}
