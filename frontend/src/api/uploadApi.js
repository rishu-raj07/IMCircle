import api from "./axios";
import { compressImageFile } from "../utils/mediaOptimization";

// --- Cloudinary upload (the only active upload provider) -----------------
// Existing callers (CreateCircle, CreateProject, AddCollegeModal,
// AddCompanyModal, ImageUploader) all expect the plain
// { url, publicId, type, bytes, format } shape this already returns —
// that shape is unchanged, so nothing breaks. A few additive fields
// (secureUrl, resourceType, width, height, duration, provider) are also
// present now — see backend/src/utils/cloudinaryUpload.js.
//
// `options.purpose` is optional — when passed ("profile" | "post" |
// "journey" | "learning" | "community" | "logo"), the backend routes the
// upload to the matching imcircle/* Cloudinary folder instead of the
// default. Omitting it keeps the previous default-folder behavior.
export const uploadImage = async (file, options = {}) => {
  const optimizedFile = await compressImageFile(file, {
    maxSizeKB: options.maxSizeKB || 180,
    maxWidth: options.maxWidth || 1200,
    maxHeight: options.maxHeight || 1200,
    quality: options.quality || 0.82,
  });

  const formData = new FormData();
  formData.append("file", optimizedFile);
  if (options.purpose) {
    formData.append("purpose", options.purpose);
  }

  const res = await api.post("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    ...res.data.file,
    originalSize: file?.size || 0,
    uploadedSize: optimizedFile?.size || file?.size || 0,
    compressed: Boolean(file?.size && optimizedFile?.size && optimizedFile.size < file.size),
  };
};

// Note: an earlier iteration of this file added a Cloudflare direct-upload
// flow (getImageDirectUploadUrl / uploadToDirectUrl / completeUpload /
// uploadMedia) alongside this Cloudinary path. The product decision is now
// to run on Cloudinary only for the foreseeable future — Cloudflare stays
// in the picture for DNS/SSL/security, not media uploads — so that dead
// code has been removed rather than left as an unused parallel path.
// Nothing in the app ever called those functions (verified via a
// repo-wide search before removing them), so this is safe. See
// launch/docs/cloudflare-media-setup.md for the historical context.
