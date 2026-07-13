import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 7000;

function isPrivateIp(address) {
  if (!net.isIP(address)) return true;

  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function normalizePublicUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Enter a website domain first.");

  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public HTTP or HTTPS websites can be verified.");
  }
  if (!url.hostname.includes(".") || url.hostname === "localhost") {
    throw new Error("Enter a valid public website domain.");
  }
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}

async function assertPublicHostname(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => isPrivateIp(address))) {
    throw new Error("This domain does not resolve to a public website.");
  }
}

async function requestOnce(url, method = "HEAD") {
  await assertPublicHostname(url.hostname);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method,
        timeout: TIMEOUT_MS,
        headers: {
          "user-agent": "IMCircle-Website-Verifier/1.0",
          accept: "text/html,application/xhtml+xml",
        },
        lookup: async (hostname, options, callback) => {
          try {
            const records = await dns.lookup(hostname, { all: true, verbatim: true });
            const safeRecords = records.filter(({ address }) => !isPrivateIp(address));
            if (!safeRecords.length) return callback(new Error("Private network addresses are not allowed."));

            if (options && typeof options === "object" && options.all) {
              callback(null, safeRecords);
              return;
            }

            callback(null, safeRecords[0].address, safeRecords[0].family);
          } catch (error) {
            callback(error);
          }
        },
      },
      (response) => {
        response.resume();
        resolve({ status: response.statusCode || 0, location: response.headers.location || "" });
      }
    );

    request.on("timeout", () => request.destroy(new Error("The website took too long to respond.")));
    request.on("error", reject);
    request.end();
  });
}

async function followRequest(initialUrl, method, redirects = 0) {
  const result = await requestOnce(initialUrl, method);
  if (result.status >= 300 && result.status < 400 && result.location) {
    if (redirects >= MAX_REDIRECTS) throw new Error("The website redirects too many times.");
    const nextUrl = normalizePublicUrl(new URL(result.location, initialUrl).toString());
    return followRequest(nextUrl, method, redirects + 1);
  }
  return { ...result, url: initialUrl };
}

export async function verifyPublicWebsite(value) {
  const raw = String(value || "").trim();
  const candidates = /^https?:\/\//i.test(raw)
    ? [raw]
    : [`https://${raw}`, `http://${raw}`];
  let lastError;

  for (const candidate of candidates) {
    try {
      const url = normalizePublicUrl(candidate);
      let result = await followRequest(url, "HEAD");

      if ([400, 404, 405, 501].includes(result.status)) {
        result = await followRequest(url, "GET");
      }

      if (!result.status || result.status >= 500) {
        throw new Error("We could not reach a working website at this domain.");
      }

      return {
        reachable: true,
        website: result.url.toString(),
        domain: result.url.hostname.replace(/^www\./i, "").toLowerCase(),
        status: result.status,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("We could not reach a working website at this domain.");
}
