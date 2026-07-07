import { useEffect, useRef, useState } from "react";
import {
  AtSign,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  RefreshCcw,
  UserRound,
  X,
} from "lucide-react";

import LocationField from "./LocationField";
import {
  checkUsernameAvailability,
  getUsernameSuggestions,
} from "../../api/profileApi";

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

const INTEREST_OPTIONS = [
  "Startup",
  "Career",
  "AI & Tech",
  "Marketing",
  "Finance",
  "Design",
  "Content & Creator",
  "Other",
];

function getDobBounds() {
  const today = new Date();

  const max = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate()
  );

  const min = new Date(
    today.getFullYear() - 100,
    today.getMonth(),
    today.getDate()
  );

  return {
    max: max.toISOString().slice(0, 10),
    min: min.toISOString().slice(0, 10),
  };
}

const USERNAME_COOLDOWN_DAYS = 30;

function getUsernameLock(usernameLastChangedAt, hadUsernameOnLoad) {
  if (!hadUsernameOnLoad || !usernameLastChangedAt) {
    return { locked: false, nextAllowedAt: null };
  }

  const changedAt = new Date(usernameLastChangedAt);
  if (Number.isNaN(changedAt.getTime())) return { locked: false, nextAllowedAt: null };

  const nextAllowedAt = new Date(
    changedAt.getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );

  return {
    locked: nextAllowedAt > new Date(),
    nextAllowedAt,
  };
}

