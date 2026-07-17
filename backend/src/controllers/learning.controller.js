import { Readable } from "stream";

import Learning from "../models/Learning.js";
import LearningLike from "../models/LearningLike.js";
import LearningComment from "../models/LearningComment.js";
import LearningSave from "../models/LearningSave.js";
import LearningRepost from "../models/LearningRepost.js";
import cloudinary from "../config/cloudinary.js";
import LearningView from "../models/LearningView.js";
import notificationService from "../services/notification.service.js";
import { addBuilderScore } from "../services/builderScore.service.js";
import { deleteExpiredLearnings } from "../services/learningExpiry.service.js";
import { processContentText } from "../services/contentParsing.service.js";

// Shared by repostLearning/shareLearning — lets the original learning's
// owner know someone reposted/shared their learning, same best-effort/
// non-blocking pattern used everywhere else in the app (a failure here
// never fails the repost/share request itself). `dedupe: true` for repost
// (a toggle action) so repost/un-repost/repost again never stacks
// duplicates; share is a one-shot action per click, so no dedupe.
async function notifyLearningOwner({ learning, actor, type = "learning_share", dedupe = false }) {
  try {
    const ownerId = learning?.creator;
    if (!ownerId || String(ownerId) === String(actor._id)) return;

    const actorName = actor.fullName || actor.name || actor.username || "Someone";
    const message =
      type === "learning_repost"
        ? `${actorName} reposted your learning`
        : `${actorName} shared your learning`;

    await notificationService.create({
      recipientId: ownerId,
      actorId: actor._id,
      type,
      entityType: "learning",
      entityId: learning._id,
      message,
      dedupe,
    });
  } catch (notifyError) {
    console.error("Learning share notification skipped:", notifyError.message);
  }
}

async function removeLearningRepostNotification({ learning, actor }) {
  try {
    const ownerId = learning?.creator;
    if (!ownerId) return;

    await notificationService.removeByDedupeKey({
      type: "learning_repost",
      entityType: "learning",
      entityId: learning._id,
      actorId: actor._id,
      recipientId: ownerId,
    });
  } catch (error) {
    console.error("Learning repost notification removal skipped:", error.message);
  }
}

const DAILY_LEARNING_LIMIT = 10;
const LEARNING_VISIBLE_HOURS = 24;

