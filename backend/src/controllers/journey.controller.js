import { Readable } from "stream";

import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import JourneyFollower from "../models/JourneyFollower.js";
import JourneyMilestoneLike from "../models/JourneyMilestoneLike.js";
import JourneyMilestoneComment from "../models/JourneyMilestoneComment.js";
import JourneyMilestoneRepost from "../models/JourneyMilestoneRepost.js";
import JourneyMilestoneSave from "../models/JourneyMilestoneSave.js";
import cloudinary from "../config/cloudinary.js";
import { addBuilderScore } from "../services/builderScore.service.js";
import { sendMail } from "../utils/mailer.js";
import { processContentText } from "../services/contentParsing.service.js";
import notificationService from "../services/notification.service.js";

const REPORT_EMAIL = process.env.REPORT_NOTIFY_EMAIL || "report@imcircle.com";

const userFields =
  "fullName name username avatar profilePicture profileImage image photo photoURL picture googlePicture headline role gender";

// Rough keyword sets for each `User.primaryInterest` option, used to give a
// personalization boost to journeys whose title/description/tags mention
// related words. Best-effort text matching, not a real recommendation
// engine — but it's enough to make "I picked Startup" actually surface
// startup-flavoured journeys first instead of a plain reverse-chron feed.
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

function scoreJourneyForInterest(journey, keywords) {
  if (!keywords.length) return 0;

  const haystack = [
    journey?.title,
    journey?.description,
    ...(Array.isArray(journey?.tags) ? journey.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((kw) => haystack.includes(kw)) ? 1 : 0;
}

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

function getStartOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getCurrentJourneyDay(createdAt) {
  const startDate = getStartOfDay(createdAt);
  const today = getStartOfDay();

  return (
    Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );
}

function getJourneyStatusLabel(journey = {}) {
  if (journey.status === "completed") return "Completed";
  if (journey.status === "uncompleted") return "Missed";
  return "Pursuing";
}

async function syncJourneyStatus(journey) {
  if (!journey || journey.isDeleted) return journey;

  if (journey.status === "completed" || journey.status === "uncompleted") {
    return journey;
  }

  const currentDay = getCurrentJourneyDay(journey.createdAt);
  const maxDays = Number(journey.targetDays || journey.totalDays || 100);

  if (currentDay > maxDays) {
    journey.status = "completed";
    journey.isActive = false;
    await journey.save();
    return journey;
  }

  if (currentDay <= 1) return journey;

  const requiredDays = [];

  for (let day = 1; day < currentDay; day += 1) {
    requiredDays.push(day);
  }

  const postedDays = await JourneyMilestone.find({
    journey: journey._id,
    creator: journey.creator?._id || journey.creator,
    day: { $in: requiredDays },
    isDeleted: false,
  }).distinct("day");

  const postedSet = new Set(postedDays.map((day) => Number(day)));

  const missedDays = requiredDays.filter((day) => !postedSet.has(day));

  if (missedDays.length > 0) {
    journey.status = "uncompleted";
    journey.isActive = false;
    journey.uncompletedAt = new Date();
    journey.uncompletedReason = `Missed Day ${missedDays[0]} update`;
    journey.missedDaysCount = missedDays.length;
    await journey.save();
  }

  return journey;
}

async function getJourneyTotals(journeyId) {
  const milestones = await JourneyMilestone.find({
    journey: journeyId,
    isDeleted: false,
  }).select(
    "likesCount commentsCount repostsCount savesCount sharesCount impressionsCount"
  );

  return milestones.reduce(
    (acc, item) => {
      acc.likes += item.likesCount || 0;
      acc.comments += item.commentsCount || 0;
      acc.reposts += item.repostsCount || 0;
      acc.saves += item.savesCount || 0;
      acc.shares += item.sharesCount || 0;
      acc.views += item.impressionsCount || 0;
      return acc;
    },
    {
      likes: 0,
      comments: 0,
      reposts: 0,
      saves: 0,
      shares: 0,
      views: 0,
    }
  );
}

export const createJourney = async (req, res) => {
  try {
    const possibleActiveJourneys = await Journey.find({
      creator: req.user._id,
      isDeleted: false,
      status: "active",
      isActive: true,
    });

    await Promise.all(possibleActiveJourneys.map((journey) => syncJourneyStatus(journey)));
    const activeJourneyCount = possibleActiveJourneys.filter(
      (journey) => journey.status === "active" && journey.isActive === true
    ).length;

    if (activeJourneyCount >= 3) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_JOURNEY_LIMIT",
        message: "You can have a maximum of 3 active journeys. Complete or close one before starting another.",
      });
    }

    const targetDays = Number(req.body.targetDays) || 100;
    const totalDays = Number(req.body.totalDays) || targetDays;

    if (
      !Number.isInteger(targetDays) ||
      !Number.isInteger(totalDays) ||
      targetDays < 1 ||
      targetDays > 365 ||
      totalDays < 1 ||
      totalDays > 365
    ) {
      return res.status(400).json({
        success: false,
        message: "A new journey must be between 1 and 365 days. You can update it after completion.",
      });
    }

    const deadline = new Date();
    deadline.setHours(23, 59, 59, 999);
    deadline.setDate(deadline.getDate() + targetDays - 1);

    const journey = await Journey.create({
      title: req.body.title,
      description: req.body.description || "",
      coverImage: req.body.coverImage || "",
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      targetDays,
      totalDays,
      deadline,
      status: "active",
      isActive: true,
      isPublic: req.body.isPublic !== false,
      creator: req.user._id,
    });

    const populatedJourney = await Journey.findById(journey._id).populate(
      "creator",
      userFields
    );

    return res.status(201).json({
      success: true,
      message: "Journey created",
      journey: populatedJourney,
    });
  } catch (error) {
    console.error("Create journey error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create journey",
    });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found or not authorized",
      });
    }

    await syncJourneyStatus(journey);

    if (journey.status === "uncompleted") {
      return res.status(400).json({
        success: false,
        message:
          journey.uncompletedReason ||
          "This journey is already marked as uncompleted",
      });
    }

    if (journey.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This journey is already completed",
      });
    }

    if (journey.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: "This journey is not active anymore",
      });
    }

    const dayNumber = getCurrentJourneyDay(journey.createdAt);
    const targetDays = Number(journey.targetDays || journey.totalDays || 100);

    if (dayNumber > targetDays) {
      journey.status = "completed";
      journey.isActive = false;
      await journey.save();

      return res.status(400).json({
        success: false,
        message: `This journey has already completed ${targetDays} days`,
      });
    }

    const alreadyPostedToday = await JourneyMilestone.findOne({
      journey: journey._id,
      creator: req.user._id,
      day: dayNumber,
      isDeleted: false,
    });

    if (alreadyPostedToday) {
      return res.status(400).json({
        success: false,
        message: `You already posted Day ${dayNumber} update today`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Live progress photo or video is required",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "imcircle/journeys",
      "auto"
    );

    const images = [
      {
        url: result.secure_url,
        publicId: result.public_id,
        type: result.resource_type === "video" ? "video" : "image",
      },
    ];

    const cleanTitle = req.body.title?.trim() || `Day ${dayNumber} Update`;

    const milestone = await JourneyMilestone.create({
      journey: journey._id,
      creator: req.user._id,
      title: cleanTitle,
      description: req.body.description?.trim() || "",
      type: req.body.type || "update",
      day: dayNumber,
      images,
      achievement: req.body.achievement?.trim() || "",
      capturedAt: req.body.capturedAt
        ? new Date(req.body.capturedAt)
        : new Date(),
      captureSource: ["camera", "gallery"].includes(req.body.captureSource)
        ? req.body.captureSource
        : "unknown",
    });

    journey.updatesCount += 1;
    journey.lastMilestoneAt = new Date();
    journey.missedDaysCount = 0;

    if (dayNumber >= targetDays) {
      journey.status = "completed";
      journey.isActive = false;
    }

    await journey.save();

    let scoreType = "JOURNEY_UPDATE";
    if (milestone.type === "win") scoreType = "WIN_SHARED";
    if (milestone.type === "failure") scoreType = "FAILURE_SHARED";
    if (milestone.type === "lesson") scoreType = "LESSON_SHARED";

    await addBuilderScore({
      userId: req.user._id,
      type: scoreType,
      referenceId: milestone._id,
      referenceModel: "JourneyMilestone",
    });

    processContentText({
      text: `${cleanTitle} ${milestone.description || ""}`,
      authorId: req.user._id,
      contentType: "journey_milestone",
      contentId: milestone._id,
      link: `/journey/${journey._id}`,
    }).catch(() => {});

    // Notify everyone following this journey that a new update just went
    // up — previously this controller had no fan-out to followers at all,
    // so the only way to learn about a new Day N update was to happen to
    // open the journey yourself. Fire-and-forget, one notification per
    // follower, never blocks the response. Not deduped: each milestone is
    // a genuinely new, distinct event (unlike a like/follow, which can be
    // toggled), so there's nothing to collapse into a single reused row.
    JourneyFollower.find({ journey: journey._id })
      .select("user follower")
      .lean()
      .then((followers) => {
        const followerIds = [
          ...new Set(
            followers
              .map((f) => f.user || f.follower)
              .filter(Boolean)
              .map((id) => String(id))
          ),
        ].filter((id) => id !== String(req.user._id));

        followerIds.forEach((followerId) => {
          notificationService
            .create({
              recipientId: followerId,
              actorId: req.user._id,
              type: "journey_update",
              entityType: "journey_milestone",
              entityId: milestone._id,
              metadata: { journeyId: journey._id },
              message: `${req.user.fullName} posted a Day ${dayNumber} update on a journey you follow`,
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    const populatedMilestone = await JourneyMilestone.findById(milestone._id)
      .populate("creator", userFields)
      .populate(
        "journey",
        "title coverImage updatesCount followersCount targetDays totalDays creator status isActive"
      );

    return res.status(201).json({
      success: true,
      message: `Day ${dayNumber} journey update published`,
      milestone: populatedMilestone,
    });
  } catch (error) {
    console.error("Create milestone error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already posted an update for this day",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create journey update",
    });
  }
};

export const getJourneys = async (req, res) => {
  try {
    const journeys = await Journey.find({
      isDeleted: false,
      isPublic: true,
    })
      .populate("creator", userFields)
      .sort({ createdAt: -1 });

    const finalJourneys = [];

    for (const journey of journeys) {
      await syncJourneyStatus(journey);

      if (journey.status === "active" && journey.isActive === true) {
        const obj = journey.toObject();

        finalJourneys.push({
          ...obj,
          currentDay: getCurrentJourneyDay(journey.createdAt),
          statusLabel: getJourneyStatusLabel(journey),
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: finalJourneys.length,
      journeys: finalJourneys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getSingleJourney = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("creator", userFields);

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found",
      });
    }

    await syncJourneyStatus(journey);

    const milestones = await JourneyMilestone.find({
      journey: journey._id,
      isDeleted: false,
    })
      .populate("creator", userFields)
      .populate(
        "journey",
        "title coverImage updatesCount followersCount targetDays totalDays creator status isActive"
      )
      .sort({ day: 1 });

    const currentDay = getCurrentJourneyDay(journey.createdAt);

    const todayMilestone = await JourneyMilestone.findOne({
      journey: journey._id,
      creator: journey.creator._id,
      day: currentDay,
      isDeleted: false,
    }).select("_id");

    const followed = await JourneyFollower.findOne({
      journey: journey._id,
      follower: req.user._id,
    }).select("_id");

    // Whether the viewer follows the creator's actual account. Kept
    // separate from `followed` (journey-updates follow) above so the page
    // can show two distinct buttons: "Follow Journey" vs "Follow" the
    // person, instead of conflating the two.
    const creatorFollowedByMe = Array.isArray(req.user.following)
      ? req.user.following.some(
          (id) => id.toString() === journey.creator._id.toString()
        )
      : false;

    const milestoneIds = milestones.map((item) => item._id);

    const [liked, reposted, saved] = await Promise.all([
      JourneyMilestoneLike.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),

      JourneyMilestoneRepost.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone caption createdAt updatedAt"),

      JourneyMilestoneSave.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),
    ]);

    const likedSet = new Set(liked.map((item) => item.milestone.toString()));
    const savedSet = new Set(saved.map((item) => item.milestone.toString()));

    const repostMap = new Map(
      reposted.map((item) => [
        item.milestone.toString(),
        {
          _id: item._id,
          caption: item.caption || "",
          text: item.caption || "",
          thought: item.caption || "",
          repostText: item.caption || "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      ])
    );

    const finalMilestones = milestones.map((item) => {
      const obj = item.toObject();
      const id = obj._id.toString();
      const myRepost = repostMap.get(id) || null;

      return {
        ...obj,
        likedByMe: likedSet.has(id),
        savedByMe: savedSet.has(id),
        repostedByMe: Boolean(myRepost),
        myRepost,
        repostText: myRepost?.caption || "",
      };
    });

    const totals = await getJourneyTotals(journey._id);

    const journeyObj = journey.toObject();

    const isInactive =
      journey.status !== "active" || journey.isActive !== true;

    return res.status(200).json({
      success: true,
      journey: {
        ...journeyObj,
        followedByMe: Boolean(followed),
        creatorFollowedByMe,
        isOwner: journey.creator._id.toString() === req.user._id.toString(),
        todayUpdateDone: Boolean(todayMilestone),
        currentDay,
        totals,
        statusLabel: getJourneyStatusLabel(journey),
        isInactive,
        canFollow:
          !isInactive &&
          journey.creator._id.toString() !== req.user._id.toString(),
        dayEditHistory: journeyObj.dayEditHistory || [],
      },
      milestones: finalMilestones,
    });
  } catch (error) {
    console.error("Get single journey error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get journey",
    });
  }
};

export const getMyJourneys = async (req, res) => {
  try {
    const journeys = await Journey.find({
      creator: req.user._id,
      isDeleted: false,
    })
      .populate("creator", userFields)
      .sort({ createdAt: -1 });

    const finalJourneys = [];

    for (const journey of journeys) {
      await syncJourneyStatus(journey);

      const [totals, previewMilestone] = await Promise.all([
        getJourneyTotals(journey._id),
        JourneyMilestone.findOne({
          journey: journey._id,
          isDeleted: false,
          "images.0": { $exists: true },
        })
          .sort({ day: 1 })
          .select("images"),
      ]);
      const obj = journey.toObject();

      const isInactive =
        journey.status !== "active" || journey.isActive !== true;

      finalJourneys.push({
        ...obj,
        previewImage:
          obj.coverImage || previewMilestone?.images?.[0]?.url || "",
        totals,
        currentDay: getCurrentJourneyDay(journey.createdAt),
        statusLabel: getJourneyStatusLabel(journey),
        isInactive,
        canFollow: false,
      });
    }

    return res.status(200).json({
      success: true,
      count: finalJourneys.length,
      journeys: finalJourneys,
    });
  } catch (error) {
    console.error("Get my journeys error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get my journeys",
    });
  }
};

export const getUserJourneys = async (req, res) => {
  try {
    const journeys = await Journey.find({
      creator: req.params.userId,
      isDeleted: false,
      isPublic: true,
    })
      .populate("creator", userFields)
      .sort({ createdAt: -1 });

    const finalJourneys = [];

    for (const journey of journeys) {
      await syncJourneyStatus(journey);

      const [totals, previewMilestone] = await Promise.all([
        getJourneyTotals(journey._id),
        JourneyMilestone.findOne({
          journey: journey._id,
          isDeleted: false,
          "images.0": { $exists: true },
        })
          .sort({ day: 1 })
          .select("images"),
      ]);
      const obj = journey.toObject();

      const isInactive =
        journey.status !== "active" || journey.isActive !== true;

      finalJourneys.push({
        ...obj,
        previewImage:
          obj.coverImage || previewMilestone?.images?.[0]?.url || "",
        totals,
        currentDay: getCurrentJourneyDay(journey.createdAt),
        statusLabel: getJourneyStatusLabel(journey),
        isInactive,
        canFollow: String(journey.creator?._id || journey.creator) !== String(req.user._id),
      });
    }

    return res.status(200).json({
      success: true,
      count: finalJourneys.length,
      journeys: finalJourneys,
    });
  } catch (error) {
    console.error("Get user journeys error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user journeys",
    });
  }
};

export const updateJourney = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found or not authorized",
      });
    }

    await syncJourneyStatus(journey);

    if (typeof req.body.finalNote === "string") {
      if (journey.status !== "uncompleted") {
        return res.status(400).json({
          success: false,
          message: "A final note can only be added to a missed journey",
        });
      }

      journey.finalNote = req.body.finalNote.trim();
      journey.finalNoteAt = new Date();
    }

    const oldDays = Number(journey.targetDays || journey.totalDays || 100);

    if (typeof req.body.title === "string") {
      journey.title = req.body.title.trim();
    }

    if (typeof req.body.description === "string") {
      journey.description = req.body.description.trim();
    }

    if (typeof req.body.isPublic === "boolean") {
      journey.isPublic = req.body.isPublic;
    }

    if (typeof req.body.isActive === "boolean") {
      journey.isActive = req.body.isActive;
    }

    const newDays = Number(req.body.targetDays || req.body.totalDays);

    if (newDays && newDays !== oldDays) {
      journey.targetDays = newDays;
      journey.totalDays = newDays;

      const deadline = new Date(journey.createdAt);
      deadline.setDate(deadline.getDate() + newDays - 1);
      journey.deadline = deadline;

      journey.dayEditHistory.push({
        oldDays,
        newDays,
        editedBy: req.user._id,
        editedAt: new Date(),
      });
    }

    await journey.save();

    const totals = await getJourneyTotals(journey._id);

    return res.status(200).json({
      success: true,
      message:
        newDays && newDays !== oldDays
          ? `Journey updated from ${oldDays} days to ${newDays} days`
          : "Journey updated",
      journey: {
        ...journey.toObject(),
        totals,
        currentDay: getCurrentJourneyDay(journey.createdAt),
        statusLabel: getJourneyStatusLabel(journey),
      },
    });
  } catch (error) {
    console.error("Update journey error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update journey",
    });
  }
};

