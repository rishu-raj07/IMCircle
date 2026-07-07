import AnalyticsEvent from "../models/AnalyticsEvent.js";
import User from "../models/User.js";
import ContentImpression from "../models/ContentImpression.js";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const distinctUsers = (from) =>
  AnalyticsEvent.distinct("user", { createdAt: { $gte: from }, user: { $ne: null } });

export const getAdminAnalyticsOverview = async (req, res) => {
  try {
    const [dau, wau, mau, sessions, eventCounts] = await Promise.all([
      distinctUsers(daysAgo(1)),
      distinctUsers(daysAgo(7)),
      distinctUsers(daysAgo(30)),
      AnalyticsEvent.aggregate([
        { $match: { eventName: "session_end", "metadata.durationMs": { $gt: 0 } } },
        { $group: { _id: "$sessionId", duration: { $max: "$metadata.durationMs" }, user: { $first: "$user" } } },
        { $group: { _id: null, avg: { $avg: "$duration" }, sessions: { $sum: 1 }, users: { $addToSet: "$user" } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { createdAt: { $gte: daysAgo(30) } } },
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const sessionSummary = sessions?.[0] || {};

    res.status(200).json({
      success: true,
      overview: {
        dau: dau.length,
        wau: wau.length,
        mau: mau.length,
        stickiness: mau.length ? Number(((dau.length / mau.length) * 100).toFixed(2)) : 0,
        averageSessionDuration: Math.round(sessionSummary.avg || 0),
        sessionsPerUser: sessionSummary.users?.length
          ? Number((sessionSummary.sessions / sessionSummary.users.length).toFixed(2))
          : 0,
        topEvents: eventCounts,
        retention: { d1: 0, d7: 0, d30: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminAnalyticsEvents = async (req, res) => {
  try {
    const { eventName, page = 1, limit = 50 } = req.query;
    const filter = eventName ? { eventName } : {};
    const events = await AnalyticsEvent.find(filter)
      .populate("user", "fullName username avatar")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminAnalyticsSessions = async (req, res) => {
  try {
    const sessions = await AnalyticsEvent.aggregate([
      { $match: { eventName: { $in: ["session_start", "session_end"] } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$sessionId", user: { $first: "$user" }, lastEventAt: { $first: "$createdAt" }, events: { $sum: 1 } } },
      { $limit: 50 },
    ]);
    res.status(200).json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminAnalyticsScreenTime = async (req, res) => {
  try {
    const screens = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventName: "time_on_screen",
          "metadata.durationMs": { $gt: 0 },
          createdAt: { $gte: daysAgo(30) },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$metadata.path", "$entityId"] },
          avgMs: { $avg: "$metadata.durationMs" },
          totalMs: { $sum: "$metadata.durationMs" },
          views: { $sum: 1 },
        },
      },
      { $sort: { totalMs: -1 } },
      { $limit: 20 },
    ]);

    res.status(200).json({ success: true, screens });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminAnalyticsContent = async (req, res) => {
  try {
    const byType = await ContentImpression.aggregate([
      { $group: { _id: "$contentType", impressions: { $sum: 1 } } },
      { $sort: { impressions: -1 } },
    ]);
    res.status(200).json({ success: true, byType });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminAnalyticsUsers = async (req, res) => {
  try {
    const [totalUsers, active30] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      distinctUsers(daysAgo(30)),
    ]);
    res.status(200).json({ success: true, totalUsers, active30: active30.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
