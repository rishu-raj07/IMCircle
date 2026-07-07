import User from "../models/User.js";
import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import JourneyMilestoneComment from "../models/JourneyMilestoneComment.js";
import JourneyMilestoneRepost from "../models/JourneyMilestoneRepost.js";
import LearningComment from "../models/LearningComment.js";
import LearningRepost from "../models/LearningRepost.js";
import ContentImpression from "../models/ContentImpression.js";
import ProfileView from "../models/ProfileView.js";
import SearchEvent from "../models/SearchEvent.js";
import ProblemReport from "../models/ProblemReport.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const startOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const eventUsersSince = async (date) => {
  const rows = await AnalyticsEvent.distinct("user", {
    createdAt: { $gte: date },
    user: { $ne: null },
  });
  return rows.length;
};

export const getAdminDashboard = async (req, res) => {
  try {
    const today = startOfDay();

    const [
      totalUsers,
      newUsersToday,
      dau,
      mau,
      totalPosts,
      totalLearningPosts,
      totalJourneys,
      totalJourneyMilestones,
      journeyComments,
      learningComments,
      postDocs,
      learningReposts,
      milestoneReposts,
      totalReports,
      pendingReports,
      suspendedUsers,
      deletedUsers,
      totalImpressions,
      totalProfileViews,
      totalSearches,
      avgSession,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: today } }),
      eventUsersSince(today),
      eventUsersSince(daysAgo(30)),
      Post.countDocuments({ isDeleted: { $ne: true } }),
      Learning.countDocuments({ isDeleted: { $ne: true } }),
      Journey.countDocuments({ isDeleted: { $ne: true } }),
      JourneyMilestone.countDocuments({ isDeleted: { $ne: true } }),
      JourneyMilestoneComment.countDocuments({ isDeleted: { $ne: true } }),
      LearningComment.countDocuments({ isDeleted: { $ne: true } }),
      Post.find({}).select("comments reposts impressionsCount").lean(),
      LearningRepost.countDocuments({}),
      JourneyMilestoneRepost.countDocuments({}),
      ProblemReport.countDocuments({}),
      ProblemReport.countDocuments({ status: { $in: ["open", "reviewing"] } }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ isDeleted: true }),
      ContentImpression.countDocuments({}),
      ProfileView.countDocuments({}),
      SearchEvent.countDocuments({}),
      AnalyticsEvent.aggregate([
        { $match: { eventName: "session_end", "metadata.durationMs": { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$metadata.durationMs" } } },
      ]),
    ]);

    const postComments = postDocs.reduce(
      (sum, post) => sum + (post.comments?.filter((item) => !item.isDeleted).length || 0),
      0
    );
    const postReposts = postDocs.reduce((sum, post) => sum + (post.reposts?.length || 0), 0);

    res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        newUsersToday,
        dau,
        wau: await eventUsersSince(daysAgo(7)),
        mau,
        totalPosts,
        totalLearningPosts,
        totalJourneys,
        totalJourneyMilestones,
        totalCommentsReplies: postComments + journeyComments + learningComments,
        totalReposts: postReposts + learningReposts + milestoneReposts,
        totalReports,
        pendingReports,
        suspendedUsers,
        deletedUsers,
        totalImpressions,
        totalProfileViews,
        totalSearches,
        averageSessionTime: Math.round(avgSession?.[0]?.avg || 0),
        retentionOverview: {
          d1: 0,
          d7: 0,
          d30: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
