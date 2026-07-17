import User from "../models/User.js";
import Hashtag from "../models/Hashtag.js";
import notificationService from "./notification.service.js";
import { extractMentions, extractHashtags } from "../utils/textParsing.js";

const MENTION_LABEL = {
  post: "post",
  learning: "learning post",
  journey_milestone: "journey update",
  circle_post: "circle post",
  comment: "comment",
};

// Called (fire-and-forget, non-blocking) right after a piece of content is
// created — parses @mentions and #hashtags out of its text once, in one
// place, so every content type gets identical Part 13/14 behavior instead
// of each controller reimplementing the regex + notification logic.
//
// Never throws into the caller: every failure path here is swallowed so a
// malformed mention or a Hashtag upsert race never turns into a 500 on the
// underlying create-post/learning/milestone/circle-post request.
export async function processContentText({
  text,
  authorId,
  contentType,
  contentId,
  link = "",
}) {
  try {
    const [mentionUsernames, hashtags] = [extractMentions(text), extractHashtags(text)];

    const jobs = [];

    if (hashtags.length > 0) {
      jobs.push(
        ...hashtags.map((tag) =>
          Hashtag.findOneAndUpdate(
            { tag },
            { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
            { upsert: true }
          ).catch(() => null)
        )
      );
    }

    if (mentionUsernames.length > 0 && authorId) {
      const mentionedUsers = await User.find({
        username: { $in: mentionUsernames },
        isDeleted: { $ne: true },
      }).select("_id username");

      const label = MENTION_LABEL[contentType] || "post";

      mentionedUsers.forEach((mentioned) => {
        if (String(mentioned._id) === String(authorId)) return;

        jobs.push(
          notificationService
            .create({
              recipientId: mentioned._id,
              actorId: authorId,
              type: "mention",
              entityType: contentType,
              entityId: contentId,
              message: `mentioned you in a ${label}`,
              link,
            })
            .catch(() => null)
        );
      });
    }

    await Promise.all(jobs);
  } catch {
    // Best-effort by design — see function doc comment.
  }
}

export async function getTrendingHashtags(limit = 15) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return Hashtag.find({ lastUsedAt: { $gte: since } })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(Math.min(limit, 50))
    .lean();
}

export async function searchHashtags(query, limit = 15) {
  const cleaned = String(query || "").trim().toLowerCase().replace(/^#/, "");
  if (!cleaned) return [];

  return Hashtag.find({ tag: { $regex: `^${cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } })
    .sort({ usageCount: -1 })
    .limit(Math.min(limit, 30))
    .lean();
}
