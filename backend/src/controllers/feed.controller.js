import mongoose from "mongoose";

import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import LearningLike from "../models/LearningLike.js";
import LearningRepost from "../models/LearningRepost.js";
import LearningSave from "../models/LearningSave.js";
import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import JourneyMilestoneLike from "../models/JourneyMilestoneLike.js";
import JourneyMilestoneRepost from "../models/JourneyMilestoneRepost.js";
import JourneyMilestoneSave from "../models/JourneyMilestoneSave.js";
import JourneyMilestoneComment from "../models/JourneyMilestoneComment.js";
import JourneyFollower from "../models/JourneyFollower.js";
import Opportunity from "../models/Opportunity.js";
import Project from "../models/Project.js";
import FeedView from "../models/FeedView.js";
import CircleRequest from "../models/CircleRequest.js";

const authorFields =
  "fullName name username avatar profilePicture profileImage photo photoURL picture headline role field primaryInterest location followers following circle blockedUsers isProfileCompleted profileCompletionPercent gender";
const commenterFields = "fullName username avatar profilePicture profileImage gender";

const FEED_WEIGHTS = {
  circleBoost: 50,
  followBoost: 40,
  followedJourneyBoost: 35,
  topicMatchBoost: 20,
  locationMatchBoost: 10,
  roleMatchBoost: 8,
  mutualConnectionBoost: 10,
  seenPenalty: 30,
};

const VALID_TABS = new Set(["for-you", "following", "journeys", "learning", "jobs"]);
const CANDIDATE_CAP = 250;

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id?.toString?.() || value?.id?.toString?.() || "";
};

const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : doc);

const hasUser = (arr = [], userId) => {
  const target = getId(userId);
  if (!target || !Array.isArray(arr)) return false;
  return arr.some((item) => getId(item?.user || item) === target);
};

const getMyRepost = (arr = [], userId) =>
  Array.isArray(arr) ? arr.find((item) => getId(item?.user || item) === getId(userId)) : null;

const cleanText = (value) =>
  typeof value === "string" && value !== "[object Object]" ? value : "";

const getRepostText = (repost) =>
  cleanText(
    repost?.caption ||
      repost?.text ||
      repost?.thought ||
      repost?.repostText ||
      repost?.quote ||
      ""
  );

const decodeCursor = (cursor) => {
  if (!cursor || typeof cursor !== "string") return null;

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const date = new Date(decoded.createdAt);
    if (!decoded.id || Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id: decoded.id };
  } catch {
    return null;
  }
};

const encodeCursor = (item) => {
  const id = getId(item?.data || item);
  if (!id || !item?.createdAt) return null;
  return Buffer.from(JSON.stringify({ createdAt: item.createdAt, id }), "utf8").toString(
    "base64url"
  );
};

const cursorQuery = (cursor) => {
  const parsed = decodeCursor(cursor);
  if (!parsed || !mongoose.Types.ObjectId.isValid(parsed.id)) return {};

  return {
    $or: [
      { createdAt: { $lt: parsed.createdAt } },
      { createdAt: parsed.createdAt, _id: { $lt: parsed.id } },
    ],
  };
};

