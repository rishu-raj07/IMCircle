import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import {
  resolveFolder,
  normalizeCloudinaryResult,
} from "../utils/cloudinaryUpload.js";

const uploadToCloudinary = (buffer, folder, resourceType) => {
  const imageOptions =
    resourceType === "image"
      ? {
          transformation: [
            {
              width: 1600,
              height: 1600,
              crop: "limit",
              quality: "auto:good",
              fetch_format: "auto",
            },
          ],
        }
      : {};

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...imageOptions,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// `fallbackKind` picks the folder used when the caller doesn't send a
// `purpose` field (all existing frontend call sites as of this change) —
// this keeps every current upload working exactly as before. Callers that
// do send a `purpose` (e.g. "profile", "community", "logo") land in the
// matching imcircle/* folder — see utils/cloudinaryUpload.js.
const handleUpload = async (req, res, type, fallbackKind, resourceType) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const folder = resolveFolder(req.body?.purpose, fallbackKind);
    const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);
    const normalized = normalizeCloudinaryResult(result);

    return res.status(201).json({
      success: true,
      message: `${type} uploaded successfully`,
      file: {
        // Existing fields — unchanged, so nothing reading res.data.file
        // today breaks.
        url: result.secure_url,
        publicId: result.public_id,
        type,
        bytes: result.bytes || req.file.size,
        format: result.format,
        // Additive normalized fields (see utils/cloudinaryUpload.js).
        secureUrl: normalized.secureUrl,
        resourceType: normalized.resourceType,
        width: normalized.width,
        height: normalized.height,
        duration: normalized.duration,
        provider: normalized.provider,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json({
      success: false,
      message: "File upload failed",
    });
  }
};

export const uploadImage = async (req, res) => {
  await handleUpload(req, res, "image", "post", "image");
};

export const uploadVideo = async (req, res) => {
  await handleUpload(req, res, "video", "video", "video");
};

export const uploadFile = async (req, res) => {
  await handleUpload(req, res, "file", "file", "raw");
};

export const uploadAudio = async (req, res) => {
  await handleUpload(req, res, "audio", "file", "video");
};
