import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { X, Lock, CirclePlus, Check } from "lucide-react";

import { getUserByUsername } from "../../api/userApi";
import { sendCircleRequest } from "../../api/circleRequestApi";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getSessionUser } from "../../utils/sessionUser";

// Domain-only links (typed without "http(s)://", e.g. "imcircle.com") used
// to be completely invisible to this regex — the old pattern only matched
// tokens that already started with "https?://", so anything typed the way
// a person actually types it in a post ("check out imcircle.com") rendered
// as flat, non-clickable text. This fragment matches a bare
// label(.label)*.tld shape against a small curated TLD list (avoids
// false-positives like "e.g." or "v1.2" that a bare `\w+\.\w+` pattern would
// wrongly linkify), with subdomains and an optional path. The `(?<![\w@.])`
// guard stops it from matching mid-email ("user@imcircle.com") or
// mid-larger-token.
const BARE_DOMAIN_SOURCE =
  "(?:www\\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.(?:com|net|org|io|co|in|dev|app|ai|me|info|biz|edu|gov|us|uk|ca|xyz|tech|store|online|site|club|live|world|studio|shop)\\b(?:\\/[^\\s<.,:;!?'\")\\]]*)?";

// Tests a single already-split token against the bare-domain shape above
// (anchored, whole-string) — used at render time to decide whether a plain
// token like "imcircle.com" should render as a link.
const BARE_DOMAIN_TEST = new RegExp(`^${BARE_DOMAIN_SOURCE}$`, "i");

// One combined regex with capture groups so String.split() keeps the
// matched delimiters in the result array, in order — @mention, #hashtag,
// full https?:// URLs, and now bare domains all render as tappable inline
// elements, everything else stays as plain text. Deliberately does NOT
// touch existing markdown rendering elsewhere in the app; this only affects
// plain post/learning/journey/circle-post text, which was always rendered
// as a flat string. The https?:// alternative is listed first so a full
// URL like "https://imcircle.com/x" is consumed whole by that branch
// instead of also (partially) matching the bare-domain branch.
const TOKEN_REGEX = new RegExp(
  `(@[a-z0-9_]{3,30}|#[a-z0-9_]{2,50}|https?:\\/\\/[^\\s<]+[^\\s<.,:;!?'")\\]]|(?<![\\w@.])${BARE_DOMAIN_SOURCE})`,
  "gi"
);

function shortenUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const display = `${parsed.hostname}${path}`;
    return display.length > 34 ? `${display.slice(0, 33)}…` : display;
  } catch {
    return url.length > 34 ? `${url.slice(0, 33)}…` : url;
  }
}

// Tapping an @mention opens this instead of navigating straight to the
// full profile — it shows who they are either way, but the "View profile"
// action only unlocks once the viewer is actually in that person's Circle
// (mirrors the same gate used to @mention someone in the first place, see
// MentionSuggestions.jsx). Not in Circle yet just gets a "Send request"
// button in place of navigation.
function MentionPreviewSheet({ username, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [failed, setFailed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let alive = true;

    getUserByUsername(username)
      .then((res) => {
        if (!alive) return;
        const user = res?.user || res?.data?.user || null;
        if (user) setProfile(user);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [username]);

  const isSelf = getSessionUser()?.username === username;
  const canView = isSelf || Boolean(profile?.isInCircle);

  const openFullProfile = () => {
    onClose();
    navigate(`/profile/${username}`);
  };

  const handleSendRequest = async () => {
    if (!profile?._id || requesting || requested) return;

    try {
      setRequesting(true);
      await sendCircleRequest(profile._id);
      setRequested(true);
    } catch {
      // best-effort — non-critical
    } finally {
      setRequesting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-[430px] rounded-t-[28px] bg-[var(--imc-surface)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-[var(--imc-text)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-[12px] font-bold text-[var(--imc-text-muted)]">Loading profile...</p>
        ) : failed || !profile ? (
          <p className="py-8 text-center text-[12px] font-bold text-[var(--imc-text-muted)]">This profile couldn't be loaded.</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-[var(--imc-border)]">
              <img
                src={
                  profile?.avatar?.url ||
                  profile?.avatar?.secure_url ||
                  (typeof profile?.avatar === "string" ? profile.avatar : "") ||
                  getGenderAvatarIcon(profile)
                }
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <p className="mt-3 text-[17px] font-black">{profile?.fullName || profile?.username}</p>
            <p className="text-[12.5px] font-bold" style={{ color: "var(--imc-indigo-text)" }}>@{profile?.username}</p>
            {profile?.headline && (
              <p className="mt-1 max-w-[280px] text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                {profile.headline}
              </p>
            )}

            {canView ? (
              <button
                type="button"
                onClick={openFullProfile}
                className="mt-5 h-11 w-full rounded-2xl text-[13px] font-black text-white active:scale-[0.98]"
                style={{ background: "var(--imc-indigo)" }}
              >
                View full profile
              </button>
            ) : (
              <>
                <div
                  className="mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[11.5px] font-semibold"
                  style={{ background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }}
                >
                  <Lock size={14} className="shrink-0" />
                  Join their Circle to view the full profile.
                </div>

                <button
                  type="button"
                  disabled={requesting || requested}
                  onClick={handleSendRequest}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[13px] font-black text-white active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "var(--imc-indigo)" }}
                >
                  {requested ? <Check size={15} /> : <CirclePlus size={15} />}
                  {requesting ? "..." : requested ? "Request sent" : "Send Circle request"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Renders plain text with @mentions, #hashtags, and bare URLs as tappable
 * inline links — a drop-in replacement for rendering `{text}` directly
 * inside any existing container (preserves whitespace-pre-line / line-clamp
 * behavior on the parent since everything here stays inline).
 */
function RichText({ text = "", className = "" }) {
  const [openMentionUsername, setOpenMentionUsername] = useState(null);

  if (!text) return null;

  const parts = String(text).split(TOKEN_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (/^@[a-z0-9_]{3,30}$/i.test(part)) {
          const username = part.slice(1);
          return (
            <button
              key={index}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMentionUsername(username);
              }}
              className="font-black"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {part}
            </button>
          );
        }

        if (/^#[a-z0-9_]{2,50}$/i.test(part)) {
          const tag = part.slice(1);
          return (
            <Link
              key={index}
              to={`/hashtag/${encodeURIComponent(tag.toLowerCase())}`}
              onClick={(event) => event.stopPropagation()}
              className="font-black"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {part}
            </Link>
          );
        }

        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {shortenUrl(part)}
            </a>
          );
        }

        if (BARE_DOMAIN_TEST.test(part)) {
          // Typed without a protocol (e.g. "imcircle.com") — the link
          // itself still needs one to actually navigate anywhere; the
          // visible label stays exactly what the person typed.
          const href = `https://${part}`;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--imc-indigo-text)" }}
            >
              {shortenUrl(href)}
            </a>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}

      {openMentionUsername && (
        <MentionPreviewSheet
          username={openMentionUsername}
          onClose={() => setOpenMentionUsername(null)}
        />
      )}
    </span>
  );
}

export default RichText;
