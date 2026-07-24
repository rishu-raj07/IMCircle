import { Readable } from "stream";
import NewsItem, { buildContentHash } from "../models/NewsItem.js";
import { notifyUsersForNewNews } from "../services/news/newsNotification.service.js";
import cloudinary from "../config/cloudinary.js";
import { CLOUDINARY_FOLDERS, normalizeCloudinaryResult } from "../utils/cloudinaryUpload.js";

const TITLE_MAX = 300;
const SUMMARY_MAX = 600;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Categories/industries/roles are free-text tags here rather than run
// through the RSS pipeline's keyword classifier (newsClassifier.js) — an
// admin manually authoring an announcement already knows exactly who it's
// for, so there's no guessing involved, and it sidesteps the keyword
// over/under-matching tuning that classifier needs for ingested content.
function parseTagList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

// Same upload_stream pattern every other upload controller in this app uses
// (see controllers/upload.controller.js) — deliberately not imported from
// there since that file's own helper isn't exported; each controller owns
// its own small copy per the existing convention (see utils/cloudinaryUpload.js's
// top comment). Images only here (this is specifically for news card
// images), with the same size-capping transform the general upload
// endpoint applies.
function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit", quality: "auto:good", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

// POST /admin/news/upload-image — a dedicated admin-gated upload endpoint
// rather than reusing the general /api/upload/image route, because that
// one is protected by `protect` (regular USER JWT, looks the id up in the
// User collection) — an admin's JWT has a different scope/secret and no
// User document at all, so it would reject every admin request. This is
// the same Cloudinary call, just behind `adminProtect` instead.
export const uploadNewsImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.news);
    const normalized = normalizeCloudinaryResult(result);

    res.status(201).json({
      success: true,
      file: { url: normalized.secureUrl, publicId: normalized.publicId },
    });
  } catch (error) {
    console.error("[adminNews] Image upload failed:", error?.message);
    res.status(500).json({ success: false, message: "Image upload failed." });
  }
};

// GET /admin/news — admin-authored items only (isAdminAuthored: true).
// Content ingested via RSS is reviewed on the separate Content page; this
// is specifically the manual-entry tool's own management list.
export const listNews = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || "").trim();

    const filter = { isAdminAuthored: true };
    if (q) {
      filter.title = new RegExp(escapeRegExp(q), "i");
    }

    const [items, total] = await Promise.all([
      NewsItem.find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdByAdmin", "mobile role")
        .lean(),
      NewsItem.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, items, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load news items." });
  }
};

export const getNewsDetail = async (req, res) => {
  try {
    const item = await NewsItem.findOne({ _id: req.params.id, isAdminAuthored: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: "Not found." });
    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load that item." });
  }
};

