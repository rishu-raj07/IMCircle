// Handles both:
//  - Custom URL scheme deep links from the native app: imcircle://user/:username,
//    imcircle://post/:id, imcircle://journey/:id, imcircle://learning/:id,
//    imcircle://opportunity/:id
//  - HTTPS App Links / Universal Links (once assetlinks.json / apple-app-site-association
//    are live — see launch/docs/launch-checklist.md): https://imcircle.com/u/:username,
//    /post/:id, /journey/:id, /learning/:id, /opportunity/:id
//
// IMPORTANT: /post/:id and /opportunity/:id do not currently have a
// dedicated page/route in this app (posts are only viewable inline in feeds;
// Opportunities are feature-flagged off — see frontend/src/routes/AppRoutes.jsx,
// OPPORTUNITIES_PROJECTS_ENABLED). Those two link types fall back to Home
// until those routes exist.
//
// This only runs inside the native Capacitor shell — @capacitor/app's
// addListener silently no-ops in a plain browser tab, so it's safe to call
// unconditionally from main.jsx on every platform.

function routeForDeepLink(rawUrl) {
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // imcircle://user/rishu -> host="user", pathname="/rishu"
  // https://imcircle.com/u/rishu -> host="imcircle.com", pathname="/u/rishu"
  const isCustomScheme = url.protocol === "imcircle:";
  const segments = (isCustomScheme ? `${url.hostname}${url.pathname}` : url.pathname)
    .split("/")
    .filter(Boolean);

  const [kind, id] = segments;

  switch (kind) {
    case "user":
    case "u":
      return id ? `/profile/${id}` : "/home";
    case "journey":
      return id ? `/journey/${id}` : "/discover";
    case "learning":
      return id ? `/learning/${id}` : "/learning";
    case "post":
    case "opportunity":
      // No dedicated page for these yet — safe fallback instead of a 404.
      return "/home";
    default:
      return "/home";
  }
}

export async function initDeepLinks(navigate) {
  let App;
  try {
    ({ App } = await import("@capacitor/app"));
  } catch {
    return; // web build without Capacitor installed at runtime — no-op
  }

  App.addListener("appUrlOpen", ({ url }) => {
    const path = routeForDeepLink(url);
    if (path) navigate(path);
  });
}

export { routeForDeepLink };
