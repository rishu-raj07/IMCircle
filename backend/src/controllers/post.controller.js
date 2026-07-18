import Post from "../models/Post.js";
import User from "../models/User.js";
import CircleRequest from "../models/CircleRequest.js";
import cloudinary from "../config/cloudinary.js";
import { processContentText } from "../services/contentParsing.service.js";
import notificationService from "../services/notification.service.js";

const authorFields = "fullName username avatar headline field role gender";

export const createPost = async (req, res) => {
  try {
    const { content, visibility = "public", purpose = "general" } = req.body;

    const files = req.files || [];
    const media = [];

    for (const file of files) {
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "imcircle/posts",
            resource_type: "auto",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        stream.end(file.buffer);
      });

      media.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        type: file.mimetype?.startsWith("audio/")
          ? "audio"
          : uploaded.resource_type === "video"
          ? "video"
          : "image",
      });
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      visibility,
      purpose,
      media,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.postsCount": 1 },
    });

    processContentText({
      text: content,
      authorId: req.user._id,
      contentType: "post",
      contentId: post._id,
      link: `/post/${post._id}`,
    }).catch(() => {});

    const populatedPost = await Post.findById(post._id).populate(
      "author",
      authorFields
    );

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getFeed = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      isDeleted: false,
      visibility: "public",
    })
      .populate("author", authorFields)
      .populate("comments.user", "fullName username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: posts.length,
      page,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    })
      .populate("author", authorFields)
      .populate("comments.user", "fullName username avatar");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );

      // Documented decision (Issue 2 spec): unlike REMOVES the like
      // notification rather than leaving a stale "liked your post" sitting
      // in the recipient's list for something that's no longer true.
      notificationService
        .removeByDedupeKey({
          type: "like",
          entityType: "post",
          entityId: post._id,
          actorId: req.user._id,
          recipientId: post.author,
        })
        .catch(() => {});
    } else {
      post.likes.push(req.user._id);

      // `dedupe: true` means unlike-then-relike resurfaces the SAME
      // notification (marked unread again) instead of creating a second
      // row — repeatedly tapping like can never spam the recipient.
      notificationService
        .create({
          recipientId: post.author,
          actorId: req.user._id,
          type: "like",
          entityType: "post",
          entityId: post._id,
          message: `${req.user.fullName} liked your post`,
          dedupe: true,
        })
        .catch(() => {});
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: alreadyLiked ? "Post unliked" : "Post liked",
      likesCount: post.likes.length,
      likedByMe: !alreadyLiked,
      isLikedByMe: !alreadyLiked,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();

    const newComment = post.comments[post.comments.length - 1];

    notificationService
      .create({
        recipientId: post.author,
        actorId: req.user._id,
        type: "comment",
        entityType: "post",
        entityId: post._id,
        message: `${req.user.fullName} commented on your post`,
      })
      .catch(() => {});

    // @mentions inside a comment notify the mentioned person too, same as
    // mentioning someone in the post body itself — fire-and-forget, never
    // blocks the comment response.
    processContentText({
      text,
      authorId: req.user._id,
      contentType: "comment",
      contentId: newComment?._id,
      link: `/post/${post._id}`,
    }).catch(() => {});

    const updatedPost = await Post.findById(post._id)
      .populate("author", authorFields)
      .populate("comments.user", "fullName username avatar headline role");

    return res.status(201).json({
      success: true,
      message: "Comment added",
      comments: updatedPost.comments,
      comment: updatedPost.comments[updatedPost.comments.length - 1],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const savePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadySaved = post.saves.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadySaved) {
      post.saves = post.saves.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    } else {
      post.saves.push(req.user._id);
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: alreadySaved ? "Post unsaved" : "Post saved",
      savesCount: post.saves.length,
      savedByMe: !alreadySaved,
      isSavedByMe: !alreadySaved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


export const repostPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    const repostText = String(
      req.body?.text ||
        req.body?.repostText ||
        req.body?.caption ||
        req.body?.quote ||
        ""
    ).trim();

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const existingIndex = post.reposts.findIndex(
      (item) => item.user.toString() === userId.toString()
    );

    if (existingIndex >= 0) {
      if (repostText) {
        post.reposts[existingIndex].text = repostText;
        post.reposts[existingIndex].createdAt = new Date();
        await post.save();

        // Same dedup key as a plain repost below — adding/changing a
        // thought on an existing repost resurfaces the one notification
        // rather than stacking a second one for the same actor+post.
        notificationService
          .create({
            recipientId: post.author,
            actorId: userId,
            type: "repost",
            entityType: "post",
            entityId: post._id,
            message: `${req.user.fullName} reposted your post with a thought`,
            dedupe: true,
          })
          .catch(() => {});

        return res.status(200).json({
          success: true,
          message: "Repost updated",
          reposted: true,
          repostText,
          repostsCount: post.reposts.length,
        });
      }

      post.reposts.splice(existingIndex, 1);
      await post.save();

      // Documented decision, same as unlike: removing a repost removes the
      // notification too, since "reposted your post" is no longer true.
      notificationService
        .removeByDedupeKey({
          type: "repost",
          entityType: "post",
          entityId: post._id,
          actorId: userId,
          recipientId: post.author,
        })
        .catch(() => {});

      return res.status(200).json({
        success: true,
        message: "Repost removed",
        reposted: false,
        repostText: "",
        repostsCount: post.reposts.length,
      });
    }

    post.reposts.push({
      user: userId,
      text: repostText,
      createdAt: new Date(),
    });

    await post.save();

    notificationService
      .create({
        recipientId: post.author,
        actorId: userId,
        type: "repost",
        entityType: "post",
        entityId: post._id,
        message: repostText
          ? `${req.user.fullName} reposted your post with a thought`
          : `${req.user.fullName} reposted your post`,
        dedupe: true,
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Post reposted",
      reposted: true,
      repostText,
      repostsCount: post.reposts.length,
    });
  } catch (error) {
    console.error("REPOST POST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to repost",
    });
  }
};
export const sharePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyShared = post.shares.some(
      (share) => share.user.toString() === req.user._id.toString()
    );

    if (!alreadyShared) {
      post.shares.push({
        user: req.user._id,
      });

      await post.save();

      notificationService
        .create({
          recipientId: post.author,
          actorId: req.user._id,
          type: "share",
          entityType: "post",
          entityId: post._id,
          message: `${req.user.fullName} shared your post`,
          dedupe: true,
        })
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: alreadyShared
        ? "Post already shared by this user"
        : "Post shared successfully",
      sharesCount: post.shares.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own post",
      });
    }

    post.isDeleted = true;
    await post.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.postsCount": -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { reason = "Inappropriate content" } = req.body;

    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyReported = post.reports.some(
      (report) => report.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You already reported this post",
      });
    }

    post.reports.push({
      user: req.user._id,
      reason,
    });

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post reported successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getMyPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({
      author: req.user._id,
      isDeleted: false,
    })
      .populate("author", authorFields)
      .populate("comments.user", "fullName username avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSavedPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({
      saves: req.user._id,
      isDeleted: false,
    })
      .populate("author", authorFields)
      .populate("comments.user", "fullName username avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    return next(error);
  }
};


