// Detects a "Lesson" / "Key takeaway" / "Today's learning" opener inside a
// learning's body text and splits it out so it can be rendered as a
// dedicated highlighted callout (💡 Lesson) instead of buried in a wall of
// text. Pure text logic, no React — kept separate so it's trivially unit
// testable and reusable anywhere a learning body is rendered.

const LESSON_TRIGGER_RE = /^\s*(?:\p{Emoji_Presentation}\s*)?(lesson|key takeaway|today'?s learning)\s*[:\-–]?\s*/iu;

const LABELS = {
  lesson: "Lesson",
  "key takeaway": "Key Takeaway",
  "today's learning": "Today's Learning",
  "todays learning": "Today's Learning",
};

function normalizeLabel(match) {
  const key = match.toLowerCase().replace(/’/g, "'");
  return LABELS[key] || LABELS[key.replace(/'/g, "")] || "Lesson";
}

/**
 * @param {string} rawText
 * @returns {{ highlight: { label: string, text: string } | null, body: string }}
 */
export function extractLessonHighlight(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return { highlight: null, body: text };

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] || "";
  const match = firstLine.match(LESSON_TRIGGER_RE);

  if (!match) return { highlight: null, body: text };

  const label = normalizeLabel(match[1]);
  let highlightText = firstLine.slice(match[0].length).trim();
  let bodyLines = lines.slice(1);

  if (!highlightText) {
    // The trigger word was alone on its own line (e.g. "Today's Learning")
    // — pull the very next non-empty line in as the highlighted sentence
    // instead of dumping every remaining line into the callout.
    const idx = bodyLines.findIndex((line) => line.trim());
    if (idx !== -1) {
      highlightText = bodyLines[idx].trim();
      bodyLines = [...bodyLines.slice(0, idx), ...bodyLines.slice(idx + 1)];
    }
  }

  if (!highlightText) return { highlight: null, body: text };

  return {
    highlight: { label, text: highlightText },
    body: bodyLines.join("\n").trim(),
  };
}

export default extractLessonHighlight;