const uploadToCloudinary = (buffer, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

const parseTags = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((tag) => String(tag).trim().replace(/^#/, ""))
        .filter(Boolean);
    }
  } catch {
    return String(value)
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  return [];
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getVisibleLearningDate = () => {
  const date = new Date();
  date.setHours(date.getHours() - LEARNING_VISIBLE_HOURS);
  return date;
};

const getActiveLearningQuery = (extraQuery = {}) => {
  return {
    ...extraQuery,
    isDeleted: false,
    createdAt: {
      $gte: getVisibleLearningDate(),
    },
  };
};

const cleanupExpiredLearnings = async () => {
  await deleteExpiredLearnings();
};

const normalizeCount = async (learningId) => {
  const [likesCount, savesCount, repostsCount, commentsCount] =
    await Promise.all([
      LearningLike.countDocuments({ learning: learningId }),
      LearningSave.countDocuments({ learning: learningId }),
      LearningRepost.countDocuments({ learning: learningId }),
      LearningComment.countDocuments({ learning: learningId }),
    ]);

  await Learning.findByIdAndUpdate(learningId, {
    likesCount,
    savesCount,
    repostsCount,
    commentsCount,
  });

  return {
    likesCount,
    savesCount,
    repostsCount,
    commentsCount,
  };
};

const attachViewerState = async (learning, userId) => {
  if (!learning) return null;

  const learningObj = learning.toObject ? learning.toObject() : learning;
  const learningId = learningObj._id;

  const [liked, saved, reposted, freshCounts] = await Promise.all([
    LearningLike.exists({ learning: learningId, user: userId }),
    LearningSave.exists({ learning: learningId, user: userId }),
    LearningRepost.exists({ learning: learningId, user: userId }),
    normalizeCount(learningId),
  ]);

  return {
    ...learningObj,
    author: learningObj.creator,
    likedByMe: Boolean(liked),
    isLikedByMe: Boolean(liked),
    savedByMe: Boolean(saved),
    isSavedByMe: Boolean(saved),
    repostedByMe: Boolean(reposted),
    isRepostedByMe: Boolean(reposted),
    likesCount: freshCounts.likesCount,
    savesCount: freshCounts.savesCount,
    repostsCount: freshCounts.repostsCount,
    commentsCount: freshCounts.commentsCount,
  };
};

const populateLearning = (query) => {
  return query.populate(
    "creator",
    "fullName name username avatar photo profileImage profilePicture picture headline"
  );
};

const userSelect =
  "fullName name username avatar photo profileImage profilePicture picture headline tagline role gender";

const serializeActivityUser = (user) => {
  const value = user?.toObject ? user.toObject() : user || {};

  return {
    _id: value._id,
    id: value._id,
    fullName: value.fullName,
    name: value.name,
    username: value.username,
    avatar: value.avatar,
    photo: value.photo,
    profileImage: value.profileImage,
    profilePicture: value.profilePicture,
    picture: value.picture,
    headline: value.headline,
    tagline: value.tagline,
    role: value.role,
  };
};

export const createLearning = async (req, res) => {
  try {
    const { title = "", content, type = "learning", topic = "General" } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Learning content is required",
      });
    }

    const { start, end } = getTodayRange();

    const todayCount = await Learning.countDocuments({
      creator: req.user._id,
      isDeleted: false,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    });

    if (todayCount >= DAILY_LEARNING_LIMIT) {
      return res.status(400).json({
        success: false,
        message: "Daily learning limit reached",
      });
    }

    const media = [];

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "imcircle/learnings",
        "image"
      );

      media.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: "image",
      });
    }

    const learning = await Learning.create({
      creator: req.user._id,
      title: title.trim(),
      content: content.trim(),
      type,
      topic,
      tags: parseTags(req.body.tags),
      media,
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      repostsCount: 0,
      sharesCount: 0,
    });

    await addBuilderScore({
      userId: req.user._id,
      type: "LEARNING_SHARED",
      referenceId: learning._id,
      referenceModel: "Learning",
    });

    processContentText({
      text: `${title} ${content}`,
      authorId: req.user._id,
      contentType: "learning",
      contentId: learning._id,
      link: `/learning-view/${learning._id}`,
    }).catch(() => {});

    const populatedLearning = await populateLearning(
      Learning.findById(learning._id)
    );

    const learningWithState = await attachViewerState(
      populatedLearning,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: "Learning published successfully",
      learning: learningWithState,
      remainingToday: Math.max(DAILY_LEARNING_LIMIT - todayCount - 1, 0),
    });
  } catch (error) {
    console.error("Create learning error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to publish learning",
    });
  }
};

