import ContentImpression from "../models/ContentImpression.js";
import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import Project from "../models/Project.js";
import Circle from "../models/Circle.js";
import CirclePost from "../models/CirclePost.js";
import Opportunity from "../models/Opportunity.js";
import ProfileView from "../models/ProfileView.js";
import User from "../models/User.js";
import SearchEvent from "../models/SearchEvent.js";
import FollowerEvent from "../models/FollowerEvent.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import jwt from "jsonwebtoken";

const getOptionalUserId = (req) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies?.accessToken;
    if (!token) return req.user?._id || null;
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
    );
    return decoded?.id || req.user?._id || null;
  } catch {
    return req.user?._id || null;
  }
};

const getDevice = (req, device = {}) => ({
  platform: device.platform || req.headers["sec-ch-ua-platform"] || "",
  browser: device.browser || "",
  os: device.os || "",
  userAgent: device.userAgent || req.get("user-agent") || "",
});

const createAnalyticsEvent = async (req, payload) => {
  return AnalyticsEvent.create({
    user: getOptionalUserId(req),
    sessionId: payload.sessionId || "unknown",
    eventName: payload.eventName,
    entityType: payload.entityType || "",
    entityId: payload.entityId || null,
    metadata: payload.metadata || {},
    device: getDevice(req, payload.device),
    ip: req.ip,
  });
};