const populatePostComments = async (postId) => {
  return Post.findById(postId)
    .populate("author", authorFields)
    .populate("comments.user", "fullName username avatar profileImage headline role")
    .populate("comments.replyingToUser", "fullName username avatar profileImage");
};

const buildCommentTree = (comments = [], currentUserId) => {
  const activeComments = comments.filter((c) => !c.isDeleted);
  const topComments = activeComments.filter((c) => !c.parentComment);
  const replies = activeComments.filter((c) => c.parentComment);

  return topComments
    .map((comment) => {
      const obj = comment.toObject ? comment.toObject() : comment;

      return {
        ...obj,
        likesCount: obj.likes?.length || 0,
        isLiked: obj.likes?.some(
          (id) => id.toString() === currentUserId.toString()
        ),
        replies: replies
          .filter(
            (reply) =>
              reply.parentComment?.toString() === obj._id.toString()
          )
          .map((reply) => {
            const r = reply.toObject ? reply.toObject() : reply;

            return {
              ...r,
              likesCount: r.likes?.length || 0,
              isLiked: r.likes?.some(
                (id) => id.toString() === currentUserId.toString()
              ),
            };
          }),
      };
    })
    .reverse();
};

// Full likers list for a post, circle members sorted first — same pattern
// as getMilestoneLikers in journey.controller.js, see that for the full
// rationale. Powers the "Liked by [name] and N others" row on PostCard.jsx
// and the sheet it opens into (Message for a circle member, +Circle
// otherwise).
export const getPostLikers = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const myCircleIds = new Set((req.user.circle || []).map((id) => id.toString()));

    const post = await Post.findById(req.params.postId)
      .select("likes")
      .populate("likes", authorFields);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const likers = (post.likes || []).filter(Boolean);
    const likerIds = likers.map((user) => user._id.toString());

    const pendingRequests = await CircleRequest.find({
      sender: viewerId,
      receiver: { $in: likerIds },
      status: "pending",
    }).select("receiver");
    const pendingSet = new Set(pendingRequests.map((item) => item.receiver.toString()));

    const annotated = likers.map((user) => {
      const id = user._id.toString();
      return {
        ...user.toObject(),
        isInCircle: myCircleIds.has(id),
        isRequested: pendingSet.has(id),
      };
    });

    annotated.sort((a, b) => Number(b.isInCircle) - Number(a.isInCircle));

    return res.status(200).json({
      success: true,
      count: annotated.length,
      likers: annotated,
    });
  } catch (error) {
    console.error("Get post likers error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const post = await populatePostComments(req.params.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comments = buildCommentTree(post.comments, req.user._id);

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const replyPostComment = async (req, res) => {
  try {
    const { text, replyingToUserId } = req.body;
    const { postId, commentId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const parent = post.comments.id(commentId);

    if (!parent || parent.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const rootCommentId = parent.parentComment || parent._id;

    post.comments.push({
      user: req.user._id,
      text,
      parentComment: rootCommentId,
      replyingToUser: replyingToUserId || parent.user,
      likes: [],
    });

    await post.save();

    const newReply = post.comments[post.comments.length - 1];

    // Notifies whoever this reply is actually directed at — the parent
    // comment's author for a first-level reply, or the specific reply
    // author when `replyingToUserId` points at a nested reply (that's the
    // "someone replies to your reply" case, same field the frontend
    // already sends today).
    const replyRecipient = replyingToUserId || parent.user;
    notificationService
      .create({
        recipientId: replyRecipient,
        actorId: req.user._id,
        type: "reply",
        entityType: "post",
        entityId: post._id,
        message: `${req.user.fullName} replied to your comment`,
      })
      .catch(() => {});

    processContentText({
      text,
      authorId: req.user._id,
      contentType: "comment",
      contentId: newReply?._id,
      link: `/post/${post._id}`,
    }).catch(() => {});

    const updatedPost = await populatePostComments(post._id);
    const comments = buildCommentTree(updatedPost.comments, req.user._id);

    return res.status(201).json({
      success: true,
      message: "Reply added",
      comments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const likePostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    } else {
      comment.likes.push(req.user._id);
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: alreadyLiked ? "Comment unliked" : "Comment liked",
      likesCount: comment.likes.length,
      isLiked: !alreadyLiked,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deletePostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const isOwner = comment.user.toString() === req.user._id.toString();
    const isPostOwner = post.author.toString() === req.user._id.toString();

    if (!isOwner && !isPostOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this comment",
      });
    }

    comment.isDeleted = true;

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