export const getLearnings = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const { type, page = 1, limit = 10 } = req.query;
    const query = getActiveLearningQuery();

    if (type) query.type = type;

    const learnings = await populateLearning(
      Learning.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
    );

    const total = await Learning.countDocuments(query);

    const data = await Promise.all(
      learnings.map((learning) => attachViewerState(learning, req.user._id))
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      total,
      learnings: data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getSingleLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await populateLearning(
      Learning.findOne({
        _id: req.params.id,
        isDeleted: false,
      })
    );

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const isExpired = learning.createdAt < getVisibleLearningDate();

    if (isExpired) {
      return res.status(404).json({
        success: false,
        message: "This learning has expired",
      });
    }

    const learningWithState = await attachViewerState(learning, req.user._id);

    return res.status(200).json({
      success: true,
      learning: learningWithState,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getMyLearnings = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const query = getActiveLearningQuery({
      creator: req.user._id,
    });

    const learnings = await populateLearning(
      Learning.find(query).sort({ createdAt: -1 })
    );

    const data = await Promise.all(
      learnings.map((learning) => attachViewerState(learning, req.user._id))
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      learnings: data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getUserLearnings = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const { userId } = req.params;

    const query = getActiveLearningQuery({
      creator: userId,
    });

    const learnings = await populateLearning(
      Learning.find(query).sort({ createdAt: -1 })
    );

    const data = await Promise.all(
      learnings.map((learning) => attachViewerState(learning, req.user._id))
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      learnings: data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const updateLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found or not authorized",
      });
    }

    if (req.body.title !== undefined) {
      learning.title = req.body.title.trim();
    }

    if (req.body.content !== undefined) {
      learning.content = req.body.content.trim();
    }

    if (req.body.type !== undefined) {
      learning.type = req.body.type;
    }

    if (req.body.topic !== undefined) {
      learning.topic = req.body.topic;
    }

    if (req.body.tags !== undefined) {
      learning.tags = parseTags(req.body.tags);
    }

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "imcircle/learnings",
        "image"
      );

      learning.media = [
        {
          url: result.secure_url,
          publicId: result.public_id,
          type: "image",
        },
      ];
    }

    await learning.save();

    const updatedLearning = await populateLearning(
      Learning.findById(learning._id)
    );

    const learningWithState = await attachViewerState(
      updatedLearning,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Learning updated",
      learning: learningWithState,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const deleteLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found or not authorized",
      });
    }

    learning.isDeleted = true;
    await learning.save();

    return res.status(200).json({
      success: true,
      message: "Learning deleted",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const likeLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const alreadyLiked = await LearningLike.exists({
      learning: learning._id,
      user: req.user._id,
    });

    if (alreadyLiked) {
      const likesCount = await LearningLike.countDocuments({
        learning: learning._id,
      });

      learning.likesCount = likesCount;
      await learning.save();

      return res.status(200).json({
        success: true,
        message: "Already liked",
        likedByMe: true,
        isLikedByMe: true,
        likesCount,
      });
    }

    await LearningLike.create({
      learning: learning._id,
      user: req.user._id,
    });

    const likesCount = await LearningLike.countDocuments({
      learning: learning._id,
    });

    learning.likesCount = likesCount;
    await learning.save();

    if (learning.creator) {
      notificationService
        .create({
          recipientId: learning.creator,
          actorId: req.user._id,
          type: "learning_like",
          entityType: "learning",
          entityId: learning._id,
          message: `${req.user.fullName} liked your learning`,
          dedupe: true,
        })
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Learning liked",
      likedByMe: true,
      isLikedByMe: true,
      likesCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      const likesCount = await LearningLike.countDocuments({
        learning: req.params.id,
      });

      await Learning.findByIdAndUpdate(req.params.id, { likesCount });

      return res.status(200).json({
        success: true,
        message: "Already liked",
        likedByMe: true,
        isLikedByMe: true,
        likesCount,
      });
    }

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const unlikeLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    await LearningLike.findOneAndDelete({
      learning: learning._id,
      user: req.user._id,
    });

    const likesCount = await LearningLike.countDocuments({
      learning: learning._id,
    });

    learning.likesCount = likesCount;
    await learning.save();

    if (learning.creator) {
      notificationService
        .removeByDedupeKey({
          type: "learning_like",
          entityType: "learning",
          entityId: learning._id,
          actorId: req.user._id,
          recipientId: learning.creator,
        })
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Learning unliked",
      likedByMe: false,
      isLikedByMe: false,
      likesCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const commentLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const text = req.body.text?.trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const comment = await LearningComment.create({
      learning: learning._id,
      user: req.user._id,
      text,
    });

    const commentsCount = await LearningComment.countDocuments({
      learning: learning._id,
    });

    learning.commentsCount = commentsCount;
    await learning.save();

    if (learning.creator) {
      notificationService
        .create({
          recipientId: learning.creator,
          actorId: req.user._id,
          type: "learning_comment",
          entityType: "learning",
          entityId: learning._id,
          message: `${req.user.fullName} left a thought on your learning`,
        })
        .catch(() => {});
    }

    // @mentions inside a learning comment notify the mentioned person, same
    // as every other content type in the app.
    processContentText({
      text,
      authorId: req.user._id,
      contentType: "comment",
      contentId: comment._id,
      link: `/learning-view/${learning._id}`,
    }).catch(() => {});

    const populatedComment = await LearningComment.findById(comment._id).populate(
      "user",
      "fullName name username avatar photo profileImage profilePicture picture"
    );

    return res.status(201).json({
      success: true,
      comment: populatedComment,
      commentsCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getLearningComments = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
      createdAt: {
        $gte: getVisibleLearningDate(),
      },
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const comments = await LearningComment.find({
      learning: learning._id,
    })
      .populate(
        "user",
        "fullName name username avatar photo profileImage profilePicture picture"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const saveLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const alreadySaved = await LearningSave.exists({
      learning: learning._id,
      user: req.user._id,
    });

    if (alreadySaved) {
      const savesCount = await LearningSave.countDocuments({
        learning: learning._id,
      });

      learning.savesCount = savesCount;
      await learning.save();

      return res.status(200).json({
        success: true,
        message: "Already saved",
        savedByMe: true,
        isSavedByMe: true,
        savesCount,
      });
    }

    await LearningSave.create({
      learning: learning._id,
      user: req.user._id,
    });

    const savesCount = await LearningSave.countDocuments({
      learning: learning._id,
    });

    learning.savesCount = savesCount;
    await learning.save();

    return res.status(200).json({
      success: true,
      message: "Learning saved",
      savedByMe: true,
      isSavedByMe: true,
      savesCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      const savesCount = await LearningSave.countDocuments({
        learning: req.params.id,
      });

      await Learning.findByIdAndUpdate(req.params.id, { savesCount });

      return res.status(200).json({
        success: true,
        message: "Already saved",
        savedByMe: true,
        isSavedByMe: true,
        savesCount,
      });
    }

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const unsaveLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    await LearningSave.findOneAndDelete({
      learning: learning._id,
      user: req.user._id,
    });

    const savesCount = await LearningSave.countDocuments({
      learning: learning._id,
    });

    learning.savesCount = savesCount;
    await learning.save();

    return res.status(200).json({
      success: true,
      message: "Learning unsaved",
      savedByMe: false,
      isSavedByMe: false,
      savesCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getSavedLearnings = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const saved = await LearningSave.find({ user: req.user._id })
      .populate({
        path: "learning",
        match: getActiveLearningQuery(),
        populate: {
          path: "creator",
          select:
            "fullName name username avatar photo profileImage profilePicture picture headline",
        },
      })
      .sort({ createdAt: -1 });

    const learnings = saved.map((item) => item.learning).filter(Boolean);

    const data = await Promise.all(
      learnings.map((learning) => attachViewerState(learning, req.user._id))
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      learnings: data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const repostLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const caption = String(req.body.caption || "").trim().slice(0, 200);

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const existingRepost = await LearningRepost.findOne({
      learning: learning._id,
      user: req.user._id,
    });

    if (existingRepost) {
      if (caption) {
        existingRepost.caption = caption;
        await existingRepost.save();

        const repostsCount = await LearningRepost.countDocuments({
          learning: learning._id,
        });

        learning.repostsCount = repostsCount;
        await learning.save();

        notifyLearningOwner({ learning, actor: req.user, type: "learning_repost", dedupe: true }).catch(() => {});

        return res.status(200).json({
          success: true,
          message: "Learning thought updated",
          repost: existingRepost,
          repostedByMe: true,
          isRepostedByMe: true,
          repostsCount,
        });
      }

      await LearningRepost.findByIdAndDelete(existingRepost._id);

      const repostsCount = await LearningRepost.countDocuments({
        learning: learning._id,
      });

      learning.repostsCount = repostsCount;
      await learning.save();

      removeLearningRepostNotification({ learning, actor: req.user }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: "Learning repost removed",
        repostedByMe: false,
        isRepostedByMe: false,
        repostsCount,
      });
    }

    const repost = await LearningRepost.create({
      learning: learning._id,
      user: req.user._id,
      caption,
    });

    const repostsCount = await LearningRepost.countDocuments({
      learning: learning._id,
    });

    learning.repostsCount = repostsCount;
    await learning.save();

    notifyLearningOwner({ learning, actor: req.user, type: "learning_repost", dedupe: true }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Learning reposted",
      repost,
      repostedByMe: true,
      isRepostedByMe: true,
      repostsCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      const repostsCount = await LearningRepost.countDocuments({
        learning: req.params.id,
      });

      await Learning.findByIdAndUpdate(req.params.id, { repostsCount });

      return res.status(200).json({
        success: true,
        message: "Already reposted",
        repostedByMe: true,
        isRepostedByMe: true,
        repostsCount,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const shareLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    learning.sharesCount = (learning.sharesCount || 0) + 1;
    await learning.save();

    notifyLearningOwner({ learning, actor: req.user, type: "learning_share" }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Learning shared",
      sharesCount: learning.sharesCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
export const viewLearning = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    // Don't count owner's own view
    if (String(learning.creator) === String(req.user._id)) {
      return res.status(200).json({
        success: true,
      });
    }

    const exists = await LearningView.findOne({
      learning: learning._id,
      user: req.user._id,
    });

    if (!exists) {
      await LearningView.create({
        learning: learning._id,
        user: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getLearningViewers = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const viewers = await LearningView.find({
      learning: learning._id,
    })
      .populate(
        "user",
        userSelect
      )
      .sort({ createdAt: -1 });

    const likes = await LearningLike.find({
      learning: learning._id,
    }).select("user");

    const likedUsers = new Set(
      likes.map((item) => String(item.user))
    );

    const data = viewers.map((viewer) => ({
      ...viewer.user.toObject(),
      viewedAt: viewer.createdAt,
      liked: likedUsers.has(String(viewer.user._id)),
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      viewers: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getLearningActivity = async (req, res) => {
  try {
    await cleanupExpiredLearnings();

    const learning = await Learning.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        message: "Learning not found",
      });
    }

    const [views, likes, thoughts] = await Promise.all([
      LearningView.find({ learning: learning._id })
        .populate("user", userSelect)
        .sort({ createdAt: -1 }),
      LearningLike.find({ learning: learning._id })
        .populate("user", userSelect)
        .sort({ createdAt: -1 }),
      LearningRepost.find({
        learning: learning._id,
        caption: { $exists: true, $ne: "" },
      })
        .populate("user", userSelect)
        .sort({ createdAt: -1 }),
    ]);

    const likedUsers = new Set(
      likes.filter((item) => item.user).map((item) => String(item.user._id))
    );

    const viewerItems = views
      .filter((item) => item.user)
      .map((item) => ({
        ...serializeActivityUser(item.user),
        liked: likedUsers.has(String(item.user._id)),
        viewedAt: item.createdAt,
      }));

    const thoughtItems = thoughts
      .filter((item) => item.user && item.caption)
      .map((item) => ({
        ...serializeActivityUser(item.user),
        thought: item.caption,
        thoughtAt: item.createdAt,
      }));

    return res.status(200).json({
      success: true,
      viewersCount: viewerItems.length,
      likesCount: likes.length,
      thoughtsCount: thoughtItems.length,
      viewers: viewerItems,
      likes: viewerItems,
      thoughts: thoughtItems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
