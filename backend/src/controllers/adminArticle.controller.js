import { Readable } from "stream";
import mongoose from "mongoose";
import Article, { generateUniqueSlug } from "../models/Article.js";
import cloudinary from "../config/cloudinary.js";
import { CLOUDINARY_FOLDERS, normalizeCloudinaryResult } from "../utils/cloudinaryUpload.js";

// Admin-authored content (internal editorial writing, or external
// summaries the admin curates) — created directly as published/draft, no
// review workflow attached to it, since the admin IS the reviewer. The
// separate community-submission review workflow (draft -> pending_review ->
// approved/rejected/changes_requested) is a later phase and lives on the
// same Article model/status enum, just untouched by this controller.

const TITLE_MAX = 180;
const SUMMARY_MAX = 500;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Same upload_stream-per-controller convention as adminNews.controller.js
// (see that file's comment — each controller keeps its own small copy
// rather than importing a shared uploader).
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

// POST /admin/articles/upload-image — dedicated admin-gated upload
// endpoint, same reasoning as adminNews.controller.js's uploadNewsImage
// (admin JWT scope has no User document, so /api/upload/image's `protect`
// middleware would reject it).
export const uploadArticleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.article);
    const normalized = normalizeCloudinaryResult(result);

    res.status(201).json({
      success: true,
      file: { url: normalized.secureUrl, publicId: normalized.publicId },
    });
  } catch (error) {
    console.error("[adminArticle] Image upload failed:", error?.message);
    res.status(500).json({ success: false, message: "Image upload failed." });
  }
};

// GET /admin/articles — page/limit pagination (established admin-list
// convention — see adminUsers.controller.js/adminContent.controller.js —
// distinct from the cursor pagination the public feed endpoints use).
export const listArticles = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const { status, category, articleType, q } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (articleType && articleType !== "all") filter.articleType = articleType;
    if (q?.trim()) filter.title = new RegExp(escapeRegExp(q.trim()), "i");

    const [items, total] = await Promise.all([
      Article.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "fullName username avatar")
        .populate("createdBy", "fullName username")
        .lean(),
      Article.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, items, total, page, limit });
  } catch (error) {
    console.error("[adminArticle] listArticles failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not load articles." });
  }
};

export const getArticleDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const item = await Article.findById(req.params.id)
      .populate("author", "fullName username avatar")
      .populate("createdBy", "fullName username")
      .populate("reviewedBy", "fullName username")
      .lean();

    if (!item) return res.status(404).json({ success: false, message: "Not found." });
    res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("[adminArticle] getArticleDetail failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not load that article." });
  }
};

// POST /admin/articles — create either an internal (full content, written
// by/attributed to the admin or an editorial byline) or external (summary
// only — never a full copied body) article. Publishing immediately vs
// saving as a draft is controlled by `publishNow`.
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      shortSummary,
      content,
      contentFormat,
      whyItMatters,
      keyTakeaways,
      coverImage,
      articleType,
      authorName,
      sourceName,
      sourceUrl,
      category,
      industries,
      tags,
      targetRoles,
      targetInterests,
      language,
      isFeatured,
      allowThoughts,
      publishNow,
      scheduledAt,
    } = req.body || {};

    const cleanTitle = String(title || "").trim().slice(0, TITLE_MAX);
    if (!cleanTitle) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }

    const cleanSummary = String(shortSummary || "").trim().slice(0, SUMMARY_MAX);
    if (!cleanSummary) {
      return res.status(400).json({ success: false, message: "Short summary is required." });
    }

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required." });
    }

    const resolvedType = articleType === "external" ? "external" : "internal";

    if (resolvedType === "external") {
      const cleanSourceUrl = String(sourceUrl || "").trim();
      if (!/^https?:\/\//i.test(cleanSourceUrl)) {
        return res.status(400).json({
          success: false,
          message: "External articles require a valid source link (http:// or https://).",
        });
      }
      if (!String(sourceName || "").trim()) {
        return res.status(400).json({ success: false, message: "Source name is required for external articles." });
      }
    } else if (!String(content || "").trim()) {
      return res.status(400).json({ success: false, message: "Content is required for internal articles." });
    }

    const doc = {
      title: cleanTitle,
      shortSummary: cleanSummary,
      // External articles never store a full copied body — whyItMatters +
      // keyTakeaways are the only "IMCircle-written" text allowed alongside
      // the source link.
      content: resolvedType === "internal" ? String(content || "") : "",
      contentFormat: contentFormat || "html",
      whyItMatters: String(whyItMatters || "").trim().slice(0, 600),
      keyTakeaways: Array.isArray(keyTakeaways) ? keyTakeaways.slice(0, 10) : [],
      coverImage: coverImage
        ? {
            url: String(coverImage.url || ""),
            publicId: String(coverImage.publicId || ""),
            altText: String(coverImage.altText || ""),
          }
        : undefined,
      articleType: resolvedType,
      // Admin-authored content is never a "Community Article" — this is
      // exactly the flag the public listArticles curated-tab filter checks
      // to admit an article without it needing to go through the
      // submit-for-feature/review workflow (see article.controller.js's
      // curatedTabFilter).
      isCommunityArticle: false,
      authorName: String(authorName || "").trim().slice(0, 120),
      authorType: "admin",
      sourceName: resolvedType === "external" ? String(sourceName || "").trim().slice(0, 120) : "",
      sourceUrl: resolvedType === "external" ? String(sourceUrl || "").trim() : "",
      category,
      industries: Array.isArray(industries) ? industries : [],
      tags: Array.isArray(tags) ? tags : [],
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      targetInterests: Array.isArray(targetInterests) ? targetInterests : [],
      language: language || "English",
      isFeatured: Boolean(isFeatured),
      allowThoughts: allowThoughts !== false,
      createdBy: req.admin._id,
    };

    doc.slug = await generateUniqueSlug(cleanTitle, Article);

    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      if (!Number.isNaN(parsed.getTime())) doc.scheduledAt = parsed;
    }

    if (publishNow) {
      // isFeatured + status must move together (see featureArticle's
      // comment) — creating it already-featured skips straight there
      // instead of landing on "published" with a mismatched flag.
      doc.status = doc.isFeatured ? "featured" : "published";
      doc.publishedAt = new Date();
    } else {
      doc.status = "draft";
    }

    const created = await Article.create(doc);
    res.status(201).json({ success: true, item: created });
  } catch (error) {
    console.error("[adminArticle] createArticle failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not create that article." });
  }
};

