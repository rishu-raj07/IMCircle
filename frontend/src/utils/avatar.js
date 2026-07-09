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

export function getDisplayName(source) {
  return (
    source?.fullName ||
    source?.name ||
    source?.username ||
    ""
  );
}
