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

// Fixed onboarding chips. "Other" is handled separately below — picking it
// reveals a text field, and whatever the person types becomes the actual
// saved category (not the literal word "Other").
const INTEREST_OPTIONS = [
  "Startup",
  "Career",
  "Student",
  "AI & Tech",
  "Marketing",
  "Finance",
  "Design",
  "Content & Creator",
  "Fitness & Wellness",
  "Education",
];

function formatDobDisplay(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

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
  onStatusChange,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const manuallyEditedRef = useRef(false);

  // Reports live availability status up to ProfileSetup so it can disable
  // the mandatory step-1 "Next" button until the username is confirmed
  // available (spec: "Disable Next until both fields are valid"). Also
  // reports "available" immediately for an already-registered, unchanged
  // username (locked or not-yet-unlocked-for-editing) since that's already
  // a valid, saved username — there's nothing to re-check.
  useEffect(() => {
    if (!onStatusChange) return;
    onStatusChange(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
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
        const recommended = data?.recommended || "";
        setSuggestions(
          (data?.suggestions || [])
            .filter((item) => item !== recommended)
            .slice(0, 4)
        );

        if (recommended && !manuallyEditedRef.current) {
          setUsername(recommended);
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
      const recommended = data?.recommended || "";
      setSuggestions(
        (data?.suggestions || [])
          .filter((item) => item !== username)
          .filter((item) => item !== recommended)
          .slice(0, 4)
      );
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
        <label className="mb-2 block text-[12px] font-bold text-[var(--imc-text-muted)]">
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
            className="h-[54px] w-full rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] pl-11 pr-4 text-[15px] font-bold text-[var(--imc-text-muted)] outline-none"
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
          <label className="text-[12px] font-bold text-[var(--imc-text-muted)]">
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
            className="h-[54px] w-full rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] pl-11 pr-4 text-[15px] font-bold text-[var(--imc-text-muted)] outline-none"
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
        <label className="text-[12px] font-bold text-[var(--imc-text-muted)]">
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
          className="h-[54px] w-full rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-4 text-[15px] font-bold text-[var(--imc-text)] outline-none transition placeholder:font-medium placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)] focus:ring-2 focus:ring-[rgba(67,56,202,0.08)]"
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
                  ? "border border-[rgba(67,56,202,0.30)] bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
                  : "border border-transparent bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
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
  step = 1,
  fullName,
  setFullName,
  username,
  setUsername,
  originalUsername,
  usernameEditUnlocked,
  setUsernameEditUnlocked,
  usernameLastChangedAt,
  onUsernameStatusChange,
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
  const dobInputRef = useRef(null);

  const isCustomInterest = Boolean(primaryInterest) && !INTEREST_OPTIONS.includes(primaryInterest);
  const [otherMode, setOtherMode] = useState(isCustomInterest);
  const [customInterest, setCustomInterest] = useState(isCustomInterest ? primaryInterest : "");
  const stepCopy = {
    1: {
      eyebrow: "Get started",
      title: "Your name and username",
      text: "Just these two — you can add everything else later.",
    },
    2: {
      eyebrow: "Optional · Personalize",
      title: "Add a bit more about you",
      text: "Photo, tagline, birthday, gender — all optional, skip anytime.",
    },
    3: {
      eyebrow: "Optional · Discoverability",
      title: "Your place and interests",
      text: "Helps people discover you. Skip this and add it later if you'd rather.",
    },
  }[step];

  const openDobPicker = () => {
    const input = dobInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through to focus below
      }
    }

    input.focus();
  };

  return (
    <section className="mt-6">
      <div className="mb-5 border-b border-[var(--imc-border)] pb-4">
        <span className="mb-2 inline-flex rounded-full bg-[rgba(67,56,202,0.09)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--imc-indigo-text)]">
          Step {step} of 3 · {stepCopy.eyebrow}
        </span>
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--imc-text)]">{stepCopy.title}</h2>
        <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--imc-text-muted)]">
          {stepCopy.text}
        </p>
      </div>

      <div className="space-y-5">
        <div className={step === 1 ? "" : "hidden"}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-bold text-[var(--imc-text-muted)]">
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
            className="h-[54px] w-full rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[15px] font-bold text-[var(--imc-text)] outline-none transition placeholder:font-medium placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)] focus:ring-2 focus:ring-[rgba(67,56,202,0.08)]"
          />
        </div>

        <div className={step === 1 ? "" : "hidden"}>
          <UsernameField
            username={username}
            setUsername={setUsername}
            originalUsername={originalUsername}
            usernameEditUnlocked={usernameEditUnlocked}
            setUsernameEditUnlocked={setUsernameEditUnlocked}
            fullName={fullName}
            usernameLastChangedAt={usernameLastChangedAt}
            onStatusChange={onUsernameStatusChange}
          />
        </div>

        <div className={step === 2 ? "" : "hidden"}>
          <label className="mb-2 block text-[12px] font-bold text-[var(--imc-text-muted)]">
            Date of Birth <span className="font-medium text-[var(--imc-text-faint)]">(optional)</span>
          </label>

          <div className="relative" onClick={openDobPicker}>
            <CalendarDays
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-10 text-[var(--imc-indigo-text)]"
            />

            <div className="flex h-[54px] w-full items-center rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-4 text-[15px] font-bold transition hover:border-[rgba(67,56,202,0.35)]">
              <span
                className={dob ? "text-[var(--imc-text)]" : "text-[var(--imc-text-faint)]"}
              >
                {dob ? formatDobDisplay(dob) : "Select date of birth"}
              </span>
            </div>

            {/* Sits on top of the styled field above and is the exact same
                size, so a tap anywhere on the field opens the native date
                picker — not just on a small icon. showPicker() above is a
                belt-and-braces call for browsers that only auto-open on a
                direct click on this input. */}
            <input
              ref={dobInputRef}
              type="date"
              value={dob}
              max={dobBounds.max}
              min={dobBounds.min}
              onChange={(e) => setDob(e.target.value)}
              className="absolute inset-0 h-[54px] w-full cursor-pointer opacity-0"
            />
          </div>

          <p className="mt-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
            You must be at least 13 years old to use IMCircle.
          </p>
        </div>

        <div className={step === 2 ? "" : "hidden"}>
          <label className="mb-2 block text-[12px] font-bold text-[var(--imc-text-muted)]">
            Gender <span className="font-medium text-[var(--imc-text-faint)]">(optional)</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {genderOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGender(item)}
                className={`flex min-h-[48px] items-center gap-2 rounded-[15px] border px-3 text-left text-[13px] font-bold transition ${
                  gender === item
                    ? "border-[rgba(67,56,202,0.35)] bg-[rgba(67,56,202,0.10)] text-[var(--imc-indigo-text)] shadow-[0_4px_12px_rgba(67,56,202,0.06)]"
                    : "border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)]"
                }`}
              >
                <UserRound size={18} />
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className={step === 2 ? "" : "hidden"}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-bold text-[var(--imc-text-muted)]">
              Tagline <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">(optional)</span>
            </label>
            <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
              {tagline.length}/320
            </span>
          </div>

          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value.slice(0, 320))}
            placeholder="Tell people what you do, what you're building, or what you're learning right now."
            className="min-h-[130px] w-full resize-none rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 text-[14px] font-medium leading-6 text-[var(--imc-text)] outline-none transition placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)] focus:ring-2 focus:ring-[rgba(67,56,202,0.08)]"
          />

          <p className="mt-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
            About 5-6 lines is a good length. You can skip this for now and add it later.
          </p>
        </div>

        <div className={step === 3 ? "" : "hidden"}>
          <LocationField value={location} onChange={setLocation} required={false} />
        </div>

        <div className={step === 3 ? "" : "hidden"}>
          <label className="mb-2 block text-[12px] font-bold text-[var(--imc-text-muted)]">
            What are you here to explore? <span className="font-medium text-[var(--imc-text-faint)]">(optional)</span>
          </label>

          <p className="mb-2 text-[11px] font-bold text-[var(--imc-text-faint)]">
            Helps us personalize what shows up in your feed and improve your discoverability.
          </p>

          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setOtherMode(false);
                  setPrimaryInterest(item);
                }}
                className={`rounded-full px-3.5 py-2 text-[12px] font-black ${
                  !otherMode && primaryInterest === item
                    ? "border border-[rgba(67,56,202,0.30)] bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
                    : "border border-transparent bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
                }`}
              >
                {item}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setOtherMode(true);
                setPrimaryInterest(customInterest.trim());
              }}
              className={`rounded-full px-3.5 py-2 text-[12px] font-black ${
                otherMode
                  ? "border border-[rgba(67,56,202,0.30)] bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]"
                  : "border border-transparent bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
              }`}
            >
              Other
            </button>
          </div>

          {otherMode && (
            <input
              autoFocus
              value={customInterest}
              onChange={(e) => {
                const value = e.target.value.slice(0, 60);
                setCustomInterest(value);
                setPrimaryInterest(value.trim());
              }}
              placeholder="Tell us what you're here to explore"
              className="mt-2.5 h-[52px] w-full rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[14px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default BasicInfo;