const normalizeTopicTokens = (...values) => {
  const tokens = new Set();

  for (const value of values.flat(Infinity).filter(Boolean)) {
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) continue;
    tokens.add(normalized);
    normalized
      .split(/[^a-z0-9+#.-]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
      .forEach((token) => tokens.add(token));
  }

  return [...tokens];
};

const isFollowedAuthor = (author, followingSet) => followingSet.has(getId(author));
const isCircleAuthor = (author, circleSet) => circleSet.has(getId(author));

const buildCircleProof = (comments = [], circleSet, viewerId) => {
  const viewerIdStr = getId(viewerId);
  const seen = new Set();
  const relevant = [];

  for (const comment of comments || []) {
    if (comment?.isDeleted) continue;
    const user = comment?.user;
    const uid = getId(user);
    if (!uid || uid === viewerIdStr || seen.has(uid) || !circleSet.has(uid)) continue;

    seen.add(uid);
    relevant.push({
      _id: user?._id,
      fullName: user?.fullName || user?.name || user?.username || "Someone",
      username: user?.username || "",
      avatar: user?.avatar || user?.profilePicture || user?.profileImage || "",
      commentedAt: comment.createdAt,
      text: comment.text || "",
    });
  }

  if (!relevant.length) return null;
  relevant.sort((a, b) => new Date(b.commentedAt) - new Date(a.commentedAt));

  return {
    primaryUser: relevant[0],
    avatars: relevant.slice(0, 3),
    othersCount: relevant.length - 1,
    totalCount: relevant.length,
    // The circle member's actual comment text, so the feed banner can show
    // it inline in the same card instead of just "X commented" with no
    // content.
    commentText: relevant[0].text || "",
  };
};

const getEngagement = (type, data) => ({
  likes: data.likesCount ?? data.likes?.length ?? 0,
  comments: data.commentsCount ?? data.comments?.filter?.((item) => !item.isDeleted)?.length ?? 0,
  reposts: data.repostsCount ?? data.reposts?.length ?? 0,
  saves: data.savesCount ?? data.saves?.length ?? 0,
  shares: data.sharesCount ?? data.shares?.length ?? 0,
  impressions: data.impressionsCount ?? data.viewsCount ?? data.impressions ?? 0,
});

const recencyBoost = (createdAt) => {
  const ageHours = Math.max((Date.now() - new Date(createdAt).getTime()) / 3600000, 0);
  return Math.max(0, 30 - ageHours / 2);
};

const scoreItem = ({ type, data, viewer, followingSet, circleSet, followedJourneySet, seenSet }) => {
  const author = data.author || data.creator || data.user || {};
  const authorId = getId(author);
  const viewerTopics = normalizeTopicTokens(
    viewer?.primaryInterest,
    viewer?.field,
    viewer?.role,
    viewer?.skills?.map?.((skill) => skill?.name || skill)
  );
  const itemTopics = normalizeTopicTokens(
    data.topic,
    data.category,
    data.purpose,
    data.type,
    data.tags,
    data.skills,
    data.techStack,
    data.title,
    data.headline,
    data.content,
    data.description,
    data.text
  );
  const topicMatch = itemTopics.some((topic) =>
    viewerTopics.some((interest) => topic === interest || topic.includes(interest) || interest.includes(topic))
  );
  const sameCity =
    viewer?.location?.city &&
    author?.location?.city &&
    String(viewer.location.city).toLowerCase() === String(author.location.city).toLowerCase();
  const sameState =
    viewer?.location?.state &&
    author?.location?.state &&
    String(viewer.location.state).toLowerCase() === String(author.location.state).toLowerCase();
  const sameRole = viewer?.role && author?.role && viewer.role === author.role;
  const mutuals =
    Array.isArray(author?.following) || Array.isArray(author?.circle)
      ? [...(author.following || []), ...(author.circle || [])].filter((item) =>
          circleSet.has(getId(item))
        ).length
      : 0;
  const engagement = getEngagement(type, data);
  const engagementBoost =
    Math.min(20, engagement.likes * 0.6 + engagement.comments * 1.4 + engagement.reposts * 1.8 + engagement.saves);
  const journeyId = getId(data.journey);
  const seenKey = `${type}:${getId(data)}`;

  return (
    (isCircleAuthor(author, circleSet) ? FEED_WEIGHTS.circleBoost : 0) +
    (isFollowedAuthor(author, followingSet) ? FEED_WEIGHTS.followBoost : 0) +
    (journeyId && followedJourneySet.has(journeyId) ? FEED_WEIGHTS.followedJourneyBoost : 0) +
    (topicMatch ? FEED_WEIGHTS.topicMatchBoost : 0) +
    (sameCity || sameState ? FEED_WEIGHTS.locationMatchBoost : 0) +
    (sameRole ? FEED_WEIGHTS.roleMatchBoost : 0) +
    (mutuals ? FEED_WEIGHTS.mutualConnectionBoost : 0) +
    engagementBoost +
    recencyBoost(data.createdAt) -
    (seenSet.has(seenKey) ? FEED_WEIGHTS.seenPenalty : 0) +
    (authorId === getId(viewer) ? 4 : 0)
  );
};

// blockedUsers is pulled into the populated author/creator object only so
// the feed can filter on it (see isBlockedRelation) — it must never reach
// the client, so every path that builds the response object strips it.
const stripPrivateAuthorFields = (author) => {
  if (!author || typeof author !== "object") return author;
  const { blockedUsers, ...rest } = author;
  return rest;
};

const isBlockedRelation = (author, viewerId, myBlockedSet) => {
  const authorId = getId(author);
  if (!authorId) return false;
  if (myBlockedSet.has(authorId)) return true;
  const authorBlockedList = Array.isArray(author?.blockedUsers) ? author.blockedUsers : [];
  return authorBlockedList.some((id) => getId(id) === getId(viewerId));
};

const withAuthorState = (data, viewerId, followingSet, circleSet, pendingCircleSet) => {
  const author = data?.author || data?.creator || data?.user || {};
  const authorId = getId(author);
  const isMine = authorId && authorId === getId(viewerId);
  const followedAuthor = !isMine && followingSet.has(authorId);
  const inCircle = !isMine && circleSet.has(authorId);
  const circleRequested = !isMine && !inCircle && pendingCircleSet.has(authorId);
  const cleanAuthor = data.author ? stripPrivateAuthorFields(data.author) : data.author;
  const cleanCreator = data.creator ? stripPrivateAuthorFields(data.creator) : data.creator;

  return {
    ...data,
    isMine,
    isMe: isMine,
    isFollowing: followedAuthor,
    followedByMe: followedAuthor,
    circleRequested,
    author: cleanAuthor
      ? { ...cleanAuthor, isMe: isMine, isFollowing: followedAuthor, inCircle, circleRequested }
      : cleanAuthor,
    creator: cleanCreator
      ? { ...cleanCreator, isMe: isMine, isFollowing: followedAuthor, inCircle, circleRequested }
      : cleanCreator,
    viewerState: {
      ...(data.viewerState || {}),
      followedAuthor,
      inCircle,
      circleRequested,
    },
  };
};

const buildNormalizedItem = (item) => {
  const data = item.data || {};
  const engagement = getEngagement(item.type, data);
  const viewerState = {
    liked: Boolean(data.likedByMe),
    saved: Boolean(data.savedByMe),
    reposted: Boolean(data.repostedByMe),
    followedAuthor: Boolean(data.viewerState?.followedAuthor || data.followedByMe),
    inCircle: Boolean(data.viewerState?.inCircle),
    circleRequested: Boolean(data.viewerState?.circleRequested || data.circleRequested),
    followingJourney: Boolean(data.viewerState?.followingJourney || data.journey?.followedByMe),
  };

  return {
    _id: getId(data),
    type: item.type,
    originalType: item.originalType || item.type,
    author: data.author || data.creator || data.user || null,
    text: data.content || data.description || data.text || data.title || "",
    media: data.media || data.images || [],
    createdAt: item.createdAt,
    score: Math.round((item.score || 0) * 100) / 100,
    engagement,
    viewerState,
    data: {
      ...data,
      score: item.score,
      engagement,
      viewerState,
    },
  };
};

const fetchCandidates = async ({ tab, page, limit, cursor, followingIds, circleIds, followedJourneyIds }) => {
  const cap = Math.min(CANDIDATE_CAP, Math.max(limit * (page + 5), 60));
  // For You is score-ranked, so a date cursor can skip newer low-score items
  // forever. Fetch the same candidate window and paginate after ranking.
  const byCursor = tab === "for-you" ? {} : cursorQuery(cursor);
  const followingAuthorIds = [...new Set([...followingIds, ...circleIds])].filter(Boolean);
  const includePosts = tab === "for-you" || tab === "following";
  const includeLearning = tab === "for-you" || tab === "following" || tab === "learning";
  const includeMilestones = tab === "for-you" || tab === "following" || tab === "journeys";
  // Opportunities/Jobs and Projects are held back for this release (routes
  // unmounted in app.js) — force these off so the feed never surfaces cards
  // linking to endpoints that no longer exist. Flip back alongside app.js.
  const includeJobs = false;
  const includeProjects = false;
  const onlyFollowing = tab === "following";
  const noRelationshipFilter = { _id: { $exists: false } };
  const followingAuthorQuery = followingAuthorIds.length
    ? { $in: followingAuthorIds }
    : noRelationshipFilter;
  const followingMilestoneQuery =
    followingAuthorIds.length || followedJourneyIds.length
      ? {
          $or: [
            ...(followingAuthorIds.length ? [{ creator: { $in: followingAuthorIds } }] : []),
            ...(followedJourneyIds.length ? [{ journey: { $in: followedJourneyIds } }] : []),
          ],
        }
      : noRelationshipFilter;

  const queries = [];

  if (includePosts) {
    queries.push(
      Post.find({
        isDeleted: false,
        ...byCursor,
        ...(onlyFollowing ? { author: followingAuthorQuery } : {}),
      })
        .populate("author", authorFields)
        .populate("reposts.user", authorFields)
        .populate("comments.user", commenterFields)
        .sort({ createdAt: -1, _id: -1 })
        .limit(cap)
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (includeLearning) {
    queries.push(
      Learning.find({
        isDeleted: false,
        ...byCursor,
        ...(onlyFollowing ? { creator: followingAuthorQuery } : {}),
      })
        .populate("creator", authorFields)
        .sort({ createdAt: -1, _id: -1 })
        .limit(cap)
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (includeJobs) {
    queries.push(
      Opportunity.find({
        isDeleted: false,
        isActive: true,
        ...(tab === "jobs" ? { type: "job" } : {}),
        ...byCursor,
      })
        .populate("creator", authorFields)
        .sort({ createdAt: -1, _id: -1 })
        .limit(cap)
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (includeMilestones) {
    queries.push(
      JourneyMilestone.find({
        isDeleted: false,
        ...byCursor,
        ...(onlyFollowing ? followingMilestoneQuery : {}),
      })
        .populate("creator", authorFields)
        .populate({
          path: "journey",
          match: {
            isDeleted: false,
            isPublic: true,
            status: { $in: ["active", "uncompleted"] },
          },
          select:
            "title description coverImage targetDays totalDays updatesCount followersCount creator status isActive uncompletedReason uncompletedAt finalNote finalNoteAt",
        })
        .sort({ createdAt: -1, _id: -1 })
        .limit(cap)
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (includeProjects) {
    queries.push(
      Project.find({
        isDeleted: false,
        isPublic: true,
        ...byCursor,
        ...(onlyFollowing ? { creator: followingAuthorQuery } : {}),
      })
        .populate("creator", authorFields)
        .sort({ createdAt: -1, _id: -1 })
        .limit(cap)
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  const [posts, learnings, opportunities, milestones, projects] = await Promise.all(queries);
  const followedJourneySet = new Set(followedJourneyIds);

  return [
    ...posts.map((doc) => ({ type: "post", data: toPlain(doc), createdAt: doc.createdAt })),
    ...learnings.map((doc) => ({ type: "learning", data: toPlain(doc), createdAt: doc.createdAt })),
    ...opportunities.map((doc) => ({
      type: doc.type === "job" ? "job" : "opportunity",
      originalType: "opportunity",
      data: toPlain(doc),
      createdAt: doc.createdAt,
    })),
    ...milestones
      .filter((doc) => {
        if (!doc.journey) return false;
        if (tab !== "following") return true;
        return (
          followedJourneySet.has(getId(doc.journey)) ||
          followingAuthorIds.includes(getId(doc.creator))
        );
      })
      .map((doc) => ({ type: "journey_milestone", data: toPlain(doc), createdAt: doc.createdAt })),
    ...projects.map((doc) => ({ type: "project", data: toPlain(doc), createdAt: doc.createdAt })),
  ];
};

const attachViewerState = async ({
  items,
  userId,
  circleSet,
  pendingCircleSet,
  followedJourneySet,
  followingSet,
}) => {
  const learningIds = items.filter((item) => item.type === "learning").map((item) => item.data._id);
  const milestoneIds = items
    .filter((item) => item.type === "journey_milestone")
    .map((item) => item.data._id);

  const [
    myLearningLikes,
    myLearningReposts,
    myLearningSaves,
    myMilestoneLikes,
    myMilestoneReposts,
    myMilestoneSaves,
    milestoneComments,
  ] = await Promise.all([
    learningIds.length ? LearningLike.find({ user: userId, learning: { $in: learningIds } }).select("learning") : [],
    learningIds.length
      ? LearningRepost.find({ user: userId, learning: { $in: learningIds } }).select(
          "learning caption text thought repostText quote"
        )
      : [],
    learningIds.length ? LearningSave.find({ user: userId, learning: { $in: learningIds } }).select("learning") : [],
    milestoneIds.length
      ? JourneyMilestoneLike.find({ user: userId, milestone: { $in: milestoneIds } }).select("milestone")
      : [],
    milestoneIds.length
      ? JourneyMilestoneRepost.find({ user: userId, milestone: { $in: milestoneIds } }).select(
          "milestone caption text thought repostText quote"
        )
      : [],
    milestoneIds.length
      ? JourneyMilestoneSave.find({ user: userId, milestone: { $in: milestoneIds } }).select("milestone")
      : [],
    milestoneIds.length
      ? JourneyMilestoneComment.find({ milestone: { $in: milestoneIds } })
          .populate("user", commenterFields)
          .sort({ createdAt: -1 })
          .limit(500)
      : [],
  ]);

  const setFrom = (docs, field) => new Set(docs.map((doc) => getId(doc[field])));
  const likedLearningSet = setFrom(myLearningLikes, "learning");
  const savedLearningSet = setFrom(myLearningSaves, "learning");
  const repostedLearningSet = setFrom(myLearningReposts, "learning");
  const likedMilestoneSet = setFrom(myMilestoneLikes, "milestone");
  const savedMilestoneSet = setFrom(myMilestoneSaves, "milestone");
  const repostedMilestoneSet = setFrom(myMilestoneReposts, "milestone");
  const learningRepostMap = new Map(myLearningReposts.map((doc) => [getId(doc.learning), doc]));
  const milestoneRepostMap = new Map(myMilestoneReposts.map((doc) => [getId(doc.milestone), doc]));
  const milestoneCommentsMap = new Map();

  for (const comment of milestoneComments) {
    const id = getId(comment.milestone);
    if (!milestoneCommentsMap.has(id)) milestoneCommentsMap.set(id, []);
    milestoneCommentsMap.get(id).push(comment);
  }

  return items.map((item) => {
    const id = getId(item.data);
    let data = withAuthorState(
      item.data,
      userId,
      followingSet,
      circleSet,
      pendingCircleSet
    );

    if (item.type === "post") {
      const myRepost = getMyRepost(data.reposts, userId);
      data = {
        ...data,
        likesCount: data.likes?.length || 0,
        commentsCount: data.comments?.filter?.((comment) => !comment.isDeleted)?.length || 0,
        repliesCount: data.comments?.filter?.((comment) => !comment.isDeleted)?.length || 0,
        repostsCount: data.reposts?.length || 0,
        sharesCount: data.shares?.length || 0,
        savesCount: data.saves?.length || 0,
        likedByMe: hasUser(data.likes, userId),
        savedByMe: hasUser(data.saves, userId),
        repostedByMe: Boolean(myRepost),
        repostText: getRepostText(myRepost),
        myRepost,
        circleProof: buildCircleProof(data.comments, circleSet, userId),
      };
    }

    if (item.type === "learning") {
      const myRepost = learningRepostMap.get(id);
      data = {
        ...data,
        author: data.creator,
        likedByMe: likedLearningSet.has(id),
        repostedByMe: repostedLearningSet.has(id),
        savedByMe: savedLearningSet.has(id),
        repostText: getRepostText(myRepost),
        myRepost,
        repliesCount: data.commentsCount || 0,
      };
    }

    if (item.type === "journey_milestone") {
      const journeyId = getId(data.journey);
      const myRepost = milestoneRepostMap.get(id);
      const comments = milestoneCommentsMap.get(id) || [];
      const latestComment = comments.find((comment) => !comment.isDeleted && comment.user);

      data = {
        ...data,
        likedByMe: likedMilestoneSet.has(id),
        repostedByMe: repostedMilestoneSet.has(id),
        savedByMe: savedMilestoneSet.has(id),
        repostText: getRepostText(myRepost),
        myRepost,
        repliesCount: comments.length,
        commentsCount: comments.length,
        circleProof: buildCircleProof(comments, circleSet, userId),
        topComment: latestComment
          ? {
              text: latestComment.text,
              createdAt: latestComment.createdAt,
              user: latestComment.user,
            }
          : null,
        journey: data.journey
          ? {
              ...data.journey,
              followedByMe: followedJourneySet.has(journeyId),
            }
          : data.journey,
        viewerState: {
          ...(data.viewerState || {}),
          followingJourney: followedJourneySet.has(journeyId),
        },
      };
    }

    if (item.type === "project") {
      data = { ...data, author: data.creator };
    }

    if (item.type === "job" || item.type === "opportunity") {
      data = { ...data, author: data.creator };
    }

    return { ...item, data };
  });
};

export const getUniversalFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const tab = VALID_TABS.has(req.query.tab) ? req.query.tab : "for-you";
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    const sessionId = cleanText(req.query.sessionId).slice(0, 120);

    const followingIds = (req.user.following || []).map(getId).filter(Boolean);
    const circleIds = (req.user.circle || []).map(getId).filter(Boolean);
    const followingSet = new Set(followingIds);
    const circleSet = new Set(circleIds);

    const [followingJourneys, pendingCircleRequests] = await Promise.all([
      JourneyFollower.find({ follower: userId }).select("journey"),
      CircleRequest.find({ sender: userId, status: "pending" }).select("receiver"),
    ]);
    const followedJourneyIds = followingJourneys.map((item) => getId(item.journey)).filter(Boolean);
    const followedJourneySet = new Set(followedJourneyIds);
    const pendingCircleSet = new Set(
      pendingCircleRequests.map((item) => getId(item.receiver)).filter(Boolean)
    );

    const [rawCandidates, seenDocs] = await Promise.all([
      fetchCandidates({
        tab,
        page,
        limit,
        cursor,
        followingIds,
        circleIds,
        followedJourneyIds,
      }),
      FeedView.find({
        user: userId,
        ...(sessionId ? { sessionId: { $ne: sessionId } } : {}),
      }).sort({ createdAt: -1 }).limit(500).select("itemId itemType"),
    ]);

    const seenSet = new Set(seenDocs.map((item) => `${item.itemType}:${getId(item.itemId)}`));
    const myBlockedSet = new Set((req.user.blockedUsers || []).map(getId));
    const uniqueMap = new Map();

    for (const item of rawCandidates) {
      const id = getId(item.data);
      if (!id) continue;

      const author = item.data.author || item.data.creator || item.data.user;
      if (isBlockedRelation(author, userId, myBlockedSet)) continue;

      const key = `${item.type}:${id}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    }

    let candidates = await attachViewerState({
      items: [...uniqueMap.values()],
      userId,
      circleSet,
      pendingCircleSet,
      followedJourneySet,
      followingSet,
    });

    candidates = candidates.map((item) => ({
      ...item,
      score: scoreItem({
        type: item.type,
        data: item.data,
        viewer: req.user,
        followingSet,
        circleSet,
        followedJourneySet,
        seenSet,
      }),
    }));

    candidates.sort((a, b) => {
      if (tab === "following") return new Date(b.createdAt) - new Date(a.createdAt);
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const pageStart = tab === "for-you" ? (page - 1) * limit : 0;
    const pageEnd = pageStart + limit;
    const paged = candidates.slice(pageStart, pageEnd);
    const normalized = paged.map(buildNormalizedItem);
    const hasMore = tab === "for-you"
      ? candidates.length > pageEnd
      : normalized.length === limit;
    const nextCursor = hasMore && paged.length ? encodeCursor(paged[paged.length - 1]) : null;

    return res.status(200).json({
      success: true,
      items: normalized,
      feed: normalized.map((item) => ({
        type: item.type,
        originalType: item.originalType,
        data: item.data,
        createdAt: item.createdAt,
        score: item.score,
        engagement: item.engagement,
        viewerState: item.viewerState,
      })),
      nextCursor,
      hasMore,
      page,
      limit,
      count: normalized.length,
    });
  } catch (error) {
    console.error("GET UNIVERSAL FEED ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load feed",
    });
  }
};

export const trackFeedImpressions = async (req, res) => {
  try {
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No impressions to track",
      });
    }

    const allowedTypes = [
      "post",
      "learning",
      "journey_milestone",
      "repost",
      "opportunity",
      "project",
      "job",
    ];

    const normalizedItems = items
      .map((item) => ({
        itemId: item?.itemId || item?.id,
        itemType: item?.itemType || item?.type,
        visibleMs: Math.max(Number(item?.visibleMs) || 0, 0),
        position: Math.max(Number(item?.position) || 0, 0),
        sessionId: cleanText(item?.sessionId).slice(0, 120),
      }))
      .filter(
        (item) =>
          item.itemId &&
          mongoose.Types.ObjectId.isValid(item.itemId) &&
          allowedTypes.includes(item.itemType) &&
          item.sessionId
      )
      .slice(0, 80);

    // A single request can contain the same item more than once. Collapse it
    // before touching either FeedView or the public impression counter.
    const cleanItems = [...new Map(
      normalizedItems.map((item) => [`${item.itemType}:${item.itemId}:${item.sessionId}`, item])
    ).values()];

    if (!cleanItems.length) {
      return res.status(200).json({ success: true, count: 0 });
    }

    // Insert-first makes the compound unique index the source of truth. Only
    // the request that creates a new (user, item, type, session) record is
    // allowed to increment the item's public impression count. Duplicate
    // observer calls and request retries update duration/position but add 0.
    const insertionResults = await Promise.all(
      cleanItems.map(async (item) => {
        try {
          await FeedView.create({
            user: req.user._id,
            itemId: item.itemId,
            itemType: item.itemType,
            sessionId: item.sessionId,
            visibleMs: item.visibleMs,
            position: item.position,
          });
          return { item, isNew: true };
        } catch (error) {
          if (error?.code !== 11000) throw error;
          await FeedView.updateOne(
            {
              user: req.user._id,
              itemId: item.itemId,
              itemType: item.itemType,
              sessionId: item.sessionId,
            },
            {
              $max: { visibleMs: item.visibleMs },
              $set: { position: item.position },
            }
          );
          return { item, isNew: false };
        }
      })
    );

    const newItems = insertionResults.filter((result) => result.isNew).map((result) => result.item);
    const byType = (type) =>
      newItems.filter((item) => item.itemType === type).map((item) => item.itemId);

    const postIds = byType("post");
    const learningIds = byType("learning");
    const milestoneIds = byType("journey_milestone");
    const opportunityIds = [...byType("opportunity"), ...byType("job")];
    const projectIds = byType("project");

    await Promise.all([
      postIds.length ? Post.updateMany({ _id: { $in: postIds } }, { $inc: { impressionsCount: 1 } }) : null,
      learningIds.length
        ? Learning.updateMany({ _id: { $in: learningIds } }, { $inc: { impressionsCount: 1 } })
        : null,
      milestoneIds.length
        ? JourneyMilestone.updateMany({ _id: { $in: milestoneIds } }, { $inc: { impressionsCount: 1 } })
        : null,
      opportunityIds.length
        ? Opportunity.updateMany({ _id: { $in: opportunityIds } }, { $inc: { impressionsCount: 1 } })
        : null,
      projectIds.length
        ? Project.updateMany({ _id: { $in: projectIds } }, { $inc: { impressionsCount: 1 } })
        : null,
    ]);

    return res.status(200).json({
      success: true,
      message: "Impressions tracked",
      count: newItems.length,
      duplicatesIgnored: cleanItems.length - newItems.length,
    });
  } catch (error) {
    console.error("TRACK FEED IMPRESSIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to track impressions",
    });
  }
};