// POST /admin/news — manual entry, bypasses the RSS ingestion pipeline
// entirely (see services/news/ for that path — providers, classifier,
// image-required validation all live there and don't apply here). Stored
// with isAdminAuthored: true + createdByAdmin so it's identifiable later if
// the user-facing feed queries (news.controller.js) ever need to treat
// admin content differently — today it's just another "active" NewsItem
// row, ranked and filtered the same as anything ingested.
export const createNews = async (req, res) => {
  try {
    const {
      title,
      summary,
      imageUrl,
      sourceName,
      sourceUrl,
      type,
      categories,
      industries,
      roles,
      publishedAt,
      isBreaking,
      notifyMatchedUsers,
    } = req.body || {};

    const cleanTitle = String(title || "").trim().slice(0, TITLE_MAX);
    if (!cleanTitle) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }

    const cleanSourceUrl = String(sourceUrl || "").trim();
    if (!/^https?:\/\//i.test(cleanSourceUrl)) {
      return res.status(400).json({
        success: false,
        message: "A valid link (starting with http:// or https://) is required.",
      });
    }

    const publishDate = publishedAt ? new Date(publishedAt) : new Date();
    if (Number.isNaN(publishDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid publish date." });
    }

    const doc = {
      type: type || "announcement",
      title: cleanTitle,
      normalizedTitle: normalizeTitle(cleanTitle),
      summary: String(summary || "").trim().slice(0, SUMMARY_MAX),
      sourceName: String(sourceName || "IMCircle").trim().slice(0, 120) || "IMCircle",
      sourceUrl: cleanSourceUrl,
      providerId: "admin",
      externalId: "",
      imageUrl: String(imageUrl || "").trim(),
      publishedAt: publishDate,
      categories: parseTagList(categories),
      roles: parseTagList(roles),
      industries: parseTagList(industries),
      locations: [],
      keywords: [],
      // Admin-authored content is presumed genuinely relevant to whoever it
      // targets (no engagement signal to score it by the way ingested
      // items are) — a flat, decent baseline rather than 0, so it doesn't
      // get quietly outranked by ordinary news in any score-sorted view.
      qualityScore: 80,
      importanceScore: isBreaking ? 90 : 60,
      isBreaking: Boolean(isBreaking),
      isNotificationEligible: Boolean(notifyMatchedUsers),
      status: "active",
      isAdminAuthored: true,
      createdByAdmin: req.admin._id,
    };

    // contentHash has a unique index and is normally the RSS-dedupe key —
    // meaningless for a one-off manual entry, so this just needs to be
    // guaranteed unique, not meaningfully derived from content.
    doc.contentHash = buildContentHash({
      sourceName: doc.sourceName,
      externalId: `admin:${req.admin._id}:${Date.now()}`,
      sourceUrl: doc.sourceUrl,
      title: doc.title,
    });

    const created = await NewsItem.create(doc);

    if (notifyMatchedUsers) {
      // Fire-and-forget — reuses the exact same field/interest matching the
      // RSS pipeline uses (see newsNotification.service.js), so an admin
      // announcement notifies users exactly like a matching ingested story
      // would. A notification failure must never make post creation look
      // like it failed.
      notifyUsersForNewNews([created.toObject()]).catch(() => {});
    }

    res.status(201).json({ success: true, item: created });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not create that news item." });
  }
};

// PATCH /admin/news/:id — edit fields and/or toggle status
// (active/hidden/rejected). Only ever touches admin-authored rows — never
// lets this endpoint edit an ingested item, which has its own review flow.
export const updateNews = async (req, res) => {
  try {
    const item = await NewsItem.findOne({ _id: req.params.id, isAdminAuthored: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found." });

    const {
      title,
      summary,
      imageUrl,
      sourceName,
      sourceUrl,
      type,
      categories,
      industries,
      roles,
      publishedAt,
      isBreaking,
      status,
    } = req.body || {};

    if (title !== undefined) {
      const cleanTitle = String(title).trim().slice(0, TITLE_MAX);
      if (!cleanTitle) {
        return res.status(400).json({ success: false, message: "Title cannot be empty." });
      }
      item.title = cleanTitle;
      item.normalizedTitle = normalizeTitle(cleanTitle);
    }
    if (summary !== undefined) item.summary = String(summary).trim().slice(0, SUMMARY_MAX);
    if (imageUrl !== undefined) item.imageUrl = String(imageUrl).trim();
    if (sourceName !== undefined) {
      item.sourceName = String(sourceName).trim().slice(0, 120) || "IMCircle";
    }
    if (sourceUrl !== undefined) {
      const cleanUrl = String(sourceUrl).trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return res.status(400).json({
          success: false,
          message: "A valid link (starting with http:// or https://) is required.",
        });
      }
      item.sourceUrl = cleanUrl;
    }
    if (type !== undefined) item.type = type;
    if (categories !== undefined) item.categories = parseTagList(categories);
    if (industries !== undefined) item.industries = parseTagList(industries);
    if (roles !== undefined) item.roles = parseTagList(roles);
    if (publishedAt !== undefined) {
      const parsedDate = new Date(publishedAt);
      if (!Number.isNaN(parsedDate.getTime())) item.publishedAt = parsedDate;
    }
    if (isBreaking !== undefined) item.isBreaking = Boolean(isBreaking);
    if (status !== undefined && ["active", "hidden", "rejected"].includes(status)) {
      item.status = status;
    }

    await item.save();
    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update that item." });
  }
};

// DELETE /admin/news/:id — permanent removal. Prefer PATCHing status to
// "hidden" from the list UI for anything that might need to come back;
// this is for genuine mistakes (wrong content entirely, test entries).
export const deleteNews = async (req, res) => {
  try {
    const result = await NewsItem.deleteOne({ _id: req.params.id, isAdminAuthored: true });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not delete that item." });
  }
};
