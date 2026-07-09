import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

import { getAvatarUrl, getDisplayName, getInitial } from "../../utils/avatar";

// The ONE consistent default avatar shown everywhere in IMCircle when a
// person has no profile photo (profile photo is optional at setup — see
// ProfileSetup.jsx). Never renders a broken <img>: if the real photo URL
// 404s/errors, it swaps to this same fallback instead of a blank box.
//
// Usage: <Avatar user={someUser} size={44} /> or, if you already have a
// plain image URL + display name (e.g. from a denormalized feed item),
// <Avatar src={url} name={name} size={44} />.
export default function Avatar({ user, src, name, size = 40, className = "" }) {
  const [failed, setFailed] = useState(false);

  const resolvedSrc = src ?? getAvatarUrl(user);
  const displayName = name || getDisplayName(user);
  const initial = getInitial(displayName);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const style = { width: size, height: size, minWidth: size, minHeight: size };

  if (resolvedSrc && !failed) {
    return (
      <img
        src={resolvedSrc}
        alt={displayName || "Profile"}
        style={style}
        className={`rounded-full object-cover ${className}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#12141C] font-black text-[#EC9A1E] ${className}`}
    >
      {initial ? (
        <span style={{ fontSize: Math.max(Math.round(size * 0.38), 11) }}>
          {initial}
        </span>
      ) : (
        <UserRound size={Math.max(Math.round(size * 0.5), 14)} />
      )}
    </div>
  );
}
