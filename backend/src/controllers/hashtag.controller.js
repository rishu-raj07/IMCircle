import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import { getTrendingHashtags, searchHashtags } from "../services/contentParsing.service.js";

const AUTHOR_FIELDS = "fullName username avatar headline field role gender";

export const trending = async (req, res) => {
  try {
    const hashtags = await getTrendingHashtags(Number(req.query.limit) || 15);
    res.status(200).json({ success: true, hashtags });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const search = async (req, res) => {
  try {
    const hashtags = await searchHashtags(req.query.q, Number(req.query.limit) || 15);
    res.status(200).json({ success: true, hashtags });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// A tag's public feed — searches the same free-text fields the parser
// extracted "#tag" out of, across the three content types that carry
// meaningful public text. Regex-on-read rather than an indexed hashtags
// array on each model: fewer schema changes across content types, at the
// cost of not being index-accelerated — acceptable while hashtag volume
// is low, and revisit with a dedicated indexed array if it ever isn't.
export const getHashtagFeed = async (req, res) => {
  try {
    const tag = String(req.params.tag || "").trim().toLowerCase().replace(/^#/, "");
    if (!tag) {
      return res.status(400).json({ success: false, message: "A hashtag is required." });
    }

    const regex = new RegExp(`#${tag}\\b`, "i");
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const [posts, learnings, milestones] = await Promise.all([
      Post.find({ content: regex, isDeleted: { $ne: true } })
        .populate("author", AUTHOR_FIELDS)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Learning.find({ content: regex, isDeleted: { $ne: true } })
        .populate("creator", AUTHOR_FIELDS)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      JourneyMilestone.find({
        isDeleted: { $ne: true },
        $or: [{ title: regex }, { description: regex }],
      })
        .populate("creator", AUTHOR_FIELDS)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const items = [
      ...posts.map((item) => ({ type: "post", data: item, createdAt: item.createdAt })),
      ...learnings.map((item) => ({ type: "learning", data: item, createdAt: item.createdAt })),
      ...milestones.map((item) => ({ type: "journey_milestone", data: item, createdAt: item.createdAt })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, tag, items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
