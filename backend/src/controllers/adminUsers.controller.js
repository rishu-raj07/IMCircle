import User from "../models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import Journey from "../models/Journey.js";
import {
  hideContentForDeletedAccount,
  restoreContentForDeletedAccount,
} from "../utils/accountDeletion.js";

const publicFields =
  "fullName username mobile email avatar profilePicture profileImage photo photoURL picture coverImage headline bio role field primaryInterest dob gender location stats builderScore journeyStats profileCompletion profileCompletionPercent preferences verification isProfileCompleted onboardingCompleted isBlocked isDeleted createdAt updatedAt lastActiveAt usernameLastChangedAt";

export const listAdminUsers = async (req, res) => {
  try {
    const { q = "", status = "all", page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status === "active") {
      filter.isDeleted = { $ne: true };
      filter.isBlocked = { $ne: true };
    }
    if (status === "suspended") filter.isBlocked = true;
    if (status === "deleted") filter.isDeleted = true;

    if (q.trim()) {
      const keyword = q.trim();
      filter.$or = [
        { fullName: { $regex: keyword, $options: "i" } },
        { username: { $regex: keyword, $options: "i" } },
        { mobile: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select(publicFields).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, users, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(publicFields);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [posts, learnings, journeys, recentPosts, recentJourneys] = await Promise.all([
      Post.countDocuments({ author: user._id, isDeleted: { $ne: true } }),
      Learning.countDocuments({ creator: user._id, isDeleted: { $ne: true } }),
      Journey.countDocuments({ creator: user._id, isDeleted: { $ne: true } }),
      Post.find({ author: user._id })
        .select("content createdAt isDeleted reports")
        .sort({ createdAt: -1 })
        .limit(5),
      Journey.find({ creator: user._id })
        .select("title createdAt isDeleted status reports")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      user,
      contentCount: { posts, learnings, journeys, total: posts + learnings + journeys },
      recentContent: {
        posts: recentPosts.map((post) => ({
          id: post._id,
          type: "post",
          preview: post.content?.slice(0, 140) || "",
          createdAt: post.createdAt,
          isDeleted: post.isDeleted,
          reportCount: post.reports?.length || 0,
        })),
        journeys: recentJourneys.map((journey) => ({
          id: journey._id,
          type: "journey",
          preview: journey.title || "",
          createdAt: journey.createdAt,
          isDeleted: journey.isDeleted,
          status: journey.status,
          reportCount: journey.reports?.length || 0,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const suspendAdminUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: true },
      { new: true }
    ).select(publicFields);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await AnalyticsEvent.create({
      user: user._id,
      sessionId: `admin-${req.admin._id}`,
      eventName: "user_suspended_by_admin",
      entityType: "user",
      entityId: user._id,
      metadata: { admin: req.admin._id },
      ip: req.ip,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const unsuspendAdminUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: false },
      { new: true }
    ).select(publicFields);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await AnalyticsEvent.create({
      user: user._id,
      sessionId: `admin-${req.admin._id}`,
      eventName: "user_unsuspended_by_admin",
      entityType: "user",
      entityId: user._id,
      metadata: { admin: req.admin._id },
      ip: req.ip,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const softDeleteAdminUser = async (req, res) => {
  try {
    await hideContentForDeletedAccount(req.params.userId);

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isDeleted: true },
      { new: true }
    ).select(publicFields);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await AnalyticsEvent.create({
      user: user._id,
      sessionId: `admin-${req.admin._id}`,
      eventName: "user_deleted_by_admin",
      entityType: "user",
      entityId: user._id,
      metadata: { admin: req.admin._id },
      ip: req.ip,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const restoreAdminUser = async (req, res) => {
  try {
    await restoreContentForDeletedAccount(req.params.userId);

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isDeleted: false },
      { new: true }
    ).select(publicFields);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await AnalyticsEvent.create({
      user: user._id,
      sessionId: `admin-${req.admin._id}`,
      eventName: "user_restored_by_admin",
      entityType: "user",
      entityId: user._id,
      metadata: { admin: req.admin._id },
      ip: req.ip,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
