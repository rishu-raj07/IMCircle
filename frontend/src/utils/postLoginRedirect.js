// Small, additive helper — NOT wired into the shared ProtectedRoute (that
// would change redirect behavior for every private route app-wide, more
// than was asked for). Used specifically by the "Write an article" entry
// points: if someone taps it while logged out, we remember /articles/write
// here, send them to login, and Login.jsx/Verify.jsx (both already the
// only two places that complete a login) check this and honor it instead
// of their default "/home" — falling back to "/home" exactly as before
// when nothing was stored, so no existing login flow changes behavior.
const KEY = "imcircle_post_login_redirect";

export function setPostLoginRedirect(path) {
  try {
    window.localStorage.setItem(KEY, path);
  } catch {
    // localStorage unavailable — worst case, login just lands on /home.
  }
}

export function consumePostLoginRedirect() {
  try {
    const value = window.localStorage.getItem(KEY);
    if (value) window.localStorage.removeItem(KEY);
    return value || "";
  } catch {
    return "";
  }
}
