import User from "../models/User.js";
import Post from "../models/Post.js";
import Learning from "../models/Learning.js";
import Opportunity from "../models/Opportunity.js";
import Journey from "../models/Journey.js";
import Circle from "../models/Circle.js";

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchRegex = new RegExp(q.trim(), "i");

    const [users, posts, learnings, opportunities, journeys, circles] =
      await Promise.all([
        User.find({
          $or: [
            { fullName: searchRegex },
            { name: searchRegex },
            { headline: searchRegex },
            { skills: searchRegex },
            { location: searchRegex },
          ],
        })
          .select("fullName name avatar headline role location skills")
          .limit(10),

        Post.find({
          isDeleted: false,
          content: searchRegex,
        })
          .populate("author", "fullName name avatar headline")
          .sort({ createdAt: -1 })
          .limit(10),

        Learning.find({
          isDeleted: false,
          $or: [
            { title: searchRegex },
            { content: searchRegex },
            { tags: searchRegex },
          ],
        })
          .populate("creator", "fullName name avatar headline")
          .sort({ createdAt: -1 })
          .limit(10),

        Opportunity.find({
          isDeleted: false,
          isActive: true,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { companyName: searchRegex },
            { skills: searchRegex },
          ],
        })
          .populate("creator", "fullName name avatar headline")
          .sort({ createdAt: -1 })
          .limit(10),

        Journey.find({
          isDeleted: false,
          isPublic: true,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
          ],
        })
          .populate("creator", "fullName name avatar headline")
          .sort({ createdAt: -1 })
          .limit(10),

        Circle.find({
          isDeleted: false,
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
          ],
        })
          .populate("creator", "fullName name avatar headline")
          .sort({ membersCount: -1, createdAt: -1 })
          .limit(10),
      ]);

    res.status(200).json({
      success: true,
      query: q,
      results: {
        users,
        posts,
        learnings,
        opportunities,
        journeys,
        circles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};