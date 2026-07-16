import { useEffect, useState } from "react";

import { getAvatarUrl, getDisplayName, getGenderAvatarIcon } from "../../utils/avatar";

// The ONE consistent default avatar shown everywhere in IMCircle when a
// person has no profile photo (profile photo is optional at setup — see
// ProfileSetup.jsx). Never renders a broken <img>: if the real photo URL
// 404s/errors, it swaps to this same fallback instead of a blank box.
// The fallback itself is gender-aware (see getGenderAvatarIcon) — Male gets
// user-icon-men.png, Female gets user-icon-women.png, everything else
// (Other/Prefer not to say/unset) gets user-icon-prefernottosay.png.
//
// Usage: <Avatar user={someUser} size={44} /> or, if you already have a
// plain image URL + display name (e.g. from a denormalized feed item),
// <Avatar src={url} name={name} gender={someGender} size={44} />.
export default function Avatar({ user, src, name, gender, size = 40, className = "" }) {
  const [failed, setFailed] = useState(false);

  const resolvedSrc = src ?? getAvatarUrl(user);
  const displayName = name || getDisplayName(user);
  const fallbackIcon = getGenderAvatarIcon(gender ?? user);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const style = { width: size, height: size, minWidth: size, minHeight: size };

  return (
    <img
      src={resolvedSrc && !failed ? resolvedSrc : fallbackIcon}
      alt={displayName || "Profile"}
      style={style}
      className={`rounded-full object-cover ${className}`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (resolvedSrc && !failed) setFailed(true);
      }}
    />
  );
}
