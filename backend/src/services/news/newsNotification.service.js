import User from "../../models/User.js";
import notificationService from "../notification.service.js";

const MAX_RECIPIENTS_PER_ITEM = Number(process.env.NEWS_NOTIFY_MAX_RECIPIENTS_PER_ITEM) || 300;

// Mirrors buildMatchFilter/buildRelevanceReason in news.controller.js (field
// + primaryInterest — NOT user.role, which always defaults to "Student" and
// is never actually set anywhere in the live UI, see that file's comment).
// Kept in sync by hand since one operates NewsItem-side (find items for a
// user) and this operates User-side (find users for an item); the match
// rule must stay identical, or a user could see an item in their For You
// feed but never get notified about it, or get notified about something
// that wouldn't even show up there.
function userMatchesItem(user, item) {
  if (user.field && user.field !== "Other" && (item.industries || []).includes(user.field)) {
    return true;
  }

  const interest = user.primaryInterest?.trim();
  if (interest) {
    const needle = interest.toLowerCase();
    if ((item.categories || []).some((category) => category.toLowerCase().includes(needle))) {
      return true;
    }
    if ((item.keywords || []).some((keyword) => keyword.toLowerCase().includes(needle))) {
      return true;
    }
  }

  return false;
}

/**
 * Notifies users about freshly-ingested news that (a) was newly stored this
 * run, not a re-ingested dupe, (b) scored `isNotificationEligible` at
 * storage time (see scoreItem() in newsIngestion.service.js), and (c)
 * matches that specific user's field/interest — i.e. exactly the same
 * personalisation signal that decides what shows in their For You tab. This
 * is what makes "For You" proactive: a relevant new story triggers a
 * notification rather than only surfacing whenever the user next opens the
 * tab.
 *
 * One User query for the whole run rather than one per item — the
 * candidate pool (anyone with any usable signal at all) is fetched once and
 * matched against each item in memory, since which items a given candidate
 * matches only requires the small in-memory item list, not another query
 * per item.
 *
 * @param {Array<object>} items - plain NewsItem-shaped objects (must include
 *   `_id`, `title`, `industries`, `categories`, `keywords`,
 *   `isNotificationEligible`)
 * @returns {Promise<{ notified: number }>}
 */
export async function notifyUsersForNewNews(items) {
  const eligible = (items || []).filter((item) => item?.isNotificationEligible);
  if (!eligible.length) return { notified: 0 };

  // `newsNotificationsEnabled` doesn't exist on the User model yet — `$ne:
  // false` is a deliberate no-op today (missing !== false, so everyone
  // passes) and becomes a real opt-out the moment that preference field is
  // added, with no change needed here.
  const candidates = await User.find({
    $or: [
      { field: { $exists: true, $nin: ["Other", "", null] } },
      { primaryInterest: { $exists: true, $nin: ["", null] } },
    ],
    newsNotificationsEnabled: { $ne: false },
  }).select("_id field primaryInterest");

  let notified = 0;

  for (const item of eligible) {
    const matched = candidates.filter((user) => userMatchesItem(user, item));
    if (!matched.length) continue;

    // Guards against one very broadly-tagged item (e.g. matches a common
    // category like "Technology") fanning out to an unbounded number of
    // notifications in a single ingestion run.
    const recipients = matched.slice(0, MAX_RECIPIENTS_PER_ITEM);

    await Promise.all(
      recipients.map((user) =>
        notificationService.create({
          recipientId: user._id,
          // System-generated notification with no real human actor — same
          // convention as badge/spotlight (see notification.service.js):
          // self-reference + allowSelf so the "never notify about your own
          // action" guard doesn't swallow it.
          actorId: user._id,
          allowSelf: true,
          type: "news_update",
          entityType: "news",
          entityId: item._id,
          message: item.title,
          // Idempotent — re-running ingestion (scheduler retry, server
          // restart) never sends the same user a duplicate notification
          // about the same story.
          dedupe: true,
        })
      )
    );

    notified += recipients.length;
  }

  return { notified };
}
