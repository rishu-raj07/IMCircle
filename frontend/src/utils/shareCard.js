import QRCode from "qrcode";

// Client-side branded share-card generator.
//
// Renders a 1080x1350 PNG entirely in the browser (no server round-trip,
// no image-generation dependency) that a user can share to WhatsApp
// Status / Instagram Story / Twitter, or download. This is the loop that
// turns an in-app action (a streak, a milestone) into something that
// travels outside the app carrying the IMCircle brand with it.

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const INK = "#12141C";
const INDIGO = "#4338CA";
const INDIGO_DARK = "#2E2A8F";
const ELECTRIC = "#2563EB";
const VIOLET = "#7C3AED";
const MARIGOLD = "#EC9A1E";
const CARD = "#F8FAFC";

async function ensureFontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 64px Fraunces'),
      document.fonts.load('600 40px Fraunces'),
      document.fonts.load('800 32px Inter'),
      document.fonts.load('700 28px Inter'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fonts may not be ready (older browser, or blocked network) -
    // canvas will fall back to generic serif/sans-serif, which is fine.
  }
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, "#F8FBFF");
  gradient.addColorStop(0.46, "#EEF2FF");
  gradient.addColorStop(1, "#E0EAFF");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.95;
  const hero = ctx.createRadialGradient(850, 160, 40, 850, 160, 560);
  hero.addColorStop(0, "rgba(124,58,237,0.30)");
  hero.addColorStop(0.45, "rgba(37,99,235,0.16)");
  hero.addColorStop(1, "rgba(37,99,235,0)");
  ctx.fillStyle = hero;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  ctx.save();
  ctx.translate(CARD_WIDTH - 105, 155);
  [340, 250, 170].forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = index === 2 ? "rgba(236,154,30,0.26)" : "rgba(67,56,202,0.12)";
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.translate(70, CARD_HEIGHT - 90);
  ctx.beginPath();
  ctx.arc(0, 0, 220, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(67,56,202,0.10)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(18,20,28,0.10)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, 70, 70, CARD_WIDTH - 140, CARD_HEIGHT - 140, 58);
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.fill();
  ctx.restore();
}

function drawWordmark(ctx, x, y) {
  drawLogoMark(ctx, x + 34, y - 14, 36);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "800 34px Inter, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText("IM", x + 86, y);
  const imWidth = ctx.measureText("IM").width;
  ctx.fillStyle = INDIGO;
  ctx.fillText("Circle", x + 86 + imWidth, y);
}