export const trackGenericEvent = async (req, res) => {
  try {
    if (!req.body?.eventName) {
      return res.status(400).json({
        success: false,
        message: "eventName is required",
      });
    }

    const event = await createAnalyticsEvent(req, req.body);
    res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const trackGenericBatch = async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const validEvents = events.filter((event) => event?.eventName).slice(0, 100);

    if (validEvents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid event is required",
      });
    }

    await AnalyticsEvent.insertMany(
      validEvents.map((event) => ({
        user: getOptionalUserId(req),
        sessionId: event.sessionId || "unknown",
        eventName: event.eventName,
        entityType: event.entityType || "",
        entityId: event.entityId || null,
        metadata: event.metadata || {},
        device: getDevice(req, event.device),
        ip: req.ip,
      })),
      { ordered: false }
    );

    res.status(201).json({ success: true, count: validEvents.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
const modelMap = {
  post: Post,
  learning: Learning,
  journey_milestone: JourneyMilestone,
  project: Project,
  circle: Circle,
  circle_post: CirclePost,
  opportunity: Opportunity,
};

export const trackImpression = async (req, res) => {
  try {
    const { contentType, contentId, source } = req.body;

    if (!contentType || !contentId) {
      return res.status(400).json({
        success: false,
        message: "contentType and contentId are required",
      });
    }

    const Model = modelMap[contentType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
      });
    }

    await ContentImpression.create({
      contentType,
      contentId,
      viewer: req.user?._id || null,
      source,
    });

    await Model.findByIdAndUpdate(contentId, {
      $inc: { impressionsCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Impression tracked",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getMyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [posts, learnings, projects, circlePosts] = await Promise.all([
      Post.find({ author: userId, isDeleted: false }).select(
        "content impressionsCount likes comments shares saves createdAt"
      ),

      Learning.find({ creator: userId, isDeleted: false }).select(
        "title content impressionsCount likesCount commentsCount savesCount repostsCount createdAt"
      ),

      Project.find({ creator: userId, isDeleted: false }).select(
        "title impressionsCount followersCount updatesCount createdAt"
      ),

      CirclePost.find({ author: userId, isDeleted: false }).select(
        "title content impressionsCount likes comments saves createdAt"
      ),
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        posts,
        learnings,
        projects,
        circlePosts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getContentAnalytics = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    const Model = modelMap[contentType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
      });
    }

    const content = await Model.findById(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    const impressions = await ContentImpression.countDocuments({
      contentType,
      contentId,
    });

    res.status(200).json({
      success: true,
      analytics: {
        contentType,
        contentId,
        impressions,
        storedImpressions: content.impressionsCount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const trackProfileView = async (req, res) => {
  try {
    const { userId } = req.params;
    const { source } = req.body;

    const profileUser = await User.findById(userId);

    if (!profileUser) {
      return res.status(404).json({
        success: false,
        message: "Profile user not found",
      });
    }

    await ProfileView.create({
      profileUser: userId,
      viewer: req.user?._id || null,
      source,
    });

    res.status(201).json({
      success: true,
      message: "Profile view tracked",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getProfileAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;

    const totalViews = await ProfileView.countDocuments({
      profileUser: userId,
    });

    const searchViews = await ProfileView.countDocuments({
      profileUser: userId,
      source: "search",
    });

    const feedViews = await ProfileView.countDocuments({
      profileUser: userId,
      source: "feed",
    });

    const directViews = await ProfileView.countDocuments({
      profileUser: userId,
      source: "direct",
    });

    res.status(200).json({
      success: true,
      analytics: {
        profileUser: userId,
        totalViews,
        searchViews,
        feedViews,
        directViews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getPostAnalytics = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).select(
      "author impressionsCount likes comments shares saves"
    );

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const impressions = post.impressionsCount || 0;
    const likes = post.likes?.length || 0;
    const comments = post.comments?.length || 0;
    const shares = post.shares?.length || 0;
    const saves = post.saves?.length || 0;

    const totalEngagement = likes + comments + shares + saves;

    const engagementRate =
      impressions > 0
        ? Number(((totalEngagement / impressions) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        postId,
        impressions,
        likes,
        comments,
        shares,
        saves,
        totalEngagement,
        engagementRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getLearningAnalytics = async (req, res) => {
  try {
    const { learningId } = req.params;

    const learning = await Learning.findById(learningId).select(
      "impressionsCount likesCount commentsCount savesCount repostsCount"
    );

    if (!learning || learning.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const impressions = learning.impressionsCount || 0;
    const likes = learning.likesCount || 0;
    const comments = learning.commentsCount || 0;
    const saves = learning.savesCount || 0;
    const reposts = learning.repostsCount || 0;

    const totalEngagement =
      likes + comments + saves + reposts;

    const engagementRate =
      impressions > 0
        ? Number(
            ((totalEngagement / impressions) * 100).toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        learningId,
        impressions,
        likes,
        comments,
        saves,
        reposts,
        totalEngagement,
        engagementRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).select(
      "impressionsCount followersCount updatesCount"
    );

    if (!project || project.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const impressions = project.impressionsCount || 0;
    const followers = project.followersCount || 0;
    const updates = project.updatesCount || 0;

    const engagementRate =
      impressions > 0
        ? Number((((followers + updates) / impressions) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        projectId,
        impressions,
        followers,
        updates,
        engagementRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getJourneyAnalytics = async (req, res) => {
  try {
    const { journeyId } = req.params;

    const milestones = await JourneyMilestone.find({
      journey: journeyId,
      isDeleted: false,
    }).select("impressionsCount likesCount commentsCount");

    const impressions = milestones.reduce(
      (sum, item) => sum + (item.impressionsCount || 0),
      0
    );

    const likes = milestones.reduce(
      (sum, item) => sum + (item.likesCount || 0),
      0
    );

    const comments = milestones.reduce(
      (sum, item) => sum + (item.commentsCount || 0),
      0
    );

    const totalEngagement = likes + comments;

    const engagementRate =
      impressions > 0
        ? Number(((totalEngagement / impressions) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        journeyId,
        milestonesCount: milestones.length,
        impressions,
        likes,
        comments,
        totalEngagement,
        engagementRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getCircleAnalytics = async (req, res) => {
  try {
    const { circleId } = req.params;

    const circle = await Circle.findById(circleId).select(
      "impressionsCount membersCount postsCount"
    );

    if (!circle || circle.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Circle not found",
      });
    }

    const circlePosts = await CirclePost.find({
      circle: circleId,
      isDeleted: false,
    }).select("impressionsCount likes comments saves");

    const postImpressions = circlePosts.reduce(
      (sum, post) => sum + (post.impressionsCount || 0),
      0
    );

    const likes = circlePosts.reduce(
      (sum, post) => sum + (post.likes?.length || 0),
      0
    );

    const comments = circlePosts.reduce(
      (sum, post) => sum + (post.comments?.length || 0),
      0
    );

    const saves = circlePosts.reduce(
      (sum, post) => sum + (post.saves?.length || 0),
      0
    );

    const totalEngagement = likes + comments + saves;

    const totalImpressions =
      (circle.impressionsCount || 0) + postImpressions;

    const engagementRate =
      totalImpressions > 0
        ? Number(((totalEngagement / totalImpressions) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        circleId,
        circleImpressions: circle.impressionsCount || 0,
        postImpressions,
        totalImpressions,
        members: circle.membersCount || 0,
        posts: circle.postsCount || circlePosts.length,
        likes,
        comments,
        saves,
        totalEngagement,
        engagementRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const trackSearchEvent = async (req, res) => {
  try {
    const { query, resultType, resultId, owner, action } = req.body;

    if (!query || !action) {
      return res.status(400).json({
        success: false,
        message: "Query and action are required",
      });
    }

    const event = await SearchEvent.create({
      searcher: req.user?._id || null,
      query,
      resultType,
      resultId,
      owner,
      action,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getMySearchAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const appearances = await SearchEvent.countDocuments({
      owner: userId,
      action: "appeared",
    });

    const clicks = await SearchEvent.countDocuments({
      owner: userId,
      action: "clicked",
    });

    const topKeywords = await SearchEvent.aggregate([
      {
        $match: {
          owner: userId,
        },
      },
      {
        $group: {
          _id: "$query",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        appearances,
        clicks,
        topKeywords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getFollowerGrowthAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const follows = await FollowerEvent.countDocuments({
      user: userId,
      action: "follow",
    });

    const unfollows = await FollowerEvent.countDocuments({
      user: userId,
      action: "unfollow",
    });

    const recentEvents = await FollowerEvent.find({
      user: userId,
    })
      .populate("follower", "fullName username avatar headline")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      analytics: {
        follows,
        unfollows,
        netGrowth: follows - unfollows,
        recentEvents,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getMyAnalyticsDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      profileViews,
      searchAppearances,
      searchClicks,
      followerGrowth,
      posts,
      learnings,
      projects,
      circlePosts,
    ] = await Promise.all([
      ProfileView.countDocuments({ profileUser: userId }),

      SearchEvent.countDocuments({
        owner: userId,
        action: "appeared",
      }),

      SearchEvent.countDocuments({
        owner: userId,
        action: "clicked",
      }),

      FollowerEvent.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20),

      Post.find({ author: userId, isDeleted: false }).select(
        "content impressionsCount likes comments shares saves createdAt"
      ),

      Learning.find({ creator: userId, isDeleted: false }).select(
        "title impressionsCount likesCount commentsCount savesCount repostsCount createdAt"
      ),

      Project.find({ creator: userId, isDeleted: false }).select(
        "title impressionsCount followersCount updatesCount createdAt"
      ),

      CirclePost.find({ author: userId, isDeleted: false }).select(
        "title impressionsCount likes comments saves createdAt"
      ),
    ]);

    const totalPostImpressions = posts.reduce(
      (sum, post) => sum + (post.impressionsCount || 0),
      0
    );

    const totalLearningImpressions = learnings.reduce(
      (sum, item) => sum + (item.impressionsCount || 0),
      0
    );

    const totalProjectImpressions = projects.reduce(
      (sum, item) => sum + (item.impressionsCount || 0),
      0
    );

    const follows = followerGrowth.filter(
      (item) => item.action === "follow"
    ).length;

    const unfollows = followerGrowth.filter(
      (item) => item.action === "unfollow"
    ).length;

    res.status(200).json({
      success: true,
      dashboard: {
        overview: {
          profileViews,
          searchAppearances,
          searchClicks,
          follows,
          unfollows,
          netFollowerGrowth: follows - unfollows,
          totalPostImpressions,
          totalLearningImpressions,
          totalProjectImpressions,
        },
        posts,
        learnings,
        projects,
        circlePosts,
        recentFollowerEvents: followerGrowth,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
