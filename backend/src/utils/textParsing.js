// Shared @mention / #hashtag extraction — used by contentParsing.service.js
// so every content type (post, learning, journey milestone, circle post)
// parses text identically instead of each controller reimplementing regex.
const MENTION_REGEX = /(?:^|[^\w@])@([a-z0-9_]{3,30})/gi;
const HASHTAG_REGEX = /(?:^|[^\w#])#([a-z0-9_]{2,50})/gi;

export function extractMentions(text) {
  if (!text) return [];
  const matches = new Set();
  let match;
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    matches.add(match[1].toLowerCase());
  }
  return Array.from(matches);
}

export function extractHashtags(text) {
  if (!text) return [];
  const matches = new Set();
  let match;
  HASHTAG_REGEX.lastIndex = 0;
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    matches.add(match[1].toLowerCase());
  }
  return Array.from(matches);
}
