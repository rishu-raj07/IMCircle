import Post from "../models/Post.js";
import LearningSave from "../models/LearningSave.js";
import JourneyMilestoneSave from "../models/JourneyMilestoneSave.js";
import JourneyMilestoneLike from "../models/JourneyMilestoneLike.js";
import JourneyMilestoneRepost from "../models/JourneyMilestoneRepost.js";
import JourneyMilestoneComment from "../models/JourneyMilestoneComment.js";

const userFields =
  "fullName name username avatar profilePicture profileImage image photo photoURL picture headline role gender";

const hasUser = (list, userId) =>
  Array.isArray(list) &&
  list.some((item) => {
    const id = item?.user ? item.user : item;
    return id?.toString?.() === userId.toString();
  });

export const getSavedItems = async (req, res) => {
  try {
    const userId = req.user._id;

    const [savedPosts, savedLearnings, savedMilestoneLinks] = await Promise.all([
      Post.find({
        saves: userId,
        isDeleted: false,
      })
        .populate("author", userFields)
        .sort({ createdAt: -1 }),

      LearningSave.find({
        user: userId,
      })
        .populate({
          path: "learning",
          match: { isDeleted: false },
          populate: {
            path: "creator",
            select: userFields,
          },
        })
        .sort({ createdAt: -1 }),

      JourneyMilestoneSave.find({
        user: userId,
      })
        .populate({
          path: "milestone",
          match: { isDeleted: false },
          populate: [
            { path: "creator", select: userFields },
            {
              path: "journey",
              select:
                "title description tags coverImage updatesCount followersCount targetDays totalDays creator status isActive",
            },
          ],
        })
        .sort({ createdAt: -1 }),
    ]);

    // Only keep milestones whose journey still exists (and populated) —
    // mirrors the same guard used by the main journey feed controllers.
    const validMilestoneLinks = savedMilestoneLinks.filter(
      (item) => item.milestone && item.milestone.journey
    );

    const milestoneIds = validMilestoneLinks.map((item) => item.milestone._id);

    const [likes, reposts, comments] = await Promise.all([
      JourneyMilestoneLike.find({
        milestone: { $in: milestoneIds },
        user: userId,
      }).select("milestone"),

      JourneyMilestoneRepost.find({
        milestone: { $in: milestoneIds },
        user: userId,
      }).select("milestone"),

      JourneyMilestoneComment.find({
        milestone: { $in: milestoneIds },
      }).select("milestone"),
    ]);

    const likedSet = new Set(likes.map((item) => item.milestone.toString()));
    const repostedSet = new Set(reposts.map((item) => item.milestone.toString()));

    const commentCountMap = new Map();
    for (const comment of comments) {
      const mId = comment.milestone.toString();
      commentCountMap.set(mId, (commentCountMap.get(mId) || 0) + 1);
    }

    const milestones = validMilestoneLinks.map((item) => {
      const obj = item.milestone.toObject();
      const id = obj._id.toString();

      return {
        ...obj,
        likedByMe: likedSet.has(id),
        repostedByMe: repostedSet.has(id),
        savedByMe: true,
        repliesCount: commentCountMap.get(id) || 0,
      };
    });

    const posts = savedPosts.map((post) => {
      const obj = post.toObject();

      return {
        ...obj,
        likedByMe: hasUser(obj.likes, userId),
        repostedByMe: hasUser(obj.reposts, userId),
        savedByMe: true,
      };
    });

    res.status(200).json({
      success: true,
      saved: {
        posts,
        milestones,
        learnings: savedLearnings
          .filter((item) => item.learning)
          .map((item) => item.learning),
        opportunities: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
