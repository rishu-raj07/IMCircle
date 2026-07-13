const ALLOWED_AVATAR_HOSTS = [
  "cloudinary.com",
  "googleusercontent.com",
  "imcircle.com",
];

const isAllowedHost = (hostname, requestHost) => {
  const value = String(hostname || "").toLowerCase();
  const ownHost = String(requestHost || "").split(":")[0].toLowerCase();
  if (value === ownHost) return true;
  return ALLOWED_AVATAR_HOSTS.some(
    (host) => value === host || value.endsWith(`.${host}`)
  );
};

export const proxyAvatarImage = async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl || rawUrl.length > 2048) {
      return res.status(400).json({ success: false, message: "Invalid image URL" });
    }

    const target = new URL(rawUrl);
    if (!["http:", "https:"].includes(target.protocol) || !isAllowedHost(target.hostname, req.get("host"))) {
      return res.status(400).json({ success: false, message: "Image host is not allowed" });
    }

    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "image/*" },
    });

    if (!response.ok || !response.url) {
      return res.status(404).json({ success: false, message: "Image unavailable" });
    }

    const finalUrl = new URL(response.url);
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!isAllowedHost(finalUrl.hostname, req.get("host")) || !contentType.startsWith("image/") || contentLength > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Invalid image response" });
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Image is too large" });
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=300");
    return res.send(body);
  } catch {
    return res.status(404).json({ success: false, message: "Image unavailable" });
  }
};