function drawLogoMark(ctx, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = Math.max(4, radius * 0.09);
  ctx.strokeStyle = "rgba(67,56,202,0.16)";
  ctx.stroke();

  ctx.lineWidth = Math.max(6, radius * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.76, Math.PI * 0.9, Math.PI * 1.48);
  ctx.strokeStyle = ELECTRIC;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.76, Math.PI * 1.62, Math.PI * 2.22);
  ctx.strokeStyle = VIOLET;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.76, Math.PI * 0.1, Math.PI * 0.55);
  ctx.strokeStyle = INDIGO;
  ctx.stroke();

  [
    [Math.PI * 0.18, VIOLET],
    [Math.PI * 0.65, ELECTRIC],
    [Math.PI * 1.08, ELECTRIC],
    [Math.PI * 1.55, VIOLET],
  ].forEach(([angle, color]) => {
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * radius * 0.76,
      cy + Math.sin(angle) * radius * 0.76,
      radius * 0.13,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = color;
    ctx.fill();
  });

  ctx.font = `900 ${Math.round(radius * 0.64)}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#020617";
  ctx.fillText("im", cx, cy + radius * 0.04);
  ctx.restore();
}

function drawFlame(ctx, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const flame = ctx.createLinearGradient(0, -140, 0, 120);
  flame.addColorStop(0, "#F97316");
  flame.addColorStop(0.55, "#EF4444");
  flame.addColorStop(1, "#7C2D12");
  ctx.beginPath();
  ctx.moveTo(0, -150);
  ctx.bezierCurveTo(84, -72, 88, 30, 24, 104);
  ctx.bezierCurveTo(0, 130, -46, 116, -66, 76);
  ctx.bezierCurveTo(-104, 0, -42, -54, 0, -150);
  ctx.fillStyle = flame;
  ctx.fill();

  const inner = ctx.createLinearGradient(0, -50, 0, 90);
  inner.addColorStop(0, "#FDE68A");
  inner.addColorStop(1, "#F59E0B");
  ctx.beginPath();
  ctx.moveTo(4, -52);
  ctx.bezierCurveTo(44, -2, 38, 58, 0, 88);
  ctx.bezierCurveTo(-28, 54, -22, 2, 4, -52);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();
}

async function drawAvatar(ctx, avatarUrl, initial, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const img = await loadImage(avatarUrl);

  if (img) {
    // cover-fit the image into the circle
    const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = "#EEF2FF";
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = INDIGO;
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.22, radius * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.72, radius * 0.58, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

async function renderStreakCard(ctx, { name, username, avatarUrl, streak, level, longestStreak, interest, headline, location, tagline }) {
  drawBackground(ctx);
  drawWordmark(ctx, 118, 145);

  ctx.textAlign = "right";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.fillText(tagline || "Your circle shapes your future.", 945, 142);

  const heroGradient = ctx.createLinearGradient(110, 215, 970, 780);
  heroGradient.addColorStop(0, "#111827");
  heroGradient.addColorStop(0.55, INDIGO_DARK);
  heroGradient.addColorStop(1, VIOLET);
  roundRect(ctx, 105, 210, 870, 560, 54);
  ctx.fillStyle = heroGradient;
  ctx.fill();

  roundRect(ctx, 150, 250, 360, 58, 29);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.textAlign = "center";
  ctx.font = "900 21px Inter, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("CONSISTENCY IN MOTION", 330, 287);

  drawFlame(ctx, 270, 470, 0.72);

  ctx.textAlign = "left";
  ctx.font = "900 250px Inter, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(String(streak), 410, 565);
  ctx.font = "900 35px Inter, sans-serif";
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(streak === 1 ? "DAY STREAK" : "DAYS STREAK", 422, 625);
  ctx.font = "700 23px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.fillText("Showing up is the real superpower.", 422, 670);

  [[150, 355], [525, 400]].forEach(([x, width]) => {
    roundRect(ctx, x, 700, width, 108, 28);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
  });
  ctx.textAlign = "center";
  ctx.font = "900 35px Inter, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(String(longestStreak || streak), 328, 747);
  ctx.fillText(level || "Builder", 725, 747);
  ctx.font = "800 17px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.64)";
  ctx.fillText("PERSONAL BEST", 328, 782);
  ctx.fillText("BUILDER LEVEL", 725, 782);

  roundRect(ctx, 105, 825, 870, 390, 48);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  await drawAvatar(ctx, avatarUrl, "", 225, 945, 76);

  ctx.textAlign = "left";
  ctx.font = "900 42px Inter, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText((name || "IMCircle Builder").slice(0, 25), 330, 925);

  ctx.font = "800 25px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  const sub = longestStreak && longestStreak > streak
    ? `${level || "Builder"} • Best streak ${longestStreak} days`
    : `${level || "Builder"} on IMCircle`;
  ctx.fillText(username ? `@${username}` : "IMCircle member", 330, 965);
  ctx.font = "700 21px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.fillText((headline || sub || "Building in public").slice(0, 48), 330, 1002);

  ctx.beginPath();
  ctx.moveTo(155, 1055);
  ctx.lineTo(925, 1055);
  ctx.strokeStyle = "rgba(18,20,28,0.08)";
  ctx.stroke();

  [["FOCUS", interest || "Building in public", 165], ["LOCATION", location || "India", 555]].forEach(([label, value, x]) => {
    ctx.textAlign = "left";
    ctx.font = "900 17px Inter, sans-serif";
    ctx.fillStyle = "#98A2B3";
    ctx.fillText(label, x, 1100);
    ctx.font = "800 23px Inter, sans-serif";
    ctx.fillStyle = INK;
    ctx.fillText(String(value).slice(0, 27), x, 1140);
  });

  ctx.textAlign = "center";
  ctx.font = "800 21px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  ctx.fillText("#BuildInPublic  •  IMCircle", CARD_WIDTH / 2, 1268);
  ctx.font = "700 17px Inter, sans-serif";
  ctx.fillStyle = "#98A2B3";
  ctx.fillText("Share the work. Grow with your circle.", CARD_WIDTH / 2, 1305);
}

async function renderProfileCard(ctx, { name, username, headline, avatarUrl, interest, location, profileUrl, logoUrl = "/logo.png" }) {
  drawBackground(ctx);
  const brandLogo = await loadImage(logoUrl);
  if (brandLogo) {
    const logoScale = Math.min(310 / brandLogo.width, 66 / brandLogo.height);
    const logoWidth = brandLogo.width * logoScale;
    const logoHeight = brandLogo.height * logoScale;
    ctx.drawImage(brandLogo, 112, 98 + (66 - logoHeight) / 2, logoWidth, logoHeight);
  } else {
    drawWordmark(ctx, 118, 145);
  }

  ctx.textAlign = "left";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.fillText("Your circle shapes your future.", 112, 188);

  roundRect(ctx, 125, 205, 830, 1040, 58);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  await drawAvatar(ctx, avatarUrl, name?.charAt(0), CARD_WIDTH / 2, 350, 105);

  ctx.textAlign = "center";
  ctx.font = "900 52px Inter, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(name || "IMCircle Builder", CARD_WIDTH / 2, 505);

  ctx.font = "800 25px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  ctx.fillText(username ? `@${username}` : "IMCircle member", CARD_WIDTH / 2, 550);

  ctx.font = "800 25px Inter, sans-serif";
  ctx.fillStyle = "#475467";
  ctx.fillText(interest || "Building in public", CARD_WIDTH / 2, 600);

  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.fillText(location || "India", CARD_WIDTH / 2, 640);

  if (headline) {
    ctx.font = "800 22px Inter, sans-serif";
    ctx.fillStyle = INDIGO_DARK;
    wrapText(ctx, headline, CARD_WIDTH / 2, 682, 650, 32);
  }

  let qrImage = null;
  if (profileUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(profileUrl, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: INK, light: "#FFFFFF" },
      });
      qrImage = await loadImage(qrDataUrl);
    } catch {
      qrImage = null;
    }
  }

  roundRect(ctx, 350, 750, 380, 380, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();

  if (qrImage) {
    ctx.drawImage(qrImage, 390, 790, 300, 300);

    // A high-contrast brand island keeps the QR scannable while showing the
    // complete IMCircle wordmark. Error correction is H.
    roundRect(ctx, 474, 908, 132, 64, 17);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    if (brandLogo) {
      const qrLogoScale = Math.min(108 / brandLogo.width, 42 / brandLogo.height);
      const qrLogoWidth = brandLogo.width * qrLogoScale;
      const qrLogoHeight = brandLogo.height * qrLogoScale;
      ctx.drawImage(
        brandLogo,
        CARD_WIDTH / 2 - qrLogoWidth / 2,
        940 - qrLogoHeight / 2,
        qrLogoWidth,
        qrLogoHeight
      );
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 21px Inter, sans-serif";
      ctx.fillStyle = INDIGO;
      ctx.fillText("IMCircle", CARD_WIDTH / 2, 940);
    }
  } else {
    drawLogoMark(ctx, CARD_WIDTH / 2, 940, 85);
  }

  ctx.textAlign = "center";
  ctx.font = "900 25px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  ctx.fillText("SCAN TO VIEW MY PROFILE", CARD_WIDTH / 2, 1182);

  ctx.font = "800 21px Inter, sans-serif";
  ctx.fillStyle = "#98A2B3";
  ctx.fillText("Connect with me on IMCircle", CARD_WIDTH / 2, CARD_HEIGHT - 58);
}

function drawStatPill(ctx, cx, cy, value, label) {
  roundRect(ctx, cx - 165, cy - 64, 330, 128, 28);
  ctx.fillStyle = "#EEF2FF";
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "900 50px Inter, sans-serif";
  ctx.fillStyle = MARIGOLD;
  ctx.fillText(value, cx, cy - 2);

  ctx.font = "900 20px Inter, sans-serif";
  ctx.fillStyle = "#4338CA";
  ctx.fillText(label.toUpperCase(), cx, cy + 38);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let lineY = y;
  let linesDrawn = 0;

  for (let i = 0; i < words.length && linesDrawn < 2; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, cx, lineY);
      line = words[i];
      lineY += lineHeight;
      linesDrawn += 1;
    } else {
      line = testLine;
    }
  }

  if (linesDrawn < 2) ctx.fillText(line, cx, lineY);
}

/**
 * Generate a branded share card as a PNG Blob.
 *
 * @param {"streak"|"profile"} kind
 * @param {object} data - fields used depend on `kind`, see renderStreakCard/renderProfileCard
 * @returns {Promise<Blob|null>}
 */
export async function generateShareCard(kind, data) {
  if (kind === "streak" && Number(data?.streak || 0) < 1) return null;
  await ensureFontsReady();

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  if (kind === "profile") {
    await renderProfileCard(ctx, data);
  } else {
    await renderStreakCard(ctx, data);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

/**
 * Share (native share sheet) or fall back to downloading a blob as a PNG.
 * Returns "shared" | "downloaded" | "failed".
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveNativeBlob(blob, filename, directoryName = "Documents") {
  const [{ Capacitor }, { Filesystem, Directory }] = await Promise.all([
    import("@capacitor/core"),
    import("@capacitor/filesystem"),
  ]);

  if (!Capacitor.isNativePlatform()) return null;

  const directory = directoryName === "Cache" ? Directory.Cache : Directory.Documents;
  await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory,
    recursive: true,
  });
  const result = await Filesystem.getUri({ path: filename, directory });
  return result.uri;
}

/** Share the generated file. Native apps use a real device file URI. */
export async function shareBlob(blob, filename, shareText, shareUrl = "") {
  if (!blob) return "failed";

  try {
    const nativeUri = await saveNativeBlob(blob, filename, "Cache");
    if (nativeUri) {
      const { Share } = await import("@capacitor/share");
      const { value } = await Share.canShare();
      if (value) {
        await Share.share({
          title: "IMCircle",
          text: shareText || "Connect with me on IMCircle",
          files: [nativeUri],
          dialogTitle: "Share profile",
        });
        return "shared";
      }
    }

    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "IMCircle",
        text: shareText || "Connect with me on IMCircle",
      });
      return "shared";
    }

    if (navigator.share) {
      await navigator.share({
        title: "IMCircle",
        text: shareText || "Connect with me on IMCircle",
        ...(shareUrl ? { url: shareUrl } : {}),
      });
      return "shared";
    }
  } catch (error) {
    if (error?.name === "AbortError") return "cancelled";
  }

  if (shareUrl && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return "copied";
    } catch {
      // Continue to the explicit failure state.
    }
  }

  return "failed";
}

/** Download/save a blob without accidentally opening the share sheet. */
export async function downloadBlob(blob, filename) {
  if (!blob) return "failed";

  try {
    const nativeUri = await saveNativeBlob(blob, filename, "Documents");
    if (nativeUri) return "downloaded";
  } catch {
    // Web fallback also works in several WebView implementations.
  }

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

function escapeVCard(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function createProfileVCard({ name, username, headline, interest, location, profileUrl, email, phone }) {
  const note = [headline, interest ? `Interest: ${interest}` : "", username ? `IMCircle: @${username}` : ""]
    .filter(Boolean)
    .join(" | ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(name || "IMCircle Member")}`,
    `N:${escapeVCard(name || "IMCircle Member")};;;;`,
    "ORG:IMCircle",
    ...(email ? [`EMAIL;TYPE=INTERNET:${escapeVCard(email)}`] : []),
    ...(phone ? [`TEL;TYPE=CELL:${escapeVCard(phone)}`] : []),
    ...(location ? [`ADR;TYPE=HOME:;;${escapeVCard(location)};;;;`] : []),
    ...(profileUrl ? [`URL:${profileUrl}`] : []),
    ...(note ? [`NOTE:${escapeVCard(note)}`] : []),
    "END:VCARD",
  ];
  return new Blob([`${lines.join("\r\n")}\r\n`], { type: "text/vcard;charset=utf-8" });
}

// Backwards-compatible behavior for any older caller outside the modal.
export async function shareOrDownloadBlob(blob, filename, shareText) {
  const result = await shareBlob(blob, filename, shareText);
  if (result === "failed") return downloadBlob(blob, filename);
  return result;
}
