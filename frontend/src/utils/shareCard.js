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
    ctx.fillStyle = INDIGO;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = MARIGOLD;
    ctx.font = `700 ${Math.round(radius)}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((initial || "I").toUpperCase(), cx, cy + radius * 0.08);
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

async function renderStreakCard(ctx, { name, avatarUrl, streak, level, longestStreak, interest }) {
  drawBackground(ctx);
  drawWordmark(ctx, 118, 145);

  ctx.textAlign = "center";

  roundRect(ctx, 250, 225, 580, 78, 39);
  ctx.fillStyle = "rgba(67,56,202,0.10)";
  ctx.fill();
  ctx.font = "900 26px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  ctx.fillText("BUILDER STREAK", CARD_WIDTH / 2, 275);

  drawFlame(ctx, CARD_WIDTH / 2, 465, 1.2);

  const statGradient = ctx.createLinearGradient(300, 600, 780, 860);
  statGradient.addColorStop(0, INDIGO);
  statGradient.addColorStop(1, VIOLET);
  ctx.font = "900 300px Inter, sans-serif";
  ctx.fillStyle = statGradient;
  ctx.fillText(String(streak), CARD_WIDTH / 2, 760);

  ctx.font = "900 44px Inter, sans-serif";
  ctx.fillStyle = MARIGOLD;
  ctx.fillText(streak === 1 ? "DAY STREAK" : "DAYS STREAK", CARD_WIDTH / 2, 830);

  ctx.font = "800 30px Inter, sans-serif";
  ctx.fillStyle = "#475467";
  ctx.fillText(interest || level || "Building in public", CARD_WIDTH / 2, 890);

  roundRect(ctx, 150, 990, 780, 210, 46);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const stripY = 1095;
  await drawAvatar(ctx, avatarUrl, name?.charAt(0), 265, stripY, 64);

  ctx.textAlign = "left";
  ctx.font = "900 42px Inter, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(name || "IMCircle Builder", 360, stripY - 8);

  ctx.font = "800 25px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  const sub = longestStreak && longestStreak > streak
    ? `${level || "Builder"} • Best streak ${longestStreak} days`
    : `${level || "Builder"} on IMCircle`;
  ctx.fillText(sub, 360, stripY + 34);

  ctx.textAlign = "center";
  ctx.font = "800 23px Inter, sans-serif";
  ctx.fillStyle = "#98A2B3";
  ctx.fillText("Build in public on IMCircle", CARD_WIDTH / 2, CARD_HEIGHT - 92);
}

async function renderProfileCard(ctx, { name, headline, avatarUrl, streak, circleCount, interest }) {
  drawBackground(ctx);
  drawWordmark(ctx, 118, 145);

  roundRect(ctx, 165, 235, 750, 820, 58);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = "rgba(67,56,202,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  await drawAvatar(ctx, avatarUrl, name?.charAt(0), CARD_WIDTH / 2, 430, 132);

  ctx.textAlign = "center";
  ctx.font = "900 58px Inter, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(name || "IMCircle Builder", CARD_WIDTH / 2, 620);

  ctx.font = "800 28px Inter, sans-serif";
  ctx.fillStyle = INDIGO;
  ctx.fillText(interest || "IMCircle builder", CARD_WIDTH / 2, 668);

  ctx.font = "700 30px Inter, sans-serif";
  ctx.fillStyle = "#667085";
  wrapText(ctx, headline || "Building something new on IMCircle", CARD_WIDTH / 2, 725, 640, 42);

  const pillY = 910;
  drawStatPill(ctx, CARD_WIDTH / 2 - 210, pillY, String(streak || 0), "day streak");
  drawStatPill(ctx, CARD_WIDTH / 2 + 210, pillY, String(circleCount || 0), "in circle");

  ctx.font = "800 23px Inter, sans-serif";
  ctx.fillStyle = "#98A2B3";
  ctx.fillText("Connect with me on IMCircle", CARD_WIDTH / 2, CARD_HEIGHT - 92);
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
export async function shareOrDownloadBlob(blob, filename, shareText) {
  if (!blob) return "failed";

  try {
    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "IMCircle",
        text: shareText || "Check out my IMCircle streak!",
      });
      return "shared";
    }
  } catch (error) {
    if (error?.name === "AbortError") return "cancelled";
    // fall through to download
  }

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