// PATCH /admin/articles/:id — field edits and status transitions
// (draft/published/archived) in one endpoint, mirroring adminNews's
// updateNews shape. Full moderation actions (approve/reject/request
// changes with a required note, scheduling, notify) are a later phase once
// community submissions exist — this endpoint only needs to support
// admin-authored content edits today.
export const updateArticle = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const item = await Article.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found." });

    const {
      title,
      shortSummary,
      content,
      contentFormat,
      whyItMatters,
      keyTakeaways,
      coverImage,
      authorName,
      sourceName,
      sourceUrl,
      category,
      industries,
      tags,
      targetRoles,
      targetInterests,
      language,
      isFeatured,
      allowThoughts,
      status,
    } = req.body || {};

    if (title !== undefined) {
      const cleanTitle = String(title).trim().slice(0, TITLE_MAX);
      if (!cleanTitle) return res.status(400).json({ success: false, message: "Title cannot be empty." });
      item.title = cleanTitle;
    }
    if (shortSummary !== undefined) item.shortSummary = String(shortSummary).trim().slice(0, SUMMARY_MAX);
    if (content !== undefined && item.articleType === "internal") item.content = String(content);
    if (contentFormat !== undefined) item.contentFormat = contentFormat;
    if (whyItMatters !== undefined) item.whyItMatters = String(whyItMatters).trim().slice(0, 600);
    if (keyTakeaways !== undefined) item.keyTakeaways = Array.isArray(keyTakeaways) ? keyTakeaways.slice(0, 10) : [];
    if (coverImage !== undefined) {
      item.coverImage = {
        url: String(coverImage?.url || ""),
        publicId: String(coverImage?.publicId || ""),
        altText: String(coverImage?.altText || ""),
      };
    }
    if (authorName !== undefined) item.authorName = String(authorName).trim().slice(0, 120);
    if (item.articleType === "external") {
      if (sourceName !== undefined) item.sourceName = String(sourceName).trim().slice(0, 120);
      if (sourceUrl !== undefined) {
        const cleanUrl = String(sourceUrl).trim();
        if (!/^https?:\/\//i.test(cleanUrl)) {
          return res.status(400).json({ success: false, message: "A valid source link is required." });
        }
        item.sourceUrl = cleanUrl;
      }
    }
    if (category !== undefined) item.category = category;
    if (industries !== undefined) item.industries = Array.isArray(industries) ? industries : [];
    if (tags !== undefined) item.tags = Array.isArray(tags) ? tags : [];
    if (targetRoles !== undefined) item.targetRoles = Array.isArray(targetRoles) ? targetRoles : [];
    if (targetInterests !== undefined) item.targetInterests = Array.isArray(targetInterests) ? targetInterests : [];
    if (language !== undefined) item.language = language;
    if (isFeatured !== undefined) item.isFeatured = Boolean(isFeatured);
    if (allowThoughts !== undefined) item.allowThoughts = Boolean(allowThoughts);

    if (status !== undefined && ["draft", "published", "archived"].includes(status)) {
      if (status === "published" && item.status !== "published") item.publishedAt = new Date();
      item.status = status;
    }

    // Reconcile isFeatured + status (see featureArticle's comment — these
    // two fields must never disagree, since getFeaturedArticles/
    // curatedTabFilter require both).
    if (item.isFeatured && item.status !== "archived" && item.status !== "removed") {
      item.status = "featured";
      if (!item.publishedAt) item.publishedAt = new Date();
    } else if (!item.isFeatured && item.status === "featured") {
      item.status = "published";
    }

    await item.save();
    res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("[adminArticle] updateArticle failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not update that article." });
  }
};

// PATCH /admin/articles/:id/feature — toggle the featured rail flag as its
// own small action (separate from the general edit form). isFeatured and
// status must always move together (see article.controller.js's
// getFeaturedArticles/curatedTabFilter, which require BOTH status
// "featured" AND isFeatured: true) — this is the admin-authored-content
// path for that; the community-article path is the separate submit-for-
// feature/approve review workflow (Phase 3), which sets both fields too.
export const featureArticle = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const wantsFeatured = Boolean(req.body?.isFeatured);
    const item = await Article.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found." });

    item.isFeatured = wantsFeatured;
    if (wantsFeatured) {
      item.status = "featured";
      if (!item.publishedAt) item.publishedAt = new Date();
    } else if (item.status === "featured") {
      // Unfeaturing admin-authored content returns it to plain published,
      // not draft — it was already live before being featured.
      item.status = "published";
    }

    await item.save();
    res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("[adminArticle] featureArticle failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not update featured state." });
  }
};

// DELETE /admin/articles/:id — permanent removal. Prefer PATCHing status
// to "archived" for anything that might need to come back.
export const deleteArticle = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid article id." });
    }

    const result = await Article.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[adminArticle] deleteArticle failed:", error?.message);
    res.status(500).json({ success: false, message: "Could not delete that article." });
  }
};
