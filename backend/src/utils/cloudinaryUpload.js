// Shared Cloudinary helpers — folder naming, the normalized media object
// shape, and delivery-optimization URL building. Cloudinary is the ONLY
// active media upload provider (Cloudflare Images/Stream/R2 code has been
// removed from the upload path — see launch/docs/cloudflare-media-setup.md
// for why, and launch/docs/env-setup.md for the current env structure).
//
// This module does not replace any controller's existing upload logic —
// each controller (post/journey/learning/circlePost/upload) still calls
// `cloudinary.uploader.upload_stream` itself, just pointed at the folder
// names below. This file exists so folder names and the normalized
// response shape are defined in exactly one place instead of duplicated
// across five files.

// Canonical Cloudinary folders. Existing already-uploaded media keeps
// whatever folder it was originally uploaded to — Cloudinary folders are
// purely organizational, so changing this mapping only affects where NEW
// uploads land, never existing stored URLs.
export const CLOUDINARY_FOLDERS = {
  profile: "imcircle/profiles",
  post: "imcircle/posts",
  journey: "imcircle/journeys",
  learning: "imcircle/learnings",
  community: "imcircle/communities",
  logo: "imcircle/logos",
  video: "imcircle/videos",
  file: "imcircle/files",
};

// Resolves a caller-supplied `purpose` string to one of the folders
// above, falling back to a sensible default per resource kind so callers
// that don't pass a purpose (existing behavior) keep working unchanged.
export const resolveFolder = (purpose, fallbackKind = "post") => {
  if (purpose && CLOUDINARY_FOLDERS[purpose]) {
    return CLOUDINARY_FOLDERS[purpose];
  }

  return CLOUDINARY_FOLDERS[fallbackKind] || CLOUDINARY_FOLDERS.post;
};

// Normalizes a raw Cloudinary upload result into the shape used across
// this app's newer API responses. This is additive — existing DB-persisted
// media subdocuments (Post.media, Journey images, Learning.media,
// CirclePost.media, etc.) intentionally keep storing only their existing
// { url, publicId, type } fields; this richer object is for API responses
// that aren't constrained by a fixed Mongoose subdocument schema (e.g.
// controllers/upload.controller.js), so nothing already relying on the
// old response shape breaks.
export const normalizeCloudinaryResult = (result) => ({
  url: result.url,
  secureUrl: result.secure_url,
  publicId: result.public_id,
  resourceType: result.resource_type,
  format: result.format,
  width: result.width ?? null,
  height: result.height ?? null,
  bytes: result.bytes ?? null,
  duration: result.duration ?? null,
  provider: "cloudinary",
});

// Cloudinary delivery-optimization URL builder — mirrors the logic
// already used on the frontend (frontend/src/utils/mediaOptimization.js's
// getOptimizedImageUrl), provided here too for any backend code that needs
// to build an optimized URL (e.g. for a notification thumbnail or email).
// Non-Cloudinary URLs are returned unchanged — this never breaks an
// existing stored URL that isn't a Cloudinary asset.
export const getOptimizedCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return url;
  }

  if (url.includes("/f_auto,")) return url; // already optimized

  const { width = 700, quality = "auto", crop = "limit", format = "auto" } = options;

  return url.replace(
    "/upload/",
    `/upload/f_${format},q_${quality},c_${crop},w_${width}/`
  );
};
