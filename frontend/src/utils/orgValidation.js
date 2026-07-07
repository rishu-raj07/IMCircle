const COMMON_TLDS = new Set([
  "com",
  "in",
  "org",
  "net",
  "edu",
  "gov",
  "io",
  "co",
  "ai",
  "app",
  "dev",
  "tech",
  "biz",
  "info",
  "me",
  "us",
  "uk",
  "ca",
  "au",
]);

const DOMAIN_RE =
  /^(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

const clean = (value) => String(value || "").trim();

const hostFromWebsite = (value) => {
  const text = clean(value);
  if (!text) return "";

  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  const parsed = new URL(withProtocol);
  return parsed.hostname.replace(/^www\./i, "").toLowerCase();
};

export function isValidDomain(value) {
  const domain = clean(value)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .toLowerCase();

  if (!domain || domain.includes("@") || domain.includes("/") || domain.includes(" ")) {
    return false;
  }

  if (!DOMAIN_RE.test(domain)) return false;

  const tld = domain.split(".").pop();
  return COMMON_TLDS.has(tld);
}

export function validateOrgName(value, label) {
  const text = clean(value);

  if (!text) return `${label} is required.`;
  if (text.length < 2) return `${label} must be at least 2 characters.`;
  if (!/[a-z]/i.test(text)) return `${label} must include letters.`;
  if (/^@|@|https?:\/\//i.test(text)) {
    return `${label} should be a real name, not a handle, email or website.`;
  }

  return "";
}

export function validateOptionalWebsite(value) {
  const text = clean(value);
  if (!text) return "";

  if (text.startsWith("@") || /\s/.test(text)) {
    return "Enter a valid website like https://example.com.";
  }

  try {
    const host = hostFromWebsite(text);
    if (!isValidDomain(host)) {
      return "Enter a valid website like https://example.com.";
    }
  } catch {
    return "Enter a valid website like https://example.com.";
  }

  return "";
}

export function validateOptionalDomain(value) {
  const text = clean(value);
  if (!text) return "";

  if (!isValidDomain(text)) {
    return "Enter a valid domain like example.com.";
  }

  return "";
}

export function validateOptionalEmail(value) {
  const text = clean(value);
  if (!text) return "";

  const parts = text.split("@");
  if (parts.length !== 2 || !parts[0] || !isValidDomain(parts[1])) {
    return "Enter a valid email like hello@example.com.";
  }

  return "";
}

export function validateOptionalPlace(value, label) {
  const text = clean(value);
  if (!text) return "";

  if (/[@:/\\]|\.[a-z]{2,}$/i.test(text)) {
    return `${label} should be a place name.`;
  }

  if (!/^[a-zA-Z .'-]{2,60}$/.test(text)) {
    return `${label} can only use letters, spaces and basic punctuation.`;
  }

  return "";
}
