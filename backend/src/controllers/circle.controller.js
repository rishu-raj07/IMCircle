import Circle from "../models/Circle.js";
import CircleMember from "../models/CircleMember.js";
import CircleInvite from "../models/CircleInvite.js";
import CircleJoinRequest from "../models/CircleJoinRequest.js";
import CirclePost from "../models/CirclePost.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../socket/socket.js";

// Rough keyword sets for each `User.primaryInterest` option, reused from the
// same personalization idea as the Journey Discover feed — best-effort text
// matching against a circle's name/description/tags, not a real
// recommendation engine, but enough to surface "Startup" circles first for
// a startup-interested user instead of a flat popularity list.
const INTEREST_KEYWORDS = {
  startup: [
    "startup",
    "founder",
    "business",
    "entrepreneur",
    "launch",
    "build",
    "product",
    "venture",
    "hustle",
  ],
  career: ["career", "job", "interview", "resume", "promotion", "placement"],
  "ai & tech": [
    "ai",
    "tech",
    "code",
    "coding",
    "developer",
    "software",
    "app",
    "engineer",
    "machine learning",
  ],
  marketing: ["marketing", "brand", "growth", "content", "social media", "ads", "sales"],
  finance: ["finance", "money", "invest", "stock", "budget", "trading", "wealth"],
  design: ["design", "ux", "ui", "creative", "art", "figma"],
  "content & creator": [
    "content",
    "creator",
    "youtube",
    "video",
    "vlog",
    "influencer",
    "reel",
  ],
};

function getInterestKeywords(primaryInterest) {
  const key = (primaryInterest || "").trim().toLowerCase();
  if (!key) return [];
  return INTEREST_KEYWORDS[key] || [key];
}