export const updateJourneyCover = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found or not authorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Cover image is required",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "imcircle/journeys",
      "image"
    );

    journey.coverImage = result.secure_url;
    journey.coverImagePublicId = result.public_id;

    await journey.save();

    const totals = await getJourneyTotals(journey._id);

    return res.status(200).json({
      success: true,
      message: "Journey cover updated",
      coverImage: journey.coverImage,
      journey: {
        ...journey.toObject(),
        totals,
        currentDay: getCurrentJourneyDay(journey.createdAt),
        statusLabel: getJourneyStatusLabel(journey),
      },
    });
  } catch (error) {
    console.error("Update journey cover error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update journey cover",
    });
  }
};

export const deleteJourney = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found or not authorized",
      });
    }

    journey.isDeleted = true;
    await journey.save();

    return res.status(200).json({
      success: true,
      message: "Journey deleted",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const reportJourney = async (req, res) => {
  try {
    const { reason = "Inappropriate content" } = req.body;

    const journey = await Journey.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("creator", "fullName name username");

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found",
      });
    }

    const alreadyReported = journey.reports.some(
      (report) => report.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You already reported this journey",
      });
    }

    journey.reports.push({
      user: req.user._id,
      reason,
    });

    await journey.save();

    const reporterName =
      req.user.fullName || req.user.name || req.user.username || "A user";
    const creatorName =
      journey.creator?.fullName ||
      journey.creator?.name ||
      journey.creator?.username ||
      "Unknown";
    const journeyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/journey/${journey._id}`;

    await sendMail({
      to: REPORT_EMAIL,
      subject: "IMCircle — journey reported",
      text: `${reporterName} (${req.user.email}) reported the journey "${journey.title}" by ${creatorName}.\n\nReason: ${reason}\nLink: ${journeyUrl}`,
      html: `<p><strong>${reporterName}</strong> (${req.user.email}) reported the journey "<strong>${journey.title}</strong>" by ${creatorName}.</p><p>Reason: ${reason}</p><p>Link: <a href="${journeyUrl}">${journeyUrl}</a></p>`,
    });

    return res.status(200).json({
      success: true,
      message: "Journey reported successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const followJourney = async (req, res) => {
  try {
    const journey = await Journey.findOne({
      _id: req.params.id,
      isDeleted: false,
      isPublic: true,
    });

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found",
      });
    }

    await syncJourneyStatus(journey);

    if (journey.status !== "active" || journey.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: "This journey is not active anymore",
      });
    }

    if (journey.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow your own journey",
      });
    }

    const existingFollow = await JourneyFollower.findOne({
      journey: journey._id,
      follower: req.user._id,
    });

    if (existingFollow) {
      return res.status(200).json({
        success: true,
        message: "Already following this journey",
        followedByMe: true,
        followersCount: journey.followersCount,
      });
    }

    await JourneyFollower.create({
      journey: journey._id,
      follower: req.user._id,
    });

    journey.followersCount += 1;
    await journey.save();

    return res.status(201).json({
      success: true,
      message: "Journey followed",
      followedByMe: true,
      followersCount: journey.followersCount,
    });
  } catch (error) {
    console.error("Follow journey error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to follow journey",
    });
  }
};

export const unfollowJourney = async (req, res) => {
  try {
    const follow = await JourneyFollower.findOneAndDelete({
      journey: req.params.id,
      follower: req.user._id,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: "You are not following this journey",
      });
    }

    const journey = await Journey.findByIdAndUpdate(
      req.params.id,
      { $inc: { followersCount: -1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Journey unfollowed",
      followersCount: Math.max(journey?.followersCount || 0, 0),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getFollowingJourneys = async (req, res) => {
  try {
    const follows = await JourneyFollower.find({
      follower: req.user._id,
    })
      .populate({
        path: "journey",
        match: {
          isDeleted: false,
          isPublic: true,
        },
        populate: {
          path: "creator",
          select: userFields,
        },
      })
      .sort({ createdAt: -1 });

    const finalJourneys = [];

    for (const follow of follows) {
      if (!follow.journey) continue;

      await syncJourneyStatus(follow.journey);

      if (
        follow.journey.status === "active" &&
        follow.journey.isActive === true
      ) {
        const totals = await getJourneyTotals(follow.journey._id);
        const obj = follow.journey.toObject();

        finalJourneys.push({
          ...obj,
          totals,
          followedByMe: true,
          currentDay: getCurrentJourneyDay(follow.journey.createdAt),
          statusLabel: getJourneyStatusLabel(follow.journey),
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: finalJourneys.length,
      journeys: finalJourneys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Full-screen "reels" style discovery feed: every public/active journey's
// milestones, not just the ones the viewer already follows, ranked with a
// lightweight personalization score (see INTEREST_KEYWORDS above) so the
// feed leans toward the viewer's chosen `primaryInterest` instead of being
// a flat reverse-chronological dump.
export const getJourneyDiscoverFeed = async (req, res) => {
  try {
    const following = await JourneyFollower.find({
      follower: req.user._id,
    }).select("journey");

    const followedJourneyIds = new Set(
      following.map((item) => item.journey.toString())
    );
    const followedCreatorIds = new Set(
      (req.user.following || []).map((id) => id.toString())
    );

    const milestones = await JourneyMilestone.find({ isDeleted: false })
      .populate("creator", userFields)
      .populate({
        path: "journey",
        match: {
          isDeleted: false,
          isPublic: true,
          isActive: true,
          status: "active",
        },
        select:
          "title description tags coverImage updatesCount followersCount targetDays totalDays creator status isActive",
      })
      .sort({ createdAt: -1 })
      .limit(300);

    const validMilestones = milestones.filter((item) => item.journey);
    const milestoneIds = validMilestones.map((item) => item._id);

    const [likes, reposts, saves, comments] = await Promise.all([
      JourneyMilestoneLike.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),

      JourneyMilestoneRepost.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone caption createdAt updatedAt"),

      JourneyMilestoneSave.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),

      JourneyMilestoneComment.find({
        milestone: { $in: milestoneIds },
      }).select("milestone"),
    ]);

    const likedSet = new Set(likes.map((item) => item.milestone.toString()));
    const savedSet = new Set(saves.map((item) => item.milestone.toString()));

    const repostMap = new Map(
      reposts.map((item) => [
        item.milestone.toString(),
        {
          _id: item._id,
          caption: item.caption || "",
          text: item.caption || "",
          thought: item.caption || "",
          repostText: item.caption || "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      ])
    );

    const commentCountMap = new Map();
    for (const comment of comments) {
      const mId = comment.milestone.toString();
      commentCountMap.set(mId, (commentCountMap.get(mId) || 0) + 1);
    }

    const keywords = getInterestKeywords(req.user.primaryInterest);

    const scored = validMilestones.map((item) => {
      const obj = item.toObject();
      const milestoneId = obj._id.toString();
      const journeyId = obj.journey?._id?.toString();
      const creatorId = obj.creator?._id?.toString();
      const myRepost = repostMap.get(milestoneId) || null;
      const isFollowed = followedJourneyIds.has(journeyId);
      const interestMatch = scoreJourneyForInterest(obj.journey, keywords);

      return {
        milestone: {
          ...obj,
          likedByMe: likedSet.has(milestoneId),
          repostedByMe: Boolean(myRepost),
          myRepost,
          repostText: myRepost?.caption || "",
          savedByMe: savedSet.has(milestoneId),
          creatorFollowedByMe: creatorId
            ? followedCreatorIds.has(creatorId)
            : false,
          commentsCount: commentCountMap.get(milestoneId) || 0,
          repliesCount: commentCountMap.get(milestoneId) || 0,
          journey: { ...obj.journey, followedByMe: isFollowed },
        },
        score: interestMatch * 3 + (isFollowed ? 1 : 0),
        createdAt: obj.createdAt,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({
      success: true,
      count: scored.length,
      personalized: keywords.length > 0,
      primaryInterest: req.user.primaryInterest || "",
      milestones: scored.map((item) => item.milestone),
    });
  } catch (error) {
    console.error("Get journey discover feed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load discover feed",
    });
  }
};

export const getJourneyFeed = async (req, res) => {
  try {
    const following = await JourneyFollower.find({
      follower: req.user._id,
    }).select("journey");

    const followedJourneyIds = following.map((item) => item.journey.toString());

    const myJourneys = await Journey.find({
      creator: req.user._id,
      isDeleted: false,
    }).select("_id creator createdAt targetDays totalDays status isActive");

    for (const journey of myJourneys) {
      await syncJourneyStatus(journey);
    }

    const myJourneyIds = myJourneys.map((item) => item._id.toString());

    const journeyIds = [...followedJourneyIds, ...myJourneyIds];

    const possibleJourneys = await Journey.find({
      _id: { $in: journeyIds },
      isDeleted: false,
      isPublic: true,
    }).select("_id creator createdAt targetDays totalDays status isActive");

    const visibleJourneyIds = [];

    for (const journey of possibleJourneys) {
      await syncJourneyStatus(journey);

      if (
        (journey.status === "active" && journey.isActive === true) ||
        journey.status === "uncompleted"
      ) {
        visibleJourneyIds.push(journey._id);
      }
    }

    const milestones = await JourneyMilestone.find({
      journey: { $in: visibleJourneyIds },
      isDeleted: false,
    })
      .populate("creator", userFields)
      .populate(
        "journey",
        "title description coverImage updatesCount followersCount targetDays totalDays creator status isActive uncompletedReason uncompletedAt finalNote finalNoteAt"
      )
      .sort({ createdAt: -1 });

    const milestoneIds = milestones.map((m) => m._id);

    const [likes, reposts, saves] = await Promise.all([
      JourneyMilestoneLike.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),

      JourneyMilestoneRepost.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone caption createdAt updatedAt"),

      JourneyMilestoneSave.find({
        milestone: { $in: milestoneIds },
        user: req.user._id,
      }).select("milestone"),
    ]);

    const likedSet = new Set(likes.map((x) => x.milestone.toString()));
    const savedSet = new Set(saves.map((x) => x.milestone.toString()));

    const repostMap = new Map(
      reposts.map((x) => [
        x.milestone.toString(),
        {
          _id: x._id,
          caption: x.caption || "",
          text: x.caption || "",
          thought: x.caption || "",
          repostText: x.caption || "",
          createdAt: x.createdAt,
          updatedAt: x.updatedAt,
        },
      ])
    );

    // Whether the viewer follows each milestone creator's actual account —
    // kept separate from `followedJourneyIds` above (journey-updates
    // follow) so the feed card can show two distinct buttons: "Follow
    // Journey" vs "Follow" the person.
    const followedCreatorIds = new Set(
      (req.user.following || []).map((id) => id.toString())
    );

    const finalMilestones = milestones
      .filter((item) => item.journey)
      .map((item) => {
        const obj = item.toObject();
        const milestoneId = obj._id.toString();
        const jId = obj.journey?._id?.toString();
        const creatorIdStr = obj.creator?._id?.toString();

        const myRepost = repostMap.get(milestoneId) || null;

        return {
          ...obj,
          likedByMe: likedSet.has(milestoneId),
          repostedByMe: Boolean(myRepost),
          myRepost,
          repostText: myRepost?.caption || "",
          savedByMe: savedSet.has(milestoneId),
          creatorFollowedByMe: creatorIdStr
            ? followedCreatorIds.has(creatorIdStr)
            : false,
          journey: {
            ...obj.journey,
            followedByMe: followedJourneyIds.includes(jId),
          },
        };
      });

    return res.status(200).json({
      success: true,
      count: finalMilestones.length,
      milestones: finalMilestones,
    });
  } catch (error) {
    console.error("Get journey feed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load journey feed",
    });
  }
};

export const likeMilestone = async (req, res) => {
  try {
    const milestone = await JourneyMilestone.findOne({
      _id: req.params.milestoneId,
      isDeleted: false,
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    try {
      await JourneyMilestoneLike.create({
        milestone: milestone._id,
        user: req.user._id,
      });
    } catch (createError) {
      if (createError.code === 11000) {
        // Already liked (e.g. a duplicate/double-tap request) — treat as a
        // no-op success instead of an error so the UI doesn't break.
        const current = await JourneyMilestone.findById(milestone._id).select(
          "likesCount"
        );

        return res.status(200).json({
          success: true,
          message: "Milestone already liked",
          likedByMe: true,
          likesCount: Math.max(current?.likesCount || 0, 0),
        });
      }

      throw createError;
    }

    // Use an atomic $inc instead of `milestone.likesCount += 1; save()` —
    // $inc treats a missing/undefined counter as 0 at the database level,
    // so it can never produce NaN and trip the schema's `min: 0` validator
    // the way the old read-modify-write pattern could.
    const updated = await JourneyMilestone.findByIdAndUpdate(
      milestone._id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone liked",
      likedByMe: true,
      likesCount: Math.max(updated?.likesCount || 0, 0),
    });
  } catch (error) {
    console.error("Like milestone error:", error);

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const unlikeMilestone = async (req, res) => {
  try {
    const like = await JourneyMilestoneLike.findOneAndDelete({
      milestone: req.params.milestoneId,
      user: req.user._id,
    });

    if (!like) {
      return res.status(404).json({
        success: false,
        message: "You have not liked this milestone",
      });
    }

    const milestone = await JourneyMilestone.findByIdAndUpdate(
      req.params.milestoneId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone unliked",
      likedByMe: false,
      likesCount: Math.max(milestone?.likesCount || 0, 0),
    });
  } catch (error) {
    console.error("Unlike milestone error:", error);

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const commentMilestone = async (req, res) => {
  try {
    const milestone = await JourneyMilestone.findOne({
      _id: req.params.milestoneId,
      isDeleted: false,
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const comment = await JourneyMilestoneComment.create({
      milestone: milestone._id,
      user: req.user._id,
      text: req.body.text,
    });

    // Notify the journey owner that someone replied to this update —
    // fire-and-forget, mirrors the reply notification on posts.
    Journey.findById(milestone.journey)
      .select("creator")
      .then((journey) => {
        if (!journey?.creator) return;

        return notificationService.create({
          recipientId: journey.creator,
          actorId: req.user._id,
          type: "journey_comment",
          entityType: "journey_milestone",
          entityId: milestone._id,
          metadata: { journeyId: milestone.journey },
          message: `${req.user.fullName} replied to your journey update`,
        });
      })
      .catch(() => {});

    // @mentions inside a journey-update comment notify the mentioned
    // person, same as every other content type — fire-and-forget.
    processContentText({
      text: req.body.text,
      authorId: req.user._id,
      contentType: "comment",
      contentId: comment._id,
      link: `/journey/${milestone.journey}`,
    }).catch(() => {});

    const updated = await JourneyMilestone.findByIdAndUpdate(
      milestone._id,
      { $inc: { commentsCount: 1 } },
      { new: true }
    );

    const populatedComment = await JourneyMilestoneComment.findById(
      comment._id
    ).populate("user", userFields);

    return res.status(201).json({
      success: true,
      comment: populatedComment,
      commentsCount: Math.max(updated?.commentsCount || 0, 0),
    });
  } catch (error) {
    console.error("Comment milestone error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getMilestoneComments = async (req, res) => {
  try {
    const comments = await JourneyMilestoneComment.find({
      milestone: req.params.milestoneId,
    })
      .populate("user", userFields)
      .sort({ createdAt: -1 });

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

export const repostMilestone = async (req, res) => {
  try {
    const milestone = await JourneyMilestone.findOne({
      _id: req.params.milestoneId,
      isDeleted: false,
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const cleanCaption = (value) => {
      if (!value) return "";

      if (typeof value === "string") {
        if (value.trim() === "[object Object]") return "";
        return value.trim();
      }

      if (typeof value === "object") {
        return cleanCaption(
          value.caption ||
            value.text ||
            value.repostText ||
            value.thought ||
            value.quote ||
            ""
        );
      }

      return "";
    };

    const caption = cleanCaption(
      req.body.caption ||
        req.body.text ||
        req.body.repostText ||
        req.body.thought ||
        req.body.quote
    );

    const existingRepost = await JourneyMilestoneRepost.findOne({
      milestone: milestone._id,
      user: req.user._id,
    });

    // Shared by every branch below — resolves the journey owner and fires
    // the (de)notification, fire-and-forget, dedupe'd so toggling a
    // milestone repost on/off/on never stacks duplicate notifications.
    const notifyJourneyOwnerOfRepost = async (message) => {
      try {
        const journey = await Journey.findById(milestone.journey).select("creator");
        if (!journey?.creator) return;

        await notificationService.create({
          recipientId: journey.creator,
          actorId: req.user._id,
          type: "journey_repost",
          entityType: "journey_milestone",
          entityId: milestone._id,
          metadata: { journeyId: milestone.journey },
          message,
          dedupe: true,
        });
      } catch {
        // best-effort — never block the repost action itself
      }
    };

    const removeRepostNotification = async () => {
      try {
        const journey = await Journey.findById(milestone.journey).select("creator");
        if (!journey?.creator) return;

        await notificationService.removeByDedupeKey({
          type: "journey_repost",
          entityType: "journey_milestone",
          entityId: milestone._id,
          actorId: req.user._id,
          recipientId: journey.creator,
        });
      } catch {
        // best-effort
      }
    };

    if (existingRepost) {
      if (caption) {
        existingRepost.caption = caption;
        await existingRepost.save();

        notifyJourneyOwnerOfRepost(
          `${req.user.fullName} reposted your journey update with a thought`
        ).catch(() => {});

        return res.status(200).json({
          success: true,
          message: "Repost thought updated",
          repost: {
            ...existingRepost.toObject(),
            text: existingRepost.caption,
            thought: existingRepost.caption,
            repostText: existingRepost.caption,
          },
          repostedByMe: true,
          repostText: existingRepost.caption,
          repostsCount: milestone.repostsCount,
        });
      }

      await JourneyMilestoneRepost.findByIdAndDelete(existingRepost._id);

      milestone.repostsCount = Math.max((milestone.repostsCount || 0) - 1, 0);
      await milestone.save();

      removeRepostNotification().catch(() => {});

      return res.status(200).json({
        success: true,
        message: "Milestone repost removed",
        repostedByMe: false,
        repostText: "",
        repostsCount: milestone.repostsCount,
      });
    }

    const repost = await JourneyMilestoneRepost.create({
      milestone: milestone._id,
      user: req.user._id,
      caption,
    });

    const updatedMilestone = await JourneyMilestone.findByIdAndUpdate(
      milestone._id,
      { $inc: { repostsCount: 1 } },
      { new: true }
    );

    notifyJourneyOwnerOfRepost(
      caption
        ? `${req.user.fullName} reposted your journey update with a thought`
        : `${req.user.fullName} reposted your journey update`
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Milestone reposted",
      repost: {
        ...repost.toObject(),
        text: repost.caption,
        thought: repost.caption,
        repostText: repost.caption,
      },
      repostedByMe: true,
      repostText: repost.caption,
      repostsCount: Math.max(updatedMilestone?.repostsCount || 0, 0),
    });
  } catch (error) {
    console.error("Repost milestone error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const shareMilestone = async (req, res) => {
  try {
    const milestone = await JourneyMilestone.findOne({
      _id: req.params.milestoneId,
      isDeleted: false,
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const updated = await JourneyMilestone.findByIdAndUpdate(
      milestone._id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone shared",
      sharesCount: Math.max(updated?.sharesCount || 0, 0),
    });
  } catch (error) {
    console.error("Share milestone error:", error);

    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const saveMilestone = async (req, res) => {
  try {
    const milestone = await JourneyMilestone.findOne({
      _id: req.params.milestoneId,
      isDeleted: false,
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    try {
      await JourneyMilestoneSave.create({
        milestone: milestone._id,
        user: req.user._id,
      });
    } catch (createError) {
      if (createError.code === 11000) {
        const current = await JourneyMilestone.findById(milestone._id).select(
          "savesCount"
        );

        return res.status(200).json({
          success: true,
          message: "Milestone already saved",
          savedByMe: true,
          savesCount: Math.max(current?.savesCount || 0, 0),
        });
      }

      throw createError;
    }

    const updated = await JourneyMilestone.findByIdAndUpdate(
      milestone._id,
      { $inc: { savesCount: 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone saved",
      savedByMe: true,
      savesCount: Math.max(updated?.savesCount || 0, 0),
    });
  } catch (error) {
    console.error("Save milestone error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const unsaveMilestone = async (req, res) => {
  try {
    const saved = await JourneyMilestoneSave.findOneAndDelete({
      milestone: req.params.milestoneId,
      user: req.user._id,
    });

    if (!saved) {
      return res.status(404).json({
        success: false,
        message: "Milestone is not saved",
      });
    }

    const milestone = await JourneyMilestone.findByIdAndUpdate(
      req.params.milestoneId,
      { $inc: { savesCount: -1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone unsaved",
      savedByMe: false,
      savesCount: Math.max(milestone?.savesCount || 0, 0),
    });
  } catch (error) {
    console.error("Unsave milestone error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
