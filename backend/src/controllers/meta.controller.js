import { readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import CompanyDirectory from "../models/meta/CompanyDirectory.js";
import CollegeDirectory from "../models/meta/CollegeDirectory.js";
import LocationDirectory from "../models/meta/LocationDirectory.js";
import SkillDirectory from "../models/meta/SkillDirectory.js";
import DegreeDirectory from "../models/meta/DegreeDirectory.js";
import IndustryDirectory from "../models/meta/IndustryDirectory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Everything below is computed ONCE at process startup (module load), not
// per-request — a version number, commit hash, and Android manifest value
// don't change while the server is running, so there's no reason to hit the
// filesystem or shell out to git on every call to GET /api/meta/version.
//
// This assumes the standard monorepo layout (backend/ and frontend/ as
// sibling folders in the same checkout) that this repo uses — if your
// deploy splits them onto different servers/paths, the frontend/Android
// reads below will fail closed to "unknown" rather than crash the server,
// see the try/catch around each one.

function readJsonVersion(relativePath) {
  try {
    const raw = readFileSync(path.join(__dirname, relativePath), "utf-8");
    return JSON.parse(raw)?.version || "unknown";
  } catch {
    return "unknown";
  }
}

function readAndroidVersion() {
  try {
    const gradlePath = path.join(
      __dirname,
      "../../../frontend/android/app/build.gradle"
    );
    const gradle = readFileSync(gradlePath, "utf-8");

    const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);
    const versionNameMatch = gradle.match(/versionName\s+["']([^"']+)["']/);

    return {
      androidVersionCode: versionCodeMatch ? Number(versionCodeMatch[1]) : "unknown",
      androidVersionName: versionNameMatch ? versionNameMatch[1] : "unknown",
    };
  } catch {
    return { androidVersionCode: "unknown", androidVersionName: "unknown" };
  }
}

function readCommitHash() {
  // A deploy script can set this explicitly (e.g. `GIT_COMMIT_HASH=$(git
  // rev-parse --short HEAD) pm2 restart ...`) — preferred, since it's exact
  // regardless of the server's working directory. Falls back to asking git
  // directly (works fine on a typical VPS deploy where the server runs from
  // inside the git checkout), then to "unknown" if neither is available
  // (e.g. a deploy that ships a tarball with no .git directory).
  if (process.env.GIT_COMMIT_HASH) return process.env.GIT_COMMIT_HASH;

  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: path.join(__dirname, "../.."),
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const BACKEND_VERSION = readJsonVersion("../../package.json");
const FRONTEND_VERSION = readJsonVersion("../../../frontend/package.json");
const COMMIT_HASH = readCommitHash();
const { androidVersionCode: ANDROID_VERSION_CODE, androidVersionName: ANDROID_VERSION_NAME } =
  readAndroidVersion();

// A deploy script can set BUILD_DATE explicitly (e.g. right before `pm2
// restart`) for an exact build timestamp. Without it, this falls back to
// "when this backend process actually started" — since every real deploy
// restarts the process (PM2/systemd/etc.), that's still a meaningful signal
// for "is this the build I just shipped, or a stale one still running from
// before."
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getQuery = (req) => {
  return String(req.query.q || "").trim();
};

const searchDirectory = async ({
  req,
  res,
  Model,
  responseKey,
  selectFields,
}) => {
  try {
    const q = getQuery(req);

    if (q.length < 2) {
      return res.status(200).json({
        success: true,
        [responseKey]: [],
      });
    }

    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const regex = new RegExp(escapeRegex(q), "i");

    const items = await Model.find({
      isActive: { $ne: false },
      $or: [{ name: regex }, { searchText: regex }],
    })
      .select(selectFields)
      .sort({ priority: -1, name: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      [responseKey]: items,
    });
  } catch (error) {
    console.error(`${responseKey} search error:`, error);

    return res.status(500).json({
      success: false,
      message: `${responseKey} search failed`,
    });
  }
};

export const searchCompanies = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: CompanyDirectory,
    responseKey: "companies",
    selectFields: "name industry type website logoUrl",
  });
};

export const searchColleges = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: CollegeDirectory,
    responseKey: "colleges",
    selectFields: "name city state type website",
  });
};

export const searchLocations = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: LocationDirectory,
    responseKey: "locations",
    selectFields: "name district state country type",
  });
};

export const searchSkills = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: SkillDirectory,
    responseKey: "skills",
    selectFields: "name category",
  });
};

export const searchDegrees = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: DegreeDirectory,
    responseKey: "degrees",
    selectFields: "name type",
  });
};

export const searchIndustries = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: IndustryDirectory,
    responseKey: "industries",
    selectFields: "name category",
  });
};

export const createCompany = async (req, res) => {
  try {
    const { name, domain, email, logoUrl } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const cleanName = name.trim();

    let company = await CompanyDirectory.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
    });

    if (company) {
      return res.status(200).json({
        success: true,
        message: "Company already exists",
        company,
      });
    }

    company = await CompanyDirectory.create({
      name: cleanName,
      website: domain?.trim() || "",
      email: email?.trim() || "",
      logoUrl: logoUrl || "",
      type: "Company",
      priority: 1,
      isActive: true,
      searchText: `${cleanName} ${domain || ""} ${email || ""}`.toLowerCase(),
    });

    return res.status(201).json({
      success: true,
      message: "Company added successfully",
      company,
    });
  } catch (error) {
    console.error("Create company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add company",
    });
  }
};

// GET /api/meta/version — lets the frontend (and a human checking a live
// deploy) confirm exactly what's actually running: which frontend bundle
// version, which backend version, when it was built, which git commit, and
// what Android release this backend expects. See useVersionCheck.js on the
// frontend for how this gets compared against the currently-loaded bundle
// to show the "New version available" banner.
export const getVersionInfo = async (req, res) => {
  res.status(200).json({
    frontendVersion: FRONTEND_VERSION,
    backendVersion: BACKEND_VERSION,
    buildDate: BUILD_DATE,
    commitHash: COMMIT_HASH,
    androidVersionName: ANDROID_VERSION_NAME,
    androidVersionCode: ANDROID_VERSION_CODE,
  });
};