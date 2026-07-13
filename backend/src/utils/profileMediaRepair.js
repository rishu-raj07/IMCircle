import cloudinary from "../config/cloudinary.js";

const PROFILE_MEDIA_FIELDS = ["avatar", "coverImage"];

const isCloudinaryUrl = (value) => {
  try {
    const hostname = new URL(String(value || "")).hostname.toLowerCase();
    return hostname === "res.cloudinary.com" || hostname.endsWith(".res.cloudinary.com");
  } catch {
    return false;
  }
};

const getCloudinaryPublicId = (value) => {
  try {
    const url = new URL(String(value || ""));
    const uploadPath = decodeURIComponent(url.pathname).split("/upload/")[1];
    if (!uploadPath) return "";

    const parts = uploadPath.split("/").filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const assetParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts;
    if (!assetParts.length) return "";

    return assetParts.join("/").replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return "";
  }
};

const cloudinaryAssetExists = async (value) => {
  const publicId = getCloudinaryPublicId(value);
  if (!publicId) return true;

  try {
    await cloudinary.api.resource(publicId, { resource_type: "image" });
    return true;
  } catch (error) {
    const status = Number(error?.http_code || error?.error?.http_code || 0);
    const message = String(error?.message || error?.error?.message || "").toLowerCase();
    if (status === 404 || message.includes("not found")) return false;

    // A temporary provider failure must never erase otherwise valid media.
    throw error;
  }
};

/**
 * Verifies profile media only when its URL has changed since the last check.
 * Restored MongoDB records can reference a Cloudinary asset that no longer
 * exists; clearing that stale value lets every client use its normal avatar
 * fallback without repeatedly requesting a known-missing image.
 */
export const repairMissingProfileMedia = async (user) => {
  if (!user?._id) return user;

  const validation = user.profileMediaValidation || {};
  const set = {};

  await Promise.all(
    PROFILE_MEDIA_FIELDS.map(async (field) => {
      const value = String(user[field] || "").trim();
      const validationField = field === "coverImage" ? "coverImageUrl" : "avatarUrl";

      if (String(validation?.[validationField] || "") === value) return;

      if (!value || !isCloudinaryUrl(value)) {
        set[`profileMediaValidation.${validationField}`] = value;
        return;
      }

      try {
        const exists = await cloudinaryAssetExists(value);
        if (!exists) {
          set[field] = "";
          user[field] = "";
          set[`profileMediaValidation.${validationField}`] = "";
          return;
        }

        set[`profileMediaValidation.${validationField}`] = value;
      } catch (error) {
        console.warn(
          `[profile-media] Could not verify ${field} for user ${user._id}:`,
          error?.message || error
        );
      }
    })
  );

  if (Object.keys(set).length) {
    set["profileMediaValidation.checkedAt"] = new Date();
    await user.constructor.updateOne({ _id: user._id }, { $set: set });
  }

  return user;
};

export default repairMissingProfileMedia;
