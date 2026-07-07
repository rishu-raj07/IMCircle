const DEFAULT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23f1f5f9'/%3E%3Cpath d='M96 292l118-118 86 86 52-52 192 192H96z' fill='%23cbd5e1'/%3E%3Ccircle cx='452' cy='124' r='48' fill='%23e2e8f0'/%3E%3C/svg%3E";

export function supportsWebP() {
  try {
    const canvas = document.createElement("canvas");
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

export function getOptimizedImageUrl(src, options = {}) {
  if (!src || typeof src !== "string") return DEFAULT_PLACEHOLDER;

  const {
    width = 700,
    quality = "auto",
    crop = "limit",
    format = "auto",
  } = options;

  if (!src.includes("res.cloudinary.com") || src.includes("/f_auto,")) {
    return src;
  }

  return src.replace(
    "/upload/",
    `/upload/f_${format},q_${quality},c_${crop},w_${width}/`
  );
}

export function getPlaceholderImage() {
  return DEFAULT_PLACEHOLDER;
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export async function compressImageFile(file, options = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;

  const {
    maxSizeKB = 250,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
  } = options;

  if (file.size <= maxSizeKB * 1024) return file;

  const img = await readFileAsImage(file);
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  const outputType = supportsWebP() ? "image/webp" : "image/jpeg";
  let currentQuality = quality;
  let blob = await canvasToBlob(canvas, outputType, currentQuality);

  while (blob && blob.size > maxSizeKB * 1024 && currentQuality > 0.52) {
    currentQuality -= 0.08;
    blob = await canvasToBlob(canvas, outputType, currentQuality);
  }

  if (!blob) return file;

  const ext = outputType === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);

  return new File([blob], name, {
    type: outputType,
    lastModified: Date.now(),
  });
}

export async function compressFormDataImages(formData, profile = "post") {
  const sizeMap = {
    avatar: { maxSizeKB: 80, maxWidth: 512, maxHeight: 512 },
    community: { maxSizeKB: 120, maxWidth: 900, maxHeight: 900 },
    post: { maxSizeKB: 250, maxWidth: 1600, maxHeight: 1600 },
    learning: { maxSizeKB: 250, maxWidth: 1600, maxHeight: 1600 },
    journeyCover: { maxSizeKB: 300, maxWidth: 1800, maxHeight: 1200 },
    journeyDay: { maxSizeKB: 250, maxWidth: 1600, maxHeight: 1600 },
    logo: { maxSizeKB: 70, maxWidth: 512, maxHeight: 512 },
    banner: { maxSizeKB: 300, maxWidth: 1800, maxHeight: 1200 },
  };

  const limits = sizeMap[profile] || sizeMap.post;
  const next = new FormData();

  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.type?.startsWith("image/")) {
      next.append(key, await compressImageFile(value, limits));
    } else {
      next.append(key, value);
    }
  }

  return next;
}
