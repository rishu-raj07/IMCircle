import { Readable } from "stream";

import Circle from "../models/Circle.js";
import CircleMember from "../models/CircleMember.js";
import CirclePost from "../models/CirclePost.js";
import cloudinary from "../config/cloudinary.js";
import notificationService from "../services/notification.service.js";

const userFields = "fullName name username avatar headline gender";
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

// Only these fields are ever settable by the author directly on edit —
// media/image (set only at creation via the upload flow), likes/saves/
// reactions/comments (mutated only via their own dedicated endpoints),
// isPinned/isDeleted (moderation-only), circle/author/replyTo, and
// impressionsCount must never come from the request body.
const EDITABLE_CIRCLEPOST_FIELDS = ["title", "content", "type"];

const pickEditableCirclePostFields = (body = {}) => {
  const picked = {};
  for (const key of EDITABLE_CIRCLEPOST_FIELDS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

const uploadToCloudinary = (buffer, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// Create Circle Post (this doubles as a chat message: text and/or one image,
// optionally quoting an earlier message via replyTo)
export const createCirclePost = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { content, replyTo, audioUrl, audioPublicId } = req.body;

    const membership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Join this circle to post",
      });
    }

    if (membership.status === "restricted") {
      return res.status(403).json({
        success: false,
        message: "You've been restricted from messaging in this circle",
      });
    }

    const trimmedContent = (content || "").trim();
    const hasAudio = typeof audioUrl === "string" && audioUrl.trim().length > 0;

    if (!trimmedContent && !req.file && !hasAudio) {
      return res.status(400).json({
        success: false,
        message: "Write a message or attach an image",
      });
    }

    let image;

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file.buffer,
        "imcircle/communities"
      );

      image = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }

    const audio = hasAudio
      ? { url: audioUrl.trim(), publicId: audioPublicId || "" }
      : undefined;

    let replyToId = null;

    if (replyTo) {
      const original = await CirclePost.findOne({
        _id: replyTo,
        circle: circleId,
        isDeleted: false,
      }).select("_id");

      if (original) replyToId = original._id;
    }

    let post = await CirclePost.create({
      circle: circleId,
      author: req.user._id,
      content: trimmedContent,
      image,
      audio,
      replyTo: replyToId,
    });

    post = await CirclePost.findById(post._id)
      .populate("author", userFields)
      .populate({
        path: "replyTo",
        select: "content image audio author isDeleted",
        populate: { path: "author", select: userFields },
      });

    // Best-effort: let every other member know a message landed.
    try {
      const otherMembers = await CircleMember.find({
        circle: circleId,
        user: { $ne: req.user._id },
      }).select("user");

      if (otherMembers.length > 0) {
        const circle = await Circle.findById(circleId).select("name");
        const authorName =
          req.user.fullName || req.user.name || req.user.username || "Someone";
        const preview = trimmedContent || "sent a photo";

        await Promise.all(
          otherMembers.map((member) =>
            notificationService
              .create({
                recipientId: member.user,
                actorId: req.user._id,
                type: "circle_message",
                entityType: "circle",
                entityId: circleId,
                title: circle?.name || "Circle message",
                message: `${authorName}: ${preview}`,
                metadata: { circle: circleId, post: post._id },
              })
              .catch(() => null)
          )
        );
      }
    } catch (notifyBatchError) {
      console.error("Circle message notification batch skipped:", notifyBatchError.message);
    }

    res.status(201).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("createCirclePost error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Get Circle Posts
export const getCirclePosts = async (req, res) => {
  try {
    const posts = await CirclePost.find({
      circle: req.params.circleId,
      isDeleted: false,
    })
      .populate("author", userFields)
      .populate({
        path: "replyTo",
        select: "content image audio author isDeleted",
        populate: { path: "author", select: userFields },
      })
      .populate("reactions.user", userFields)
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Update Circle Post
export const updateCirclePost = async (req, res) => {
  try {
    const post = await CirclePost.findOne({
      _id: req.params.postId,
      author: req.user._id,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const edits = pickEditableCirclePostFields(req.body);

    if (typeof edits.content === "string") {
      const cleanContent = edits.content.trim();

      if (!cleanContent && !post.image?.url && !post.media?.length) {
        return res.status(400).json({
          success: false,
          message: "Message can't be empty",
        });
      }

      edits.content = cleanContent;
    }

    Object.assign(post, edits);

    // Mark as edited whenever the actual message content changes — mirrors
    // the DM chat's edit indicator (Message.isEdited/editedAt).
    if (edits.content !== undefined) {
      post.isEdited = true;
      post.editedAt = new Date();
    }

    await post.save();

    const populatedPost = await CirclePost.findById(post._id)
      .populate("author", userFields)
      .populate({
        path: "replyTo",
        select: "content image audio author isDeleted",
        populate: { path: "author", select: userFields },
      })
      .populate("reactions.user", userFields);

    res.status(200).json({
      success: true,
      post: populatedPost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Delete Circle Post — the author can delete their own message; a circle
// owner/admin can delete any message for moderation.
export const deleteCirclePost = async (req, res) => {
  try {
    const post = await CirclePost.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const isAuthor = String(post.author) === String(req.user._id);

    if (!isAuthor) {
      const membership = await CircleMember.findOne({
        circle: post.circle,
        user: req.user._id,
      });

      const isManager =
        membership && ["owner", "admin"].includes(membership.role);

      if (!isManager) {
        return res.status(403).json({
          success: false,
          message: "You can't delete this message",
        });
      }
    }

    post.isDeleted = true;

    await post.save();

    res.status(200).json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("deleteCirclePost error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// React to a Circle Post — one reaction per user out of 6 supported emoji;
// tapping the same emoji again clears it, tapping a different one swaps it.
export const reactToCirclePost = async (req, res) => {
  try {
    const { emoji } = req.body;

    if (!REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported reaction",
      });
    }

    const post = await CirclePost.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const existingIndex = post.reactions.findIndex(
      (reaction) => String(reaction.user) === String(req.user._id)
    );

    let action = "added";

    if (existingIndex >= 0) {
      if (post.reactions[existingIndex].emoji === emoji) {
        post.reactions.splice(existingIndex, 1);
        action = "removed";
      } else {
        post.reactions[existingIndex].emoji = emoji;
        action = "changed";
      }
    } else {
      post.reactions.push({ user: req.user._id, emoji });
    }

    await post.save();

    res.status(200).json({
      success: true,
      action,
      reactions: post.reactions,
    });
  } catch (error) {
    console.error("reactToCirclePost error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Like Circle Post
export const likeCirclePost = async (req, res) => {
  try {
    const post = await CirclePost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      likesCount: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Comment Circle Post
export const commentCirclePost = async (req, res) => {
  try {
    const post = await CirclePost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const membership = await CircleMember.findOne({
      circle: post.circle,
      user: req.user._id,
    });

    if (membership && membership.status === "restricted") {
      return res.status(403).json({
        success: false,
        message: "You've been restricted from messaging in this circle",
      });
    }

    post.comments.push({
      user: req.user._id,
      text: req.body.text,
    });

    await post.save();

    res.status(201).json({
      success: true,
      commentsCount: post.comments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};