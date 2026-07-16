// Helpers for reading a display URL out of either:
//   (a) a plain URL string — the shape actually used everywhere today
//       (Cloudinary URLs, stored directly on User.avatar, User.coverImage,
//       Post.media, etc.), or
//   (b) a normalized media object, in case any upload path ever returns
//       one instead of a plain string: { provider, mediaId, url,
//       thumbnailUrl, variants, type }
//
// This file is the ONLY place that needs to understand both shapes.
// Everything downstream (ImageLoader, avatar/cover renders, etc.) just
// calls these helpers and gets a plain string back.
//
// Note: Cloudinary is the only active media provider — see
// launch/docs/cloudinary-media-setup.md. `isCloudflareMedia` below exists
// for forward compatibility only; nothing in this app currently produces
// a media object with a "cloudflare-" provider, so it always returns
// false today. See launch/docs/cloudflare-media-setup.md for why.

export const isCloudflareMedia = (media) => {
  return Boolean(
    media &&
      typeof media === "object" &&
      typeof media.provider === "string" &&
      media.provider.startsWith("cloudflare-")
  );
};

export const isCloudinaryUrl = (url) => {
  return typeof url === "string" && url.includes("res.cloudinary.com");
};

// Returns a plain URL string (or null) for any supported media value.
// `variant` is only meaningful for Cloudflare Images
// ("thumbnail" | "feed" | "profile" | "cover" | "original").
export const getMediaUrl = (media, variant = "original") => {
  if (!media) return null;

  if (typeof media === "string") {
    // Legacy shape — a plain Cloudinary (or any other) URL. Nothing to
    // normalize.
    return media;
  }

  if (typeof media === "object") {
    if (media.variants && media.variants[variant]) {
      return media.variants[variant];
    }

    return media.url || media.thumbnailUrl || null;
  }

  return null;
};

export const getImageUrl = (media, variant = "feed") => getMediaUrl(media, variant);

export const getAvatarUrl = (user) => getMediaUrl(user?.avatar, "profile");

export const getCoverUrl = (user) => getMediaUrl(user?.coverImage, "cover");

// Branded placeholders shown wherever a journey or community/circle has no
// cover photo uploaded, instead of a plain generic icon (Flame/Sparkles/
// Users, previously different at almost every call site). These two files
// live in /public (frontend/public/journey-icon.png,
// frontend/public/community-icon.png), same as the gender avatar icons —
// referenced as root-relative paths.
export const getJourneyCoverIcon = () => "/journey-icon.png";
export const getCommunityCoverIcon = () => "/community-icon.png";
