// Deterministic, keyword-based classification — no ML/external API. Good
// enough to route items to the right role/category buckets for ranking
// (news.controller.js) without a training pipeline this app has no data
// for yet. Every list here is intentionally small and easy to extend by
// hand as real ingested content shows gaps.
const ROLE_KEYWORDS = {
  Founder: [
    "startup", "founder", "startup funding", "funding round", "seed round",
    "series a", "series b", "venture capital", "vc firm", "accelerator",
    "incubator", "pitch deck", "co-founder", "acquihire", "acquisition",
  ],
  Student: [
    "exam", "admit card", "result", "results", "scholarship", "admission",
    "syllabus", "board exam", "entrance test", "college", "university",
    "semester", "internship", "campus placement",
  ],
  Freelancer: [
    "freelance", "freelancer", "gig economy", "client", "upwork", "fiverr",
    "contract work", "self-employed",
  ],
  Creator: [
    "creator economy", "youtube", "instagram", "content creator",
    "monetisation", "monetization", "influencer", "brand deal",
    "creator fund",
  ],
  Professional: [
    "hiring", "layoffs", "job market", "certification", "upskilling",
    "workplace", "remote work", "promotion", "career", "recruitment",
    "vacancy", "vacancies", "govt job", "government job", "sarkari naukri",
  ],
};

const CATEGORY_KEYWORDS = {
  // Every keyword here needs to be unambiguous enough that it basically
  // never shows up outside startup/funding coverage. This list has already
  // been walked back twice for exactly this reason:
  //   - generic verbs like "backs"/"backed by" ("Opposition backs the
  //     protest") bled into political coverage.
  //   - even worse, bare "raised"/"raises"/"funding" — the most obvious
  //     "funding" keywords — matched ANY sentence using them non-financially
  //     ("Dipke raises alarm," "raises questions," "government funding for
  //     schools"), which is extremely common in general news and is exactly
  //     why unrelated protest/politics stories kept surfacing under Startup
  //     Funding. A news item keeps every category it matches, so one
  //     over-broad keyword bleeds across categories rather than just
  //     mis-filing something. Every entry below is a full phrase for this
  //     reason — no bare single common verb/noun.
  Startup: [
    "seed round", "series a", "series b", "series c", "series d",
    "pre-seed", "pre-series round", "bridge round", "growth round",
    "startup funding", "startup", "startups", "unicorn", "angel investor",
    "angel investors", "venture capital", "vc fund", "term sheet",
    "cap table", "bootstrapped", "crore funding", "million funding",
    "billion funding", "investment round", "co-led by", "secures funding",
    "bags funding", "closes funding round", "raises funds",
    "raises capital", "equity funding", "debt funding", "funding round",
  ],
  AI: ["artificial intelligence", "ai", "machine learning", "llm", "chatgpt", "generative ai"],
  Technology: ["technology", "software", "app launch", "product launch", "tech"],
  "Government Schemes": [
    "government scheme", "yojana", "ministry", "pib", "ministry of",
    "cabinet approves", "central government", "state government",
    "lok sabha", "rajya sabha", "parliament", "cabinet", "policy",
  ],
  Education: [
    "exam", "admission", "scholarship", "syllabus", "board exam",
    "university", "college", "neet", "jee", "upsc", "cbse", "icse",
    "entrance test", "admit card",
  ],
  Career: [
    "hiring", "layoffs", "job market", "internship", "campus placement",
    "career", "recruitment", "vacancy", "vacancies", "govt job",
    "government job", "sarkari naukri", "sarkari result",
  ],
  Events: ["hackathon", "summit", "conference", "meetup", "workshop"],
  Finance: ["ipo", "stock market", "rbi", "interest rate", "tax", "gst", "budget"],
};

// Keys here MUST match User.model's `field` enum exactly (Tech, Fitness,
// Beauty, Design, Creators, Hospitality, Business, Education, Healthcare,
// Other) — this is what buildMatchFilter() in news.controller.js compares
// a viewer's `user.field` against. These two lists silently used different
// vocabularies before (e.g. "Technology"/"Finance" here vs "Tech"/"Business"
// on the User model), so a user's field never actually matched anything —
// harmless-looking but effectively disabled that whole signal.
const INDUSTRY_KEYWORDS = {
  Tech: ["software", "saas", "tech startup", "app launch", "technology", "artificial intelligence"],
  Business: ["fintech", "bank", "rbi", "stock market", "ipo", "business", "startup", "funding", "finance"],
  Education: ["edtech", "school", "college", "university"],
  Healthcare: ["healthcare", "hospital", "pharma", "medical"],
  Fitness: ["fitness", "gym", "wellness", "workout"],
  Design: ["design", "ui/ux", "graphic design"],
  Creators: ["youtube", "instagram", "content creator", "influencer"],
  Hospitality: ["hotel", "travel", "tourism", "restaurant"],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Plain `text.includes(keyword)` false-positives badly on short keywords —
// e.g. "app" (meant as shorthand for "app launch") matching inside
// "applications", or "ai" matching inside "said"/"remains". Word-boundary
// regex matching avoids that; \b works correctly even for multi-word
// keywords like "series a" (boundary at the start of "series", boundary at
// the end of "a").
function textIncludesAny(text, keywords) {
  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword.trim())}\\b`, "i");
    return pattern.test(text);
  });
}

/**
 * @param {{ title: string, summary?: string }} item
 * @returns {{ roles: string[], categories: string[], industries: string[], keywords: string[] }}
 */
export function classifyNewsItem({ title = "", summary = "" }) {
  const text = ` ${title.toLowerCase()} ${summary.toLowerCase()} `;

  const roles = Object.entries(ROLE_KEYWORDS)
    .filter(([, keywords]) => textIncludesAny(text, keywords))
    .map(([role]) => role);

  const categories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => textIncludesAny(text, keywords))
    .map(([category]) => category);

  const industries = Object.entries(INDUSTRY_KEYWORDS)
    .filter(([, keywords]) => textIncludesAny(text, keywords))
    .map(([industry]) => industry);

  const matchedKeywords = [...ROLE_KEYWORDS_FLAT(), ...CATEGORY_KEYWORDS_FLAT()].filter((keyword) =>
    textIncludesAny(text, [keyword])
  );

  return {
    roles,
    categories: categories.length ? categories : ["General"],
    industries,
    keywords: [...new Set(matchedKeywords)].slice(0, 15),
  };
}

function ROLE_KEYWORDS_FLAT() {
  return Object.values(ROLE_KEYWORDS).flat();
}

function CATEGORY_KEYWORDS_FLAT() {
  return Object.values(CATEGORY_KEYWORDS).flat();
}

// Time-sensitivity / urgency signal — used for importanceScore, separate
// from the role/category tagging above.
const URGENT_KEYWORDS = [
  "deadline", "last date", "extended", "closes soon", "results out",
  "applications open", "registration open", "notification released",
];

export function isUrgent({ title = "", summary = "" }) {
  const text = ` ${title.toLowerCase()} ${summary.toLowerCase()} `;
  return textIncludesAny(text, URGENT_KEYWORDS);
}
