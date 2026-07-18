import User from "../models/User.js";
import Post from "../models/Post.js";
import LearningRepost from "../models/LearningRepost.js";
import JourneyMilestoneRepost from "../models/JourneyMilestoneRepost.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import JourneyMilestoneLike from "../models/JourneyMilestoneLike.js";
import JourneyMilestoneSave from "../models/JourneyMilestoneSave.js";
import CircleRequest from "../models/CircleRequest.js";
import JourneyFollower from "../models/JourneyFollower.js";
import notificationService from "../services/notification.service.js";
import { getSignupRankBadge } from "../utils/badges.js";
import { sendOtpSms, verifyOtpSms } from "../services/msg91.service.js";
import { repairMissingProfileMedia } from "../utils/profileMediaRepair.js";

const activityAuthorFields =
  "fullName username avatar profileImage profilePicture photo picture headline role field verification gender";

const publicUserFields =
  "fullName username avatar coverImage headline bio field role skills location preferences stats followers following circle createdAt primaryInterest experience education gender";

const isSameId = (a, b) => String(a) === String(b);

const hasId = (arr = [], id) => {
  return arr.some((item) => String(item) === String(id));
};

const compactPublicUser = (user, currentUserId = null) => {
  const value = typeof user?.toObject === "function" ? user.toObject() : user;
  if (!value) return value;

  const hasFollowers = Object.prototype.hasOwnProperty.call(value, "followers");
  const hasFollowing = Object.prototype.hasOwnProperty.call(value, "following");
  const followers = Array.isArray(value.followers) ? value.followers : [];
  const following = Array.isArray(value.following) ? value.following : [];
  const followerCount = hasFollowers
    ? followers.length
    : value.followersCount ?? value.stats?.followersCount ?? 0;
  const followingCount = hasFollowing
    ? following.length
    : value.followingCount ?? value.stats?.followingCount ?? 0;
  const isFollowing = currentUserId ? hasId(followers, currentUserId) : false;

  // `circle` is bidirectional (added to both users on request-accept), so
  // whether the viewer is in the profile owner's circle list is the same
  // as whether the profile owner is in the viewer's — safe to read off
  // either side. Only expose the boolean, never the raw list, so viewing
  // someone's profile doesn't leak their full connections.
  const circleList = Array.isArray(value.circle) ? value.circle : [];
  const isInCircle = currentUserId ? hasId(circleList, currentUserId) : false;

  return {
    ...value,
    followersCount: followerCount,
    followingCount,
    stats: {
      ...(value.stats || {}),
      followersCount: followerCount,
      followingCount,
    },
    isFollowing,
    followedByMe: isFollowing,
    isInCircle,
    followers: undefined,
    following: undefined,
    circle: undefined,
    mobile: undefined,
    blockedUsers: undefined,
    profileMediaValidation: undefined,
  };
};

const normalizeContactMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const withoutCountry = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(withoutCountry) ? withoutCountry : "";
};

const normalizeIncomingContacts = (contacts = []) => {
  const byMobile = new Map();

  for (const contact of Array.isArray(contacts) ? contacts : []) {
    const name = String(contact?.name || contact?.displayName || "").trim().slice(0, 80);
    const phones = Array.isArray(contact?.phones)
      ? contact.phones
      : Array.isArray(contact?.tel)
      ? contact.tel
      : [contact?.phone, contact?.mobile, contact?.tel].filter(Boolean);

    for (const phone of phones) {
      const mobile = normalizeContactMobile(phone);
      if (!mobile || byMobile.has(mobile)) continue;
      byMobile.set(mobile, { mobile, contactName: name });
    }
  }

  return [...byMobile.values()].slice(0, 500);
};

