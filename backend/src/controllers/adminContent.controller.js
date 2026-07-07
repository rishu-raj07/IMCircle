import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const config = {
  posts: { model: Post, owner: "author", title: "content", type: "post" },
  learning: { model: Learning, owner: "creator", title: "content", type: "learning" },
  journeys: { model: Journey, owner: "creator", title: "title", type: "journey" },
  milestones: { model: JourneyMilestone, owner: "creator", title: "title", type: "journey_milestone" },
};

const contentProjection = "content title description media images coverImage createdAt isDeleted reports impressionsCount likesCount commentsCount repostsCount";

export const listAdminContent = async (req, res) => {
  try {
    const { type = "posts", reported = "false", page = 1, limit = 20 } = req.query;
    const selected = config[type] || config.posts;
    const filter = {};

    if (reported === "true") filter["reports.0"] = { $exists: true };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      selected.model
        .find(filter)
        .select(contentProjection)
        .populate(selected.owner, "fullName username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      selected.model.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, type, items, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAdminContentDetail = async (req, res) => {
  try {
    const selected = config[req.params.type];
    if (!selected) return res.status(400).json({ success: false, message: "Invalid content type" });

    const item = await selected.model
      .findById(req.params.contentId)
      .select(contentProjection)
      .populate(selected.owner, "fullName username avatar mobile email isBlocked")
      .populate("reports.user", "fullName username avatar");

    if (!item) return res.status(404).json({ success: false, message: "Content not found" });

    res.status(200).json({ success: true, type: req.params.type, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const updateAdminContentVisibility = async (req, res) => {
  try {
    const selected = config[req.params.type];
    if (!selected) return res.status(400).json({ success: false, message: "Invalid content type" });

    const hide = req.body.action !== "restore";
    const item = await selected.model.findByIdAndUpdate(
      req.params.contentId,
      { isDeleted: hide },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: "Content not found" });

    await AnalyticsEvent.create({
      user: item[selected.owner] || null,
      sessionId: `admin-${req.admin._id}`,
      eventName: hide ? "content_removed_by_admin" : "content_restored_by_admin",
      entityType: selected.type,
      entityId: item._id,
      metadata: { admin: req.admin._id },
      ip: req.ip,
    });

    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