function UsernameField({
  username,
  setUsername,
  fullName,
  originalUsername,
  usernameEditUnlocked,
  setUsernameEditUnlocked,
  usernameLastChangedAt,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const manuallyEditedRef = useRef(false);
  const nameDebounceRef = useRef(null);
  const checkDebounceRef = useRef(null);

  // Whether this field already had a username saved the moment the page
  // loaded. Used to tell "brand new account, please pick a username" apart
  // from "editing an existing profile" — the auto-suggest below must never
  // clobber an already-registered username.
  const hadUsernameOnLoadRef = useRef(Boolean(username));

  const { locked, nextAllowedAt } = getUsernameLock(
    usernameLastChangedAt,
    hadUsernameOnLoadRef.current
  );
  const hasRegisteredUsername = Boolean(originalUsername || hadUsernameOnLoadRef.current);
  const canEditUsername = !hasRegisteredUsername || usernameEditUnlocked;

  // Auto-suggest a username from the person's name — only for brand new
  // accounts that don't have a username yet, and only until they start
  // editing the field themselves.
  useEffect(() => {
    if (hasRegisteredUsername) return;
    if (manuallyEditedRef.current) return;
    if (!fullName || fullName.trim().length < 2) return;

    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);

    nameDebounceRef.current = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const data = await getUsernameSuggestions(fullName.trim());
        setSuggestions(data?.suggestions || []);

        if (data?.recommended && !manuallyEditedRef.current) {
          setUsername(data.recommended);
        }
      } catch {
        // silent — user can still type a username manually
      } finally {
        setSuggestionsLoading(false);
      }
    }, 600);

    return () => clearTimeout(nameDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, hasRegisteredUsername]);

  // Live availability check as the user edits the username.
  useEffect(() => {
    if (locked || !canEditUsername) return;

    const value = username.trim().toLowerCase();

    if (!value) {
      setStatus("idle");
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(value)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");

    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);

    checkDebounceRef.current = setTimeout(async () => {
      try {
        const data = await checkUsernameAvailability(value);
        setStatus(data?.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 450);

    return () => clearTimeout(checkDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, locked, canEditUsername]);

  const refreshSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const data = await getUsernameSuggestions(fullName || username || "builder");
      setSuggestions(data?.suggestions || []);
    } catch {
      // silent
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const pickSuggestion = (value) => {
    manuallyEditedRef.current = true;
    setUsername(value);
  };

  const statusMeta = {
    checking: { text: "Checking availability...", color: "var(--imc-text-muted)", Icon: Loader2, spin: true },
    available: { text: "Username is available", color: "#059669", Icon: Check },
    taken: { text: "This username is already registered", color: "#D92D20", Icon: X },
    invalid: { text: "Use 3-30 letters, numbers or underscore only", color: "#D92D20", Icon: X },
  }[status];

  if (locked) {
    return (
      <div>
        <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
          Username <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <AtSign
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-text-faint)]"
          />

          <input
            value={username}
            disabled
            className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] pl-11 pr-4 text-[16px] font-black text-[var(--imc-text-muted)] outline-none"
          />
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
          <Clock size={13} />
          You can change your username again on{" "}
          {nextAllowedAt?.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .
        </p>
      </div>
    );
  }

  if (hasRegisteredUsername && !canEditUsername) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[13px] font-black text-[var(--imc-text-muted)]">
            Username <span className="text-red-500">*</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setSuggestions([]);
              setStatus("idle");
              setUsernameEditUnlocked(true);
            }}
            className="text-[11px] font-black text-[var(--imc-indigo-text)]"
          >
            Change
          </button>
        </div>

        <div className="relative">
          <AtSign
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-text-faint)]"
          />

          <input
            value={username}
            disabled
            className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] pl-11 pr-4 text-[16px] font-black text-[var(--imc-text-muted)] outline-none"
          />
        </div>

        <p className="mt-1.5 text-[10.5px] font-semibold text-[var(--imc-text-faint)]">
          Your username is locked. You can edit it only after pressing Change, and then it locks again for 30 days.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[13px] font-black text-[var(--imc-text-muted)]">
          Username <span className="text-red-500">*</span>
        </label>

        <button
          type="button"
          onClick={refreshSuggestions}
          disabled={suggestionsLoading || !canEditUsername}
          className="flex items-center gap-1 text-[11px] font-black text-[var(--imc-indigo-text)] disabled:opacity-50"
        >
          <RefreshCcw size={12} className={suggestionsLoading ? "animate-spin" : ""} />
          Suggest
        </button>
      </div>

      <div className="relative">
        <AtSign
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-text-faint)]"
        />

        <input
          value={username}
          onChange={(e) => {
            manuallyEditedRef.current = true;
            setUsername(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 30)
            );
          }}
          disabled={!canEditUsername}
          placeholder="choose-a-username"
          className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-4 text-[16px] font-black text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
        />
      </div>

      {statusMeta && (
        <p
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold"
          style={{ color: statusMeta.color }}
        >
          <statusMeta.Icon size={13} className={statusMeta.spin ? "animate-spin" : ""} />
          {statusMeta.text}
        </p>
      )}

      {hasRegisteredUsername && usernameEditUnlocked && !suggestions.length && (
        <p className="mt-1.5 text-[10.5px] font-semibold text-[var(--imc-text-faint)]">
          Changing this starts a new 30-day cooldown before you can change it again.
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => pickSuggestion(item)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                item === username
                  ? "bg-[#4338CA] text-white"
                  : "bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
              }`}
            >
              @{item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BasicInfo({
  fullName,
  setFullName,
  username,
  setUsername,
  originalUsername,
  usernameEditUnlocked,
  setUsernameEditUnlocked,
  usernameLastChangedAt,
  dob,
  setDob,
  tagline,
  setTagline,
  location,
  setLocation,
  gender,
  setGender,
  primaryInterest,
  setPrimaryInterest,
}) {
  const dobBounds = getDobBounds();

  return (
    <section className="mt-1">
      <div className="mb-5">
        <h2 className="text-[24px] font-black text-[var(--imc-text)]">Basic Info</h2>
        <p className="mt-1 text-[13px] font-bold text-[var(--imc-text-muted)]">
          Required details to personalize your IMCircle profile.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-black text-[var(--imc-text-muted)]">
              Name <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
              {fullName.length}/60
            </span>
          </div>

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value.slice(0, 60))}
            placeholder="Your full name"
            className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[17px] font-black text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
          />
        </div>

        <UsernameField
          username={username}
          setUsername={setUsername}
          originalUsername={originalUsername}
          usernameEditUnlocked={usernameEditUnlocked}
          setUsernameEditUnlocked={setUsernameEditUnlocked}
          fullName={fullName}
          usernameLastChangedAt={usernameLastChangedAt}
        />

        <div>
          <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
            Date of Birth <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <CalendarDays
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-indigo-text)]"
            />

            <input
              type="date"
              value={dob}
              max={dobBounds.max}
              min={dobBounds.min}
              onChange={(e) => setDob(e.target.value)}
              className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-4 text-[16px] font-black text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo-text)]"
            />
          </div>

          <p className="mt-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
            You must be at least 13 years old to use IMCircle.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
            Gender <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {genderOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGender(item)}
                className={`flex min-h-[52px] items-center gap-2 rounded-[18px] border px-3 text-left text-[14px] font-black ${
                  gender === item
                    ? "border-[var(--imc-indigo-text)] bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
                    : "border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)]"
                }`}
              >
                <UserRound size={18} />
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-black text-[var(--imc-text-muted)]">
              Tagline <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
              {tagline.length}/320
            </span>
          </div>

          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value.slice(0, 320))}
            placeholder="Tell people what you do, what you're building, or what you're learning right now."
            className="min-h-[150px] w-full resize-none rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 text-[16px] font-bold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
          />

          <p className="mt-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
            About 5-6 lines is a good length.
          </p>
        </div>

        <LocationField value={location} onChange={setLocation} />

        <div>
          <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
            What are you here to explore? <span className="text-red-500">*</span>
          </label>

          <p className="mb-2 text-[11px] font-bold text-[var(--imc-text-faint)]">
            Helps us personalize what shows up in your feed.
          </p>

          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrimaryInterest(item)}
                className={`rounded-full px-3.5 py-2 text-[12px] font-black ${
                  primaryInterest === item
                    ? "bg-[#4338CA] text-white"
                    : "bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default BasicInfo;