export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: username.toLowerCase(),
      isDeleted: false,
      isBlocked: false,
    }).select(`${publicUserFields} profileMediaValidation`);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await repairMissingProfileMedia(user);

    const { signupRank, rankBadge } = await getSignupRankBadge(user.createdAt);

    res.status(200).json({
      success: true,
      user: compactPublicUser(user, req.user?._id),
      signupRank,
      rankBadge,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const keyword = q.trim();

    const users = await User.find({
      isDeleted: false,
      isBlocked: false,
      $or: [
        { fullName: { $regex: keyword, $options: "i" } },
        { username: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { headline: { $regex: keyword, $options: "i" } },
        { field: { $regex: keyword, $options: "i" } },
        { role: { $regex: keyword, $options: "i" } },
        { "skills.name": { $regex: keyword, $options: "i" } },
      ],
    })
      .select(publicUserFields)
      .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user) => compactPublicUser(user, req.user?._id)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const matchContacts = async (req, res) => {
  try {
    const normalizedContacts = normalizeIncomingContacts(req.body.contacts);

    if (!normalizedContacts.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        matches: [],
      });
    }

    const contactByMobile = new Map(
      normalizedContacts.map((item) => [item.mobile, item.contactName])
    );

    const users = await User.find({
      mobile: { $in: normalizedContacts.map((item) => item.mobile) },
      _id: { $ne: req.user._id },
      isDeleted: false,
      isBlocked: false,
    })
      .select(`${publicUserFields} mobile`)
      .limit(100);

    const matches = users.map((user) => {
      const safeUser = compactPublicUser(user, req.user?._id);
      const mobile = normalizeContactMobile(user.mobile);

      return {
        contactName: contactByMobile.get(mobile) || safeUser.fullName || safeUser.username || "Contact",
        user: safeUser,
      };
    });

    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    console.error("MATCH CONTACTS ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not match contacts. Please try again.",
    });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select(
      "circle field role primaryInterest location"
    );

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const excludedIds = [
      currentUser._id,
      ...(currentUser.circle || []),
    ].map((id) => String(id));

    const users = await User.find({
      _id: { $nin: excludedIds },
      isDeleted: false,
      isBlocked: false,
    })
      .select(publicUserFields)
      .sort({ "stats.followersCount": -1, createdAt: -1 })
      .limit(60);

    const currentCircleSet = new Set((currentUser.circle || []).map(String));
    const mutualIdsByUser = new Map();
    const allMutualIds = new Set();

    users.forEach((user) => {
      const mutualIds = (user.circle || []).map(String).filter((id) => currentCircleSet.has(id));
      mutualIdsByUser.set(String(user._id), mutualIds);
      mutualIds.forEach((id) => allMutualIds.add(id));
    });

    const mutualUsers = allMutualIds.size
      ? await User.find({ _id: { $in: [...allMutualIds] }, isDeleted: false })
          .select("fullName username avatar profileImage profilePicture photo picture")
          .lean()
      : [];
    const mutualUserMap = new Map(mutualUsers.map((user) => [String(user._id), user]));

    const scoredUsers = users
      .map((user) => {
        const value = compactPublicUser(user, req.user?._id);
        const score =
          (value.field && value.field === currentUser.field ? 3 : 0) +
          (value.role && value.role === currentUser.role ? 2 : 0) +
          (value.primaryInterest && value.primaryInterest === currentUser.primaryInterest ? 3 : 0) +
          (value.location?.city &&
          value.location.city === currentUser.location?.city
            ? 2
            : 0);

        const mutualIds = mutualIdsByUser.get(String(user._id)) || [];
        const mutualCircles = mutualIds
          .map((id) => mutualUserMap.get(id))
          .filter(Boolean)
          .slice(0, 4);

        return {
          ...value,
          suggestionScore: score,
          matchScore: Math.min(98, 62 + score * 4 + Math.min(mutualIds.length, 4) * 2),
          mutualCirclesCount: mutualIds.length,
          mutualCircles,
        };
      })
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, 20);

    res.status(200).json({
      success: true,
      count: scoredUsers.length,
      users: scoredUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Followers/following are stored as raw ObjectId refs, and some can go
// dangling (the referenced account was deleted). Populate silently drops
// those to null, which previously rendered as blank "User" rows with a
// broken link. This resolves the ref list against real, current users,
// prunes any dangling ids from the owner's stored array so it self-heals
// going forward, and returns only the users that actually still exist.
const resolvePeopleList = async (ownerId, field, viewerId = ownerId) => {
  const rawOwner = await User.findById(ownerId).select(field).lean();
  const rawIds = rawOwner?.[field] || [];

  const validUsers = rawIds.length
    ? await User.find({ _id: { $in: rawIds }, isDeleted: { $ne: true } }).select(
        publicUserFields
      )
    : [];

  const validById = new Map(validUsers.map((doc) => [String(doc._id), doc]));
  const danglingIds = rawIds.filter((id) => !validById.has(String(id)));

  if (danglingIds.length > 0) {
    await User.updateOne(
      { _id: ownerId },
      { $pull: { [field]: { $in: danglingIds } } }
    );
  }

  return rawIds
    .map((id) => validById.get(String(id)))
    .filter(Boolean)
    .map((user) => compactPublicUser(user, viewerId));
};

export const getFollowers = async (req, res) => {
  try {
    const followers = await resolvePeopleList(req.user._id, "followers", req.user._id);

    res.status(200).json({
      success: true,
      count: followers.length,
      followers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const following = await resolvePeopleList(req.user._id, "following", req.user._id);

    res.status(200).json({
      success: true,
      count: following.length,
      following,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getFollowersById = async (req, res) => {
  try {
    const owner = await User.findById(req.params.userId).select(
      "isDeleted isBlocked"
    );

    if (!owner || owner.isDeleted || owner.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const followers = await resolvePeopleList(
      req.params.userId,
      "followers",
      req.user._id
    );

    res.status(200).json({
      success: true,
      count: followers.length,
      followers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getFollowingById = async (req, res) => {
  try {
    const owner = await User.findById(req.params.userId).select(
      "isDeleted isBlocked"
    );

    if (!owner || owner.isDeleted || owner.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const following = await resolvePeopleList(
      req.params.userId,
      "following",
      req.user._id
    );

    res.status(200).json({
      success: true,
      count: following.length,
      following,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Circle is the one relationship that isn't public by default — unlike
// followers/following, viewing someone's Circle list requires already being
// in it (or being the owner). This mirrors how the "+ Circle" gate works
// everywhere else in the app: you have to be connected to see connections.
export const getCircleById = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const owner = await User.findById(targetUserId).select(
      "isDeleted isBlocked circle"
    );

    if (!owner || owner.isDeleted || owner.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isSelf = String(targetUserId) === String(currentUserId);
    const viewerInCircle = (owner.circle || []).some(
      (id) => String(id) === String(currentUserId)
    );

    if (!isSelf && !viewerInCircle) {
      return res.status(403).json({
        success: false,
        requiresCircle: true,
        message: "Join this user's Circle to view their connections",
      });
    }

    const circle = await resolvePeopleList(targetUserId, "circle", currentUserId);

    res.status(200).json({
      success: true,
      count: circle.length,
      circle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const targetUser = await User.findOne({
      _id: targetUserId,
      isDeleted: false,
      isBlocked: false,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = await User.findById(currentUserId).select(
      "fullName following blockedUsers"
    );

    if (
      hasId(currentUser.blockedUsers || [], targetUserId) ||
      hasId(targetUser.blockedUsers || [], currentUserId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can't follow this user",
      });
    }

    const alreadyFollowing = currentUser.following.some(
      (id) => String(id) === String(targetUserId)
    );

    if (alreadyFollowing) {
      return res.status(200).json({
        success: true,
        message: "Already following this user",
        following: true,
      });
    }

    await User.updateOne(
      { _id: currentUserId },
      {
        $addToSet: { following: targetUserId },
        $inc: { "stats.followingCount": 1 },
      }
    );

    await User.updateOne(
      { _id: targetUserId },
      {
        $addToSet: { followers: currentUserId },
        $inc: { "stats.followersCount": 1 },
      }
    );

    // dedupe: true so re-following after an unfollow (or a double-tap race)
    // resurfaces the same notification instead of stacking duplicates.
    notificationService
      .create({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: "follow",
        entityType: "user",
        entityId: currentUserId,
        metadata: { username: currentUser.username },
        message: `${currentUser.fullName} started following you`,
        dedupe: true,
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "User followed successfully",
      following: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot unfollow yourself",
      });
    }

    // Only decrement the counters when there's actually something to pull —
    // a duplicate/double-tap unfollow call used to decrement the count every
    // time regardless, which is how followers/following drifted negative.
    const currentUser = await User.findById(currentUserId).select("following");
    const isFollowing = currentUser?.following?.some(
      (id) => String(id) === String(targetUserId)
    );

    if (!isFollowing) {
      return res.status(200).json({
        success: true,
        message: "You are not following this user",
        following: false,
      });
    }

    await User.updateOne(
      { _id: currentUserId },
      {
        $pull: { following: targetUserId },
        $inc: { "stats.followingCount": -1 },
      }
    );

    await User.updateOne(
      { _id: targetUserId },
      {
        $pull: { followers: currentUserId },
        $inc: { "stats.followersCount": -1 },
      }
    );

    // Safety net in case older bad data already drifted negative.
    await User.updateOne(
      { _id: currentUserId },
      { $max: { "stats.followingCount": 0 } }
    );
    await User.updateOne(
      { _id: targetUserId },
      { $max: { "stats.followersCount": 0 } }
    );

    // Consistent with the unlike/un-repost decision elsewhere: remove the
    // now-stale "started following you" notification rather than leaving an
    // unread notification about something that's no longer true.
    //
    // Deliberately NOT creating a new "X unfollowed you" notification type —
    // per the product decision, unfollow is a negative/quiet action that
    // real social apps don't surface to the person being unfollowed.
    notificationService
      .removeByDedupeKey({
        type: "follow",
        entityType: "user",
        entityId: currentUserId,
        actorId: currentUserId,
        recipientId: targetUserId,
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
      following: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      `${publicUserFields} blockedUsers`
    );

    if (!user || user.isDeleted || user.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.user?._id) {
      const theyBlockedViewer = hasId(user.blockedUsers || [], req.user._id);

      if (theyBlockedViewer) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const viewer = await User.findById(req.user._id).select("blockedUsers");
      if (viewer && hasId(viewer.blockedUsers || [], req.params.userId)) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    const safeUser = compactPublicUser(user, req.user?._id);

    const { signupRank, rankBadge } = await getSignupRankBadge(user.createdAt);

    res.status(200).json({
      success: true,
      user: safeUser,
      signupRank,
      rankBadge,
    });
  } catch (error) {
    console.error("getUserById error:", error.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// The viewer's own circle/following/pending-request/followed-journey sets —
// used to stamp inCircle/circleRequested/isFollowing/followedByMe onto
// every author, creator, and journey returned below. Without this, an
// author populated with just `activityAuthorFields` carries no
// viewer-relative relationship data at all, so PostCard/JourneyCard fall
// back to their defaults and show "+Circle" / "Follow Journey" even when
// the viewer is already connected or already following — the exact bug
// feed.controller.js's withAuthorState() already solves for the main feed;
// this mirrors that pattern for the profile-scoped endpoints below.
async function getViewerRelationshipSets(req) {
  const viewerId = req.user._id;
  const circleSet = new Set((req.user.circle || []).map((id) => String(id)));
  const followingSet = new Set((req.user.following || []).map((id) => String(id)));

  const [pendingRequests, followedJourneys] = await Promise.all([
    CircleRequest.find({ sender: viewerId, status: "pending" }).select("receiver").lean(),
    JourneyFollower.find({ follower: viewerId }).select("journey").lean(),
  ]);

  const pendingCircleSet = new Set(
    pendingRequests.map((item) => String(item.receiver)).filter(Boolean)
  );
  const followedJourneySet = new Set(
    followedJourneys.map((item) => String(item.journey)).filter(Boolean)
  );

  return { viewerId: String(viewerId), circleSet, followingSet, pendingCircleSet, followedJourneySet };
}

function annotatePerson(person, sets) {
  if (!person || !person._id) return person;

  const id = String(person._id);
  const isMe = id === sets.viewerId;
  const inCircle = !isMe && sets.circleSet.has(id);
  const circleRequested = !isMe && !inCircle && sets.pendingCircleSet.has(id);

  return {
    ...person,
    isMe,
    inCircle,
    isInCircle: inCircle,
    circleRequested,
    isFollowing: !isMe && sets.followingSet.has(id),
  };
}

function annotateJourneyRef(journey, sets) {
  if (!journey || !journey._id) return journey;

  return {
    ...journey,
    followedByMe: sets.followedJourneySet.has(String(journey._id)),
  };
}

// Below: viewer-relative ENGAGEMENT state (liked/saved/reposted by the
// person currently looking at the screen — not the profile owner). Without
// this, PostCard/PostActions.jsx never receives `likedByMe`/`savedByMe`/
// `repostedByMe` (they default to false), so the heart/bookmark/repost
// buttons always render as "off" on profile pages even when the viewer
// already liked/saved/reposted that exact post — the same class of bug as
// the stale Circle/Follow badges above, just at the post level instead of
// the author level. feed.controller.js already solves this for the main
// feed (see attachViewerState/withAuthorState there); this mirrors it for
// the profile-scoped endpoints.
const hasUserId = (arr = [], userId) => {
  const target = String(userId);
  return Array.isArray(arr) && arr.some((item) => String(item?.user || item) === target);
};

const getMyRepostEntry = (arr = [], userId) =>
  Array.isArray(arr)
    ? arr.find((item) => String(item?.user || item) === String(userId))
    : null;

const cleanRepostText = (value) =>
  typeof value === "string" && value !== "[object Object]" ? value : "";

const getRepostTextFrom = (repost) =>
  cleanRepostText(
    repost?.caption || repost?.text || repost?.thought || repost?.repostText || repost?.quote || ""
  );

// Post documents store likes/saves/reposts as embedded arrays right on the
// doc, so no extra query is needed — just read them off the already-fetched
// `.lean()` object.
function annotatePostEngagement(post, viewerId) {
  if (!post) return post;

  const myRepost = getMyRepostEntry(post.reposts, viewerId);

  return {
    ...post,
    likesCount: post.likes?.length || 0,
    commentsCount: (post.comments || []).filter((c) => !c?.isDeleted).length,
    repliesCount: (post.comments || []).filter((c) => !c?.isDeleted).length,
    repostsCount: post.reposts?.length || 0,
    savesCount: post.saves?.length || 0,
    likedByMe: hasUserId(post.likes, viewerId),
    savedByMe: hasUserId(post.saves, viewerId),
    repostedByMe: Boolean(myRepost),
    repostText: getRepostTextFrom(myRepost),
    myRepost,
  };
}

// Journey milestones, unlike Post, keep likes/saves/reposts in their own
// collections (JourneyMilestoneLike/Save/Repost) rather than as embedded
// arrays — so the viewer's own state has to be fetched separately, scoped to
// just the milestone ids on this page.
async function getMilestoneEngagementSets(viewerId, milestoneIds) {
  if (!milestoneIds.length) {
    return { likedSet: new Set(), savedSet: new Set(), repostMap: new Map() };
  }

  const [likes, saves, reposts] = await Promise.all([
    JourneyMilestoneLike.find({ user: viewerId, milestone: { $in: milestoneIds } })
      .select("milestone")
      .lean(),
    JourneyMilestoneSave.find({ user: viewerId, milestone: { $in: milestoneIds } })
      .select("milestone")
      .lean(),
    JourneyMilestoneRepost.find({ user: viewerId, milestone: { $in: milestoneIds } })
      .select("milestone caption text thought repostText quote")
      .lean(),
  ]);

  return {
    likedSet: new Set(likes.map((item) => String(item.milestone))),
    savedSet: new Set(saves.map((item) => String(item.milestone))),
    repostMap: new Map(reposts.map((item) => [String(item.milestone), item])),
  };
}

function annotateMilestoneEngagement(milestone, engagementSets) {
  if (!milestone) return milestone;

  const id = String(milestone._id);
  const myRepost = engagementSets.repostMap.get(id);

  return {
    ...milestone,
    likedByMe: engagementSets.likedSet.has(id),
    savedByMe: engagementSets.savedSet.has(id),
    repostedByMe: Boolean(myRepost),
    repostText: getRepostTextFrom(myRepost),
    myRepost,
  };
}

// Posts genuinely AUTHORED by :userId — used by the profile "Posts" tab.
// This intentionally does not exist on post.routes.js today; the profile
// page previously reused the personalized /feed endpoint (scoped to the
// LOGGED-IN VIEWER, not the profile being looked at) and filtered
// client-side, which is the root cause of the "everything looks reposted"
// bug — see getUserReposts below for the other half of that fix.
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    const [sets, posts, rawMilestones] = await Promise.all([
      getViewerRelationshipSets(req),
      Post.find({ author: userId, isDeleted: false })
        .populate("author", activityAuthorFields)
        // See the matching comment in getUserReposts below — same gap,
        // same "Someone" fallback bug for the top-comment preview.
        .populate("comments.user", activityAuthorFields)
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      // Journey milestones (each day's update) live on their own model, not
      // Post — without fetching them here too, a user's own journey updates
      // never appeared on their profile at all (only milestones they
      // REPOSTED from someone else did, via getUserReposts below). Returned
      // as a separate `milestones` array rather than merged into `posts` so
      // existing callers of `posts` are unaffected.
      JourneyMilestone.find({ creator: userId, isDeleted: false })
        .populate("creator", activityAuthorFields)
        .populate("journey", "title targetDays totalDays")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ]);

    const engagementSets = await getMilestoneEngagementSets(
      viewerId,
      rawMilestones.map((m) => m._id)
    );

    const annotatedPosts = posts.map((post) => ({
      ...annotatePostEngagement(post, viewerId),
      author: annotatePerson(post.author, sets),
    }));

    const milestones = rawMilestones.map((milestone) => ({
      ...annotateMilestoneEngagement(milestone, engagementSets),
      creator: annotatePerson(milestone.creator, sets),
      journey: annotateJourneyRef(milestone.journey, sets),
    }));

    return res.status(200).json({
      success: true,
      count: annotatedPosts.length + milestones.length,
      posts: annotatedPosts,
      milestones,
    });
  } catch (error) {
    console.error("GET USER POSTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Everything :userId has genuinely REPOSTED — posts, learnings, and journey
// milestones — each scoped by an explicit `reposts.user === userId` /
// `LearningRepost.user === userId` / `JourneyMilestoneRepost.user === userId`
// check, never by the viewer's own state and never by "a reposts array
// exists on this document". This is the endpoint UserProfile.jsx and
// ProfileActivity.jsx should call instead of re-filtering the personalized
// /feed response (which is scored/flagged for whoever is logged in, not for
// the profile being viewed — that mismatch is what made another user's own
// reposts show up as if the PROFILE OWNER had reposted them).
export const getUserReposts = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    const [sets, repostedPosts, learningReposts, milestoneReposts] = await Promise.all([
      getViewerRelationshipSets(req),
      Post.find({ "reposts.user": userId, isDeleted: false })
        .populate("author", activityAuthorFields)
        // Without this, post.comments[].user arrives as a raw unpopulated
        // ObjectId — ReplyPreview.jsx's name lookup then has nothing to
        // read (.fullName/.username don't exist on a bare id) and falls
        // back to showing "Someone" for the top comment preview on every
        // reposted card here, even though the comment has a real author.
        .populate("comments.user", activityAuthorFields)
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      LearningRepost.find({ user: userId })
        .populate({
          path: "learning",
          populate: { path: "creator", select: activityAuthorFields },
        })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      JourneyMilestoneRepost.find({ user: userId })
        .populate({
          path: "milestone",
          populate: [
            { path: "creator", select: activityAuthorFields },
            { path: "journey", select: "title targetDays totalDays" },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ]);

    // The "repostedBy X" caption above these cards is about the PROFILE
    // OWNER's (userId's) repost note — but the like/save/repost BUTTON
    // state below the card must reflect the person currently looking at the
    // screen (viewerId), which is a different id whenever you're viewing
    // someone else's profile. Mixing these up is what made the buttons look
    // permanently "off": annotatePostEngagement/annotateMilestoneEngagement
    // are always called with viewerId, never userId.
    const milestoneEngagementSets = await getMilestoneEngagementSets(
      viewerId,
      milestoneReposts.filter((entry) => entry.milestone).map((entry) => entry.milestone._id)
    );

    const posts = repostedPosts.map((post) => {
      const theirRepost = (post.reposts || []).find(
        (entry) => String(entry.user) === String(userId)
      );

      return {
        ...annotatePostEngagement(post, viewerId),
        author: annotatePerson(post.author, sets),
        repostedBy: userId,
        repostCaption: theirRepost?.text || "",
        repostedAt: theirRepost?.createdAt || post.createdAt,
      };
    });

    const learnings = learningReposts
      .filter((entry) => entry.learning && !entry.learning.isDeleted)
      .map((entry) => ({
        ...entry.learning,
        creator: annotatePerson(entry.learning.creator, sets),
        repostedBy: userId,
        repostCaption: entry.caption || "",
        repostedAt: entry.createdAt,
      }));

    const milestones = milestoneReposts
      .filter((entry) => entry.milestone)
      .map((entry) => ({
        ...annotateMilestoneEngagement(entry.milestone, milestoneEngagementSets),
        creator: annotatePerson(entry.milestone.creator, sets),
        journey: annotateJourneyRef(entry.milestone.journey, sets),
        repostedBy: userId,
        repostCaption: entry.caption || "",
        repostedAt: entry.createdAt,
      }));

    return res.status(200).json({
      success: true,
      count: posts.length + learnings.length + milestones.length,
      reposts: { posts, learnings, milestones },
    });
  } catch (error) {
    console.error("GET USER REPOSTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const removeFollower = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId).select("followers");
    const isFollower = currentUser?.followers?.some(
      (id) => String(id) === String(targetUserId)
    );

    if (!isFollower) {
      return res.status(200).json({
        success: true,
        message: "That user isn't following you",
      });
    }

    await User.updateOne(
      { _id: currentUserId },
      {
        $pull: { followers: targetUserId },
        $inc: { "stats.followersCount": -1 },
      }
    );

    await User.updateOne(
      { _id: targetUserId },
      {
        $pull: { following: currentUserId },
        $inc: { "stats.followingCount": -1 },
      }
    );

    // Safety net in case older bad data already drifted negative.
    await User.updateOne(
      { _id: currentUserId },
      { $max: { "stats.followersCount": 0 } }
    );
    await User.updateOne(
      { _id: targetUserId },
      { $max: { "stats.followingCount": 0 } }
    );

    return res.status(200).json({
      success: true,
      message: "Follower removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const addToCircle = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself to circle",
      });
    }

    const targetUser = await User.findOne({
      _id: targetUserId,
      isDeleted: false,
      isBlocked: false,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.updateOne(
      { _id: currentUserId },
      {
        $addToSet: { circle: targetUserId },
      }
    );

    const freshUser = await User.findById(currentUserId).select("circle stats");

    await User.findByIdAndUpdate(currentUserId, {
      "stats.circleCount": freshUser.circle.length,
    });

    return res.status(200).json({
      success: true,
      message: "User added to circle",
      circle: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const removeFromCircle = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    await User.updateOne(
      { _id: currentUserId },
      {
        $pull: { circle: targetUserId },
      }
    );

    const freshUser = await User.findById(currentUserId).select("circle stats");

    await User.findByIdAndUpdate(currentUserId, {
      "stats.circleCount": freshUser.circle.length,
    });

    return res.status(200).json({
      success: true,
      message: "User removed from circle",
      circle: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Add/verify a mobile number on the CURRENT LOGGED-IN user's own account
// (settings page), as opposed to sendMobileOtp/verifyMobileOtp in
// auth.controller.js which are for the login/signup flow and will create a
// brand-new account for an unrecognized number. Here we never create a
// user — we only ever attach a verified number to req.user.
export const sendProfileMobileOtp = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10 digit Indian mobile number is required",
      });
    }

    const existing = await User.findOne({
      mobile,
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already linked to another account.",
      });
    }

    await sendOtpSms(mobile);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("SEND PROFILE MOBILE OTP ERROR:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

export const verifyProfileMobileOtp = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10 digit Indian mobile number is required",
      });
    }

    if (!/^\d{4,8}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Valid OTP is required",
      });
    }

    const existing = await User.findOne({
      mobile,
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already linked to another account.",
      });
    }

    let msg91Response;

    try {
      msg91Response = await verifyOtpSms(mobile, otp);
    } catch (msg91Error) {
      // See the identical try/catch in verifyMobileOtp (auth.controller.js)
      // for why this is needed — axios throws on MSG91's non-2xx response,
      // which normal wrong/expired-OTP cases can trigger, and without this
      // it fell through to the outer catch's vague "Failed to verify OTP"
      // with the real MSG91 response only ever visible here in the logs.
      console.warn(
        "MSG91 OTP verify request failed:",
        msg91Error.response?.status,
        msg91Error.response?.data || msg91Error.message
      );

      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const msgType = String(msg91Response?.type || "").toLowerCase();

    if (msgType && msgType !== "success") {
      return res.status(400).json({
        success: false,
        message: msg91Response?.message || "Invalid OTP.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.mobile = mobile;
    user.verification = user.verification || {};
    user.verification.mobile = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Mobile number verified",
      mobile,
      verified: true,
    });
  } catch (error) {
    console.error("VERIFY PROFILE MOBILE OTP ERROR:", error.response?.data || error.message);
    if (error?.code === 11000 && error?.keyPattern?.mobile) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already linked to another account.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// Blocking a user hides them from your own feed/search/suggestions, and
// mutually prevents new follows, circle requests, and messages between the
// two accounts (enforced at each of those call sites via blockedUsers).
// Existing follow relationships are intentionally left untouched here —
// unfollow is a separate, explicit action.
export const blockUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    const targetUser = await User.findOne({
      _id: targetUserId,
      isDeleted: false,
    }).select("_id");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.updateOne(
      { _id: currentUserId },
      { $addToSet: { blockedUsers: targetUserId } }
    );

    return res.status(200).json({
      success: true,
      message: "User blocked",
      blocked: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    await User.updateOne(
      { _id: currentUserId },
      { $pull: { blockedUsers: targetUserId } }
    );

    return res.status(200).json({
      success: true,
      message: "User unblocked",
      blocked: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("blockedUsers")
      .populate("blockedUsers", "fullName name username avatar headline");

    return res.status(200).json({
      success: true,
      blockedUsers: user?.blockedUsers || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const reportUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;
    const { reason = "Inappropriate behavior" } = req.body;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report yourself",
      });
    }

    const targetUser = await User.findOne({
      _id: targetUserId,
      isDeleted: false,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const alreadyReported = (targetUser.reports || []).some(
      (report) => String(report.user) === String(currentUserId)
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You already reported this user",
      });
    }

    targetUser.reports.push({
      user: currentUserId,
      reason: typeof reason === "string" ? reason.slice(0, 500) : "Inappropriate behavior",
    });

    await targetUser.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "User reported successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Registers (or refreshes) this device's FCM token so push.service.js can
// reach it whenever a notification is created for this user. Called from
// frontend/src/utils/pushNotifications.js right after the native
// PushNotifications plugin hands back a token — on every app foreground,
// not just first install, since FCM tokens can rotate. $addToSet keeps the
// array free of duplicates if the same device registers again.
export const registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid push token is required",
      });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { pushTokens: token } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Stores this device's E2EE public key (see User.js's publicKey field for
// the full explanation). Called once per device the first time the app
// notices it doesn't have a key pair yet — see
// frontend/src/components/common/E2EEKeyInitializer.jsx. A plain overwrite
// ($set, not $addToSet like push tokens) is correct here: unlike push
// tokens, a user is only ever meant to have ONE current public key, and
// generating a new device key pair is supposed to replace the old one.
export const updatePublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== "string" || publicKey.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "A valid public key is required",
      });
    }

    await User.updateOne({ _id: req.user._id }, { $set: { publicKey } });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Called on logout from a native app so a signed-out device stops
// receiving pushes meant for the account that just logged out of it.
export const removePushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid push token is required",
      });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushTokens: token } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
