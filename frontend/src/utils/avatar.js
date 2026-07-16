// Single source of truth for resolving a user/actor's avatar image across the
// whole app (Home feed, Profile, Network, Notifications, Comments, Messages,
// Suggestions, Journey/Learning/Post cards, etc). Every screen used to have
// its own slightly-different `getImageUrl`/fallback logic — this collapses
// them into one function + one <Avatar/> component so avatar photo stays
// genuinely optional (per profile setup) without ever rendering a broken
// image anywhere.
export function getAvatarUrl(source) {
  if (!source) return "";

  const value =
    source?.avatar ||
    source?.profileImage ||
    source?.profileImageUrl ||
    source?.profilePicture ||
    source?.picture ||
    source?.photoURL ||
    source?.photo ||
    source?.image?.secure_url ||
    source?.image?.url ||
    source?.image ||
    source?.avatar?.secure_url ||
    source?.avatar?.url ||
    "";

  if (!value) return "";
  if (typeof value === "string") return value;

  return value?.secure_url || value?.url || "";
}

export function getInitial(name = "") {
  const trimmed = String(name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "";
}

// Gender-appropriate placeholder — used wherever a user has no uploaded
// photo, in place of the old generic UserRound icon / initial-letter
// circle. "Other", "Prefer not to say", and anything missing/unrecognized
// all share the same neutral icon; only "Male"/"Female" get their own.
// These three files live in /public (frontend/public/user-icon-*.png), so
// they're referenced as root-relative paths, same as favicon/logo.
export function getGenderAvatarIcon(source) {
  const gender = String(
    (typeof source === "string" ? source : source?.gender) || ""
  )
    .trim()
    .toLowerCase();

  if (gender === "male") return "/user-icon-men.png";
  if (gender === "female") return "/user-icon-women.png";
  return "/user-icon-prefernottosay.png";
}

export function getDisplayName(source) {
  return (
    source?.fullName ||
    source?.name ||
    source?.username ||
    ""
  );
}