function scoreCircleForInterest(circle, keywords) {
  if (!keywords.length) return 0;

  const haystack = [
    circle?.name,
    circle?.description,
    ...(Array.isArray(circle?.tags) ? circle.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((kw) => haystack.includes(kw)) ? 1 : 0;
}


// Create Circle
export const createCircle = async (req, res) => {
  try {
    const { name, description, coverImage, tags, visibility } = req.body;

    const existingCircle = await Circle.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existingCircle) {
      return res.status(400).json({
        success: false,
        message: "Circle already exists",
      });
    }

    const circle = await Circle.create({
      creator: req.user._id,
      name,
      description,
      coverImage,
      tags,
      visibility,
    });

    await CircleMember.create({
      circle: circle._id,
      user: req.user._id,
      role: "owner",
    });

    circle.membersCount = 1;
    await circle.save();

    res.status(201).json({
      success: true,
      circle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Get All Circles
export const getCircles = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const query = { isDeleted: false, visibility: "public" };

    const [circles, total] = await Promise.all([
      Circle.find(query)
        .populate("creator", "name avatar headline")
        .sort({ membersCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Circle.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: circles.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      circles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Get Single Circle
export const getSingleCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.circleId)
      .populate("creator", "name avatar headline");

    if (!circle) {
      return res.status(404).json({
        success: false,
        message: "Circle not found",
      });
    }

    res.status(200).json({
      success: true,
      circle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Get Circle Members
export const getCircleMembers = async (req, res) => {
  try {
    const { circleId } = req.params;
    const page = Math.max(Number(req.query.page) || 1, 1);
    // The only current caller (CircleCommunity.jsx's admin/roster view) reads
    // the whole membership list in one shot with no "load more" UI, so the
    // default here is generous rather than a typical page size — this still
    // puts a hard ceiling on a single response (protecting against a
    // pathological circle with tens of thousands of members) without
    // truncating any realistic community today.
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const query = { circle: circleId };

    const [members, total] = await Promise.all([
      CircleMember.find(query)
        .populate("user", "fullName name username avatar headline role field")
        .sort({ role: -1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CircleMember.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      members,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Join Circle
export const joinCircle = async (req, res) => {
  try {
    const { circleId } = req.params;

    const alreadyJoined = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: "Already joined",
      });
    }

    await CircleMember.create({
      circle: circleId,
      user: req.user._id,
    });

    await Circle.findByIdAndUpdate(circleId, {
      $inc: { membersCount: 1 },
    });

    await CircleInvite.updateMany(
      { circle: circleId, invitedUser: req.user._id, status: "pending" },
      { status: "joined" }
    );

    // Let the community's owner/admins know someone new joined.
    try {
      const managers = await CircleMember.find({
        circle: circleId,
        role: { $in: ["owner", "admin"] },
        user: { $ne: req.user._id },
      }).select("user");

      if (managers.length > 0) {
        const circle = await Circle.findById(circleId).select("name");
        const joinerName =
          req.user.fullName || req.user.name || req.user.username || "Someone";

        await Promise.all(
          managers.map(async (manager) => {
            try {
              const notification = await Notification.create({
                recipient: manager.user,
                sender: req.user._id,
                type: "circle_join",
                title: circle?.name || "New member",
                message: `${joinerName} joined ${circle?.name || "your circle"}`,
              });

              emitNotification(manager.user, notification);
            } catch (notifyError) {
              console.error("Circle join notification skipped:", notifyError.message);
            }
          })
        );
      }
    } catch (notifyBatchError) {
      console.error("Circle join notification batch skipped:", notifyBatchError.message);
    }

    res.status(200).json({
      success: true,
      message: "Joined circle successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Leave Circle
export const leaveCircle = async (req, res) => {
  try {
    const { circleId } = req.params;

    await CircleMember.findOneAndDelete({
      circle: circleId,
      user: req.user._id,
    });

    await Circle.findByIdAndUpdate(circleId, {
      $inc: { membersCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Left circle successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// My Circles
export const getMyCircles = async (req, res) => {
  try {
    const memberships = await CircleMember.find({
      user: req.user._id,
    }).populate({
      path: "circle",
      populate: {
        path: "creator",
        select: "name avatar headline",
      },
    });

    res.status(200).json({
      success: true,
      count: memberships.length,
      circles: memberships,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Make Circle Admin
export const makeCircleAdmin = async (req, res) => {
  try {
    const { circleId, userId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const targetMembership = await CircleMember.findOne({
      circle: circleId,
      user: userId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The community owner already has full access",
      });
    }

    targetMembership.role = "admin";
    await targetMembership.save();

    res.status(200).json({
      success: true,
      message: "Member promoted to admin",
      member: targetMembership,
    });
  } catch (error) {
    console.error("makeCircleAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Remove Circle Member
export const removeCircleMember = async (req, res) => {
  try {
    const { circleId, userId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const targetMembership = await CircleMember.findOne({
      circle: circleId,
      user: userId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The community owner cannot be removed",
      });
    }

    await targetMembership.deleteOne();

    await Circle.findByIdAndUpdate(circleId, {
      $inc: { membersCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Member removed from community",
    });
  } catch (error) {
    console.error("removeCircleMember error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Restrict / Unrestrict Circle Member messaging
const setCircleMemberRestriction = async (req, res, restricted) => {
  try {
    const { circleId, userId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const targetMembership = await CircleMember.findOne({
      circle: circleId,
      user: userId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The community owner cannot be restricted",
      });
    }

    targetMembership.status = restricted ? "restricted" : "active";
    await targetMembership.save();

    res.status(200).json({
      success: true,
      message: restricted
        ? "Member restricted from messaging"
        : "Member access restored",
      member: targetMembership,
    });
  } catch (error) {
    console.error("setCircleMemberRestriction error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const restrictCircleMember = (req, res) =>
  setCircleMemberRestriction(req, res, true);

export const unrestrictCircleMember = (req, res) =>
  setCircleMemberRestriction(req, res, false);


// Demote an admin back to a regular member. Any owner/admin can demote any
// other admin — the owner role itself can never be changed here.
export const demoteCircleAdmin = async (req, res) => {
  try {
    const { circleId, userId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const targetMembership = await CircleMember.findOne({
      circle: circleId,
      user: userId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The community owner can't be demoted",
      });
    }

    if (targetMembership.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "This member isn't an admin",
      });
    }

    targetMembership.role = "member";
    await targetMembership.save();

    res.status(200).json({
      success: true,
      message: "Admin access removed",
      member: targetMembership,
    });
  } catch (error) {
    console.error("demoteCircleAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Delete a community — owner only. Everyone loses access and is notified;
// the circle and its chat are soft-deleted (same isDeleted convention used
// everywhere else in this codebase).
export const deleteCircle = async (req, res) => {
  try {
    const { circleId } = req.params;

    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });

    if (!circle) {
      return res.status(404).json({
        success: false,
        message: "Circle not found",
      });
    }

    if (String(circle.creator) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the community owner can delete it",
      });
    }

    const members = await CircleMember.find({ circle: circleId }).select("user");
    const memberIds = members
      .map((member) => member.user)
      .filter((id) => String(id) !== String(req.user._id));

    circle.isDeleted = true;
    await circle.save();

    await CircleMember.deleteMany({ circle: circleId });
    await CircleInvite.deleteMany({ circle: circleId, status: "pending" });
    await CirclePost.updateMany({ circle: circleId }, { isDeleted: true });

    try {
      await Promise.all(
        memberIds.map(async (userId) => {
          try {
            const notification = await Notification.create({
              recipient: userId,
              sender: req.user._id,
              type: "circle_deleted",
              title: "Community deleted",
              message: `${circle.name} was deleted by its owner`,
            });

            emitNotification(userId, notification);
          } catch (notifyError) {
            console.error("Circle deletion notification skipped:", notifyError.message);
          }
        })
      );
    } catch (notifyBatchError) {
      console.error("Circle deletion notification batch skipped:", notifyBatchError.message);
    }

    res.status(200).json({
      success: true,
      message: "Community deleted",
    });
  } catch (error) {
    console.error("deleteCircle error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Trending Circles — "Suggested for you". Includes public and invite-only
// circles (private ones are never surfaced as a recommendation), excludes
// circles the user has already joined, and always returns something
// (falls back to generally popular circles when nothing matches the
// person's interest) instead of an empty list.
export const getTrendingCircles = async (req, res) => {
  try {
    const myMemberships = await CircleMember.find({ user: req.user._id }).select("circle");
    const myCircleIds = myMemberships.map((membership) => membership.circle);

    const circles = await Circle.find({
      isDeleted: false,
      visibility: { $in: ["public", "invite-only"] },
      _id: { $nin: myCircleIds },
    })
      .sort({
        membersCount: -1,
        postsCount: -1,
      })
      .limit(30);

    const keywords = getInterestKeywords(req.user?.primaryInterest);

    const ranked = circles
      .map((circle) => ({
        circle,
        interestMatch: scoreCircleForInterest(circle, keywords),
      }))
      .sort((a, b) => {
        if (b.interestMatch !== a.interestMatch) {
          return b.interestMatch - a.interestMatch;
        }
        return (b.circle.membersCount || 0) - (a.circle.membersCount || 0);
      })
      .slice(0, 10)
      .map((item) => item.circle);

    const myPendingRequests = await CircleJoinRequest.find({
      user: req.user._id,
      status: "pending",
    }).select("circle");

    res.status(200).json({
      success: true,
      count: ranked.length,
      personalized: keywords.length > 0,
      primaryInterest: req.user?.primaryInterest || "",
      circles: ranked,
      requestedCircleIds: myPendingRequests.map((request) => String(request.circle)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Browse all discoverable circles — public + invite-only (never private),
// excludes circles already joined, paginated 10 at a time for the "View
// more" page linked from the Suggested-for-you section.
export const getBrowseCircles = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const myMemberships = await CircleMember.find({ user: req.user._id }).select("circle");
    const myCircleIds = myMemberships.map((membership) => membership.circle);

    const filter = {
      isDeleted: false,
      visibility: { $in: ["public", "invite-only"] },
      _id: { $nin: myCircleIds },
    };

    const [circles, total, myPendingRequests] = await Promise.all([
      Circle.find(filter)
        .sort({ membersCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Circle.countDocuments(filter),
      CircleJoinRequest.find({ user: req.user._id, status: "pending" }).select("circle"),
    ]);

    res.status(200).json({
      success: true,
      circles,
      requestedCircleIds: myPendingRequests.map((request) => String(request.circle)),
      page,
      limit,
      total,
      hasMore: skip + circles.length < total,
    });
  } catch (error) {
    console.error("getBrowseCircles error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Request to join an "invite-only" circle. Public circles are joined
// directly via joinCircle; private circles are never discoverable so this
// path doesn't apply to them.
export const requestToJoinCircle = async (req, res) => {
  try {
    const { circleId } = req.params;

    const circle = await Circle.findOne({ _id: circleId, isDeleted: false });

    if (!circle) {
      return res.status(404).json({
        success: false,
        message: "Circle not found",
      });
    }

    if (circle.visibility !== "invite-only") {
      return res.status(400).json({
        success: false,
        message: "This circle doesn't require a join request",
      });
    }

    const alreadyMember = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (alreadyMember) {
      return res.status(200).json({
        success: true,
        message: "Already a member",
        status: "member",
      });
    }

    const existingRequest = await CircleJoinRequest.findOne({
      circle: circleId,
      user: req.user._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: "Request already sent",
        status: "pending",
      });
    }

    await CircleJoinRequest.create({ circle: circleId, user: req.user._id });

    try {
      const managers = await CircleMember.find({
        circle: circleId,
        role: { $in: ["owner", "admin"] },
      }).select("user");

      const requesterName =
        req.user?.fullName || req.user?.name || req.user?.username || "Someone";

      await Promise.all(
        managers.map(async (manager) => {
          try {
            const notification = await Notification.create({
              recipient: manager.user,
              sender: req.user._id,
              type: "circle_join_request",
              title: "Join request",
              message: `${requesterName} wants to join ${circle.name}`,
            });

            emitNotification(manager.user, notification);
          } catch (notifyError) {
            console.error("Circle join request notification skipped:", notifyError.message);
          }
        })
      );
    } catch (notifyBatchError) {
      console.error("Circle join request notification batch skipped:", notifyBatchError.message);
    }

    res.status(201).json({
      success: true,
      message: "Join request sent",
      status: "pending",
    });
  } catch (error) {
    console.error("requestToJoinCircle error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// All of the current user's own pending join requests, across every
// invite-only circle — lets the UI show "Requested" instead of "Request"
// after a refresh instead of the state resetting.
export const getMySentCircleJoinRequests = async (req, res) => {
  try {
    const requests = await CircleJoinRequest.find({
      user: req.user._id,
      status: "pending",
    }).select("circle");

    res.status(200).json({
      success: true,
      circleIds: requests.map((request) => String(request.circle)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


// Pending join requests for a specific circle — owner/admin only, so they
// can let people into an invite-only community.
export const getCircleJoinRequests = async (req, res) => {
  try {
    const { circleId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const requests = await CircleJoinRequest.find({
      circle: circleId,
      status: "pending",
    })
      .populate("user", "fullName name username avatar headline")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("getCircleJoinRequests error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

const resolveCircleJoinRequest = async (req, res, accept) => {
  try {
    const { circleId, requestId } = req.params;

    const requesterMembership = await CircleMember.findOne({
      circle: circleId,
      user: req.user._id,
    });

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only community admins can do this",
      });
    }

    const joinRequest = await CircleJoinRequest.findOne({
      _id: requestId,
      circle: circleId,
      status: "pending",
    });

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    joinRequest.status = accept ? "accepted" : "rejected";
    await joinRequest.save();

    if (accept) {
      const alreadyMember = await CircleMember.findOne({
        circle: circleId,
        user: joinRequest.user,
      });

      if (!alreadyMember) {
        await CircleMember.create({ circle: circleId, user: joinRequest.user });
        await Circle.findByIdAndUpdate(circleId, { $inc: { membersCount: 1 } });
      }

      try {
        const circle = await Circle.findById(circleId).select("name");

        const notification = await Notification.create({
          recipient: joinRequest.user,
          sender: req.user._id,
          type: "circle_join_accepted",
          title: "Request accepted",
          message: `You're in! Your request to join ${circle?.name || "the circle"} was accepted`,
        });

        emitNotification(joinRequest.user, notification);
      } catch (notifyError) {
        console.error("Circle join accept notification skipped:", notifyError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: accept ? "Request accepted" : "Request rejected",
    });
  } catch (error) {
    console.error("resolveCircleJoinRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const acceptCircleJoinRequest = (req, res) => resolveCircleJoinRequest(req, res, true);
export const rejectCircleJoinRequest = (req, res) => resolveCircleJoinRequest(req, res, false);
