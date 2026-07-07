import { useEffect } from "react";

const SITE_NAME = "IMCircle";
const SITE_URL = "https://imcircle.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr, key, value) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Client-side document <head> updater for SPA routes (Home, UserProfile,
 * JourneyProfile, LearningView, JobDetails, About, etc).
 *
 * IMPORTANT LIMITATION: this only updates the DOM after React has rendered
 * and JS has executed. It correctly updates the browser tab title and lets
 * a user's own browser-based "share" action pick up the right meta tags,
 * but it does NOT help search engine crawlers or social unfurl bots
 * (Facebook/WhatsApp/Slack/Twitter link previews, Googlebot's first pass)
 * that read raw HTML without executing JavaScript — they will still see
 * only the static tags from index.html for every route.
 *
 * Fixing that properly requires one of:
 *   1. Server-side rendering (SSR) or prerendering for public routes
 *      (/u/:username, /post/:id, /journey/:id, /learning/:id, /opportunity/:id), or
 *   2. A lightweight backend "unfurl" endpoint that returns static HTML
 *      with correct OG/Twitter tags for known bot user-agents hitting
 *      those specific URL patterns, while real users still get the SPA.
 * Neither is implemented here — tracked in launch/docs/launch-checklist.md.
 */
export function useSEO({ title, description, path, image, type = "website" } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — The Social Network for People Who Grow`;
    const url = path ? `${SITE_URL}${path}` : SITE_URL;
    const desc =
      description ||
      "IMCircle is the growth-focused social network for students, creators, founders, professionals and freelancers.";
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setCanonical(url);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:type", type);

    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
  }, [title, description, path, image, type]);
}

export default useSEO;
