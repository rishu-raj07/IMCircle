import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getMyProfile, updateProfile } from "../../api/profileApi";
import { setUser } from "../../utils/storage";

import ProgressHeader from "./ProgressHeader";
import ImageUploader from "./ImageUploader";
import BasicInfo from "./BasicInfo";
import ExperiencePage from "./ExperiencePage";
import EducationPage from "./EducationPage";

function getLocationValue(value) {
  if (!value) return { city: "", state: "", country: "India", lat: null, lng: null };

  if (typeof value === "string") {
    const parts = value.split(",").map((item) => item.trim());
    return { city: parts[0] || "", state: parts[1] || "", country: parts[2] || "India", lat: null, lng: null };
  }

  return {
    city: value.city || "",
    state: value.state || "",
    country: value.country || "India",
    lat: value.coordinates?.lat ?? value.lat ?? null,
    lng: value.coordinates?.lng ?? value.lng ?? null,
  };
}

function getDobInputValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function getImageUrl(user) {
  const image =
    user?.avatar ||
    user?.profileImage ||
    user?.profileImageUrl ||
    user?.picture ||
    user?.photoURL ||
    user?.image?.url ||
    user?.image;

  if (!image) return "";
  if (typeof image === "string") return image;

  return image?.secure_url || image?.url || "";
}

function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) => {
      if (typeof skill === "string") return skill;
      return skill?.name || skill?.title || skill?.skill || "";
    })
    .filter(Boolean);
}

function normalizeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "object") {
    return [value];
  }

  return [];
}

function getSafeIndex(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : null;
}

function ProfileSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState("main");
  const [editingType, setEditingType] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [profileImage, setProfileImage] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameEditUnlocked, setUsernameEditUnlocked] = useState(false);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState(null);
  const [dob, setDob] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState({
    city: "",
    state: "",
    country: "India",
    lat: null,
    lng: null,
  });
  // Optional field — defaults to "Prefer not to say" instead of nothing
  // selected, so a brand-new user always has a valid choice pre-picked and
  // never has to actively decide just to move past this step.
  const [gender, setGender] = useState("Prefer not to say");
  const [primaryInterest, setPrimaryInterest] = useState("");

  // Experience/education/skills are no longer edited on this page — they're
  // added directly from the Profile page (which still links into
  // ExperiencePage/EducationPage below) or, for skills, via the Skill modal
  // on Profile. We still load and resend them unchanged here so saving the
  // basic info form doesn't wipe out data added elsewhere.
  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Live availability status lifted up from UsernameField (via BasicInfo) so
  // the mandatory step-1 "Next" button can be disabled until the username is
  // confirmed available — spec: "Disable Next until both fields are valid."
  const [usernameStatus, setUsernameStatus] = useState("idle");

  useEffect(() => {
    const loadProfileForEdit = async () => {
      try {
        const data = await getMyProfile();
        const user = data?.user || data?.data?.user || data?.data || data;

        // "Editing an existing profile" now just means the mandatory step
        // (fullName + username) is already done — gender/primaryInterest are
        // optional now and shouldn't factor into this, otherwise a user who
        // did only the mandatory step and came back here later would
        // incorrectly see the fresh-onboarding "Complete Profile" copy
        // instead of "Edit Profile".
        setIsEditingExisting(
          Boolean(
            user?.onboardingCompleted ||
              (user?.fullName && user.fullName !== "BN User" && user?.username)
          )
        );

        setProfileImage(getImageUrl(user));
        setFullName(
          user?.fullName && user.fullName !== "BN User"
            ? user.fullName
            : user?.name || ""
        );
        setUsername(user?.username || "");
        setOriginalUsername(user?.username || "");
        setUsernameEditUnlocked(false);
        setUsernameLastChangedAt(
          user?.usernameLastChangedAt || (user?.username ? user?.createdAt : null)
        );
        setDob(getDobInputValue(user?.dob));
        setTagline(user?.headline || user?.tagline || "");
        setLocation(getLocationValue(user?.location));
        setGender(user?.gender || "Prefer not to say");
        setPrimaryInterest(user?.primaryInterest || "");
        setExperience(normalizeArray(user?.experience));
        setEducation(normalizeArray(user?.education));
        setSkills(normalizeSkills(user?.skills));
      } catch (err) {
        // best-effort — non-critical
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfileForEdit();
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    const mode = searchParams.get("mode");
    const index = getSafeIndex(searchParams.get("index"));

    if (section === "experience") {
      setEditingType("experience");
      setEditingIndex(mode === "add" ? null : index);
      setPage("experience");
    }

    if (section === "education") {
      setEditingType("education");
      setEditingIndex(mode === "add" ? null : index);
      setPage("education");
    }
  }, [searchParams]);

  // basicOnboardingCompleted = fullName + username ONLY — mirrors
  // hasRequiredBasics() in backend/src/controllers/profile.controller.js and
  // isOnboardingComplete() in utils/sessionUser.js exactly. Gender, DOB,
  // tagline, location, and primaryInterest are all optional and never gate
  // finishing setup or reaching the app.
  const hasBasicInfo = Boolean(fullName.trim() && username.trim());

  const isStudentCategory = primaryInterest.trim().toLowerCase() === "student";

  // Mandatory fields (name + username) = 50%, photo/tagline/skills = 10%
  // each. Student category: Education is 20% and there's no Experience item
  // at all. Everyone else: Education 10% + Experience 10%.
  const progress = useMemo(() => {
    let score = 0;

    if (fullName.trim() && username.trim()) {
      score += 50;
    }

    if (profileImage.trim()) score += 10;
    if (tagline.trim()) score += 10;
    if (education.length > 0) score += isStudentCategory ? 20 : 10;
    if (!isStudentCategory && experience.length > 0) score += 10;
    if (skills.length > 0) score += 10;

    return Math.min(score, 100);
  }, [
    fullName,
    username,
    isStudentCategory,
    profileImage,
    tagline,
    education.length,
    experience.length,
    skills.length,
  ]);

  const missingItems = useMemo(() => {
    const items = [];

    if (!profileImage.trim()) items.push("Profile photo");
    if (!tagline.trim()) items.push("Tagline");
    if (education.length === 0) items.push("Education");
    if (!isStudentCategory && experience.length === 0) items.push("Experience");
    if (skills.length === 0) items.push("Skills");

    return items;
  }, [profileImage, tagline, education.length, experience.length, skills.length, isStudentCategory]);

  const progressSubtitle = useMemo(() => {
    if (!hasBasicInfo) return "Basic info required";
    if (progress === 100) return "Profile completed";
    if (missingItems.length > 0) return `Add ${missingItems[0].toLowerCase()} to improve your profile`;
    return "Add experience, education or skills from your profile";
  }, [progress, hasBasicInfo, missingItems]);

  const buildProfilePayload = () => ({
    fullName: fullName.trim(),
    username: username.trim().toLowerCase(),
    usernameChangeConfirmed:
      usernameEditUnlocked &&
      Boolean(originalUsername) &&
      username.trim().toLowerCase() !== originalUsername.toLowerCase(),
    dob,
    headline: tagline.trim(),
    location: {
      city: location.city.trim(),
      state: location.state.trim(),
      country: (location.country || "India").trim(),
      coordinates: { lat: location.lat, lng: location.lng },
    },
    gender,
    primaryInterest,
    avatar: profileImage,
    profileImage,
    experience,
    education,
    skills: skills.map((skill) => ({
      name: skill,
      level: 50,
    })),
  });

  const usernameFormatValid = /^[a-z0-9_]{3,30}$/.test(username.trim().toLowerCase());

  // An already-registered username (editing an existing, complete profile —
  // field is locked or just unchanged) never runs UsernameField's live
  // availability check, so `usernameStatus` stays "idle" for it. That's
  // still valid, since it's already saved under this account. A brand-new
  // username must come back "available" from the live check before Next is
  // allowed — spec: "Disable Next until both fields are valid."
  const usernameConfirmedOk = originalUsername ? true : usernameStatus === "available";
  const step1Valid = Boolean(fullName.trim()) && usernameFormatValid && usernameConfirmedOk;

  // Saves whatever's been entered so far and advances — used by both the
  // mandatory step 1 (spec: "Immediately save... mark basic onboarding
  // completed... redirect to the next optional onboarding step") and the
  // optional steps 2/3's own "Next". Saving on every step (not just the
  // final one) means closing the app mid-onboarding never loses progress.
  const saveStepAndAdvance = async (nextStep) => {
    setError("");

    try {
      setLoading(true);

      const data = await updateProfile(buildProfilePayload());

      if (data?.user) {
        // Keep the global/local-storage auth user in sync with what the
        // server just persisted, so any other screen reading the cached
        // user (e.g. ProtectedRoute's onboarding check) sees fresh data
        // immediately — this is what actually unblocks the rest of the app
        // the instant step 1 is saved.
        setUser(data.user);
      }

      setSetupStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not save — try again");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setError("");

    if (setupStep === 1) {
      if (!fullName.trim()) return setError("Add your name before continuing");
      if (!username.trim()) return setError("Choose a username before continuing");
      if (!usernameFormatValid) {
        return setError("Username must be 3-30 letters, numbers, or underscores");
      }
      if (!usernameConfirmedOk) {
        return setError(
          usernameStatus === "taken"
            ? "That username is already taken — try another"
            : usernameStatus === "checking"
            ? "Still checking availability — one moment"
            : "Choose a valid, available username before continuing"
        );
      }

      saveStepAndAdvance(2);
      return;
    }

    // Steps 2 and 3 are entirely optional — nothing here blocks "Next",
    // just save whatever's been filled in and move on.
    saveStepAndAdvance(Math.min(3, setupStep + 1));
  };

  // "Skip for now" — shown on every optional screen (steps 2 and 3). Spec:
  // "save anything they already entered and redirect them to the home
  // page" — note this goes straight to home, not to the next optional step.
  const handleSkip = async () => {
    setError("");

    try {
      setLoading(true);
      const data = await updateProfile(buildProfilePayload());
      if (data?.user) setUser(data.user);
    } catch {
      // Best-effort — a failed partial save of optional fields should never
      // trap the person on this screen. fullName/username were already
      // saved and confirmed back in step 1 regardless.
    } finally {
      setLoading(false);
      navigate("/home", { replace: true });
    }
  };

  const handlePreviousStep = () => {
    setError("");
    setSetupStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    setError("");

    // Only fullName + username are actually required — everything else on
    // this final (optional) step, including primaryInterest, can be blank.
    if (!fullName.trim()) return setError("Name is required");
    if (!username.trim()) return setError("Username is required");
    if (!usernameFormatValid) {
      return setError(
        "Username must be 3-30 characters: letters, numbers or underscore only"
      );
    }

    try {
      setLoading(true);

      const data = await updateProfile(buildProfilePayload());

      if (data?.user) {
        setUser(data.user);
      }

      // Fresh onboarding finishes on Home — the whole point of this rework
      // is getting new users into the app, not back onto a profile form.
      // Editing an already-complete profile still returns to /profile so
      // the person sees their just-saved changes right away.
      navigate(isEditingExisting ? "/profile" : "/home", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Profile setup failed");
    } finally {
      setLoading(false);
    }
  };

  // Experience/Education are only ever opened via a Profile-page deep link
  // now (?section=...), so saving or cancelling should drop the person
  // straight back on their profile — never onto this basic-info screen.
  const persistSection = async (type, updatedList) => {
    const data = await updateProfile({ [type]: updatedList });

    if (data?.user) setUser(data.user);
    if (type === "experience") setExperience(updatedList);
    else if (type === "education") setEducation(updatedList);

    navigate("/profile", { replace: true });
  };

  const returnToProfile = () => navigate("/profile", { replace: true });

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--imc-bg)]">
        <p className="text-[13px] font-black text-[var(--imc-text)]">
          Loading profile...
        </p>
      </div>
    );
  }

  if (page === "experience") {
    return (
      <ExperiencePage
        value={
          editingType === "experience" && editingIndex !== null
            ? experience[editingIndex]
            : null
        }
        onBack={returnToProfile}
        onSave={(data) => {
          const updated =
            editingIndex !== null && experience[editingIndex]
              ? experience.map((item, index) =>
                  index === editingIndex ? data : item
                )
              : [...experience, data];

          return persistSection("experience", updated);
        }}
      />
    );
  }

  if (page === "education") {
    return (
      <EducationPage
        value={
          editingType === "education" && editingIndex !== null
            ? education[editingIndex]
            : null
        }
        onBack={returnToProfile}
        onSave={(data) => {
          const updated =
            editingIndex !== null && education[editingIndex]
              ? education.map((item, index) =>
                  index === editingIndex ? data : item
                )
              : [...education, data];

          return persistSection("education", updated);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] px-5 pb-8">
        <ProgressHeader
          title={isEditingExisting ? "Edit Profile" : "Complete Profile"}
          subtitle={
            setupStep === 1
              ? "Just your name and username to start"
              : setupStep === 2
              ? "Optional — add a photo and tagline, or skip"
              : "Optional — help people discover you, or skip"
          }
          progress={(setupStep / 3) * 100}
          step={setupStep}
          totalSteps={3}
        />

        {setupStep === 2 && (
          <ImageUploader
            name={fullName}
            imageUrl={profileImage}
            onChange={setProfileImage}
          />
        )}

        {setupStep === 2 && !profileImage && (
          <p className="mt-2 text-center text-[11px] font-medium text-[var(--imc-text-faint)]">
            Profile photo is optional — you can add one later.
          </p>
        )}

        <BasicInfo
          step={setupStep}
          fullName={fullName}
          setFullName={setFullName}
          username={username}
          setUsername={setUsername}
          originalUsername={originalUsername}
          usernameEditUnlocked={usernameEditUnlocked}
          setUsernameEditUnlocked={setUsernameEditUnlocked}
          usernameLastChangedAt={usernameLastChangedAt}
          onUsernameStatusChange={setUsernameStatus}
          dob={dob}
          setDob={setDob}
          tagline={tagline}
          setTagline={setTagline}
          location={location}
          setLocation={setLocation}
          gender={gender}
          setGender={setGender}
          primaryInterest={primaryInterest}
          setPrimaryInterest={setPrimaryInterest}
        />

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            {error}
          </div>
        )}

        {/* "Skip for now" — every optional screen (steps 2 and 3) shows
            this, separate from Back/Next, and it always jumps straight to
            Home rather than to the next optional step (see handleSkip). Not
            shown for someone editing an already-complete profile — there's
            nothing to "skip" for them, they're just editing. */}
        {setupStep > 1 && !isEditingExisting && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="mt-4 w-full text-center text-[12.5px] font-black text-[var(--imc-text-faint)] underline decoration-dotted underline-offset-4 disabled:opacity-60"
          >
            Skip for now
          </button>
        )}

        <div className="sticky bottom-0 z-20 -mx-2 mt-8 flex gap-2.5 border-t border-[var(--imc-border)] bg-[color:var(--imc-bg)] px-2 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          {setupStep > 1 && (
            <button
              type="button"
              onClick={handlePreviousStep}
              disabled={loading}
              className="flex h-[50px] min-w-[108px] items-center justify-center gap-1.5 rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[13px] font-black text-[var(--imc-text)] active:scale-[0.98] disabled:opacity-60"
            >
              <ChevronLeft size={17} />
              Back
            </button>
          )}

          <button
            type="button"
            onClick={setupStep === 3 ? handleSave : handleNextStep}
            disabled={loading || (setupStep === 1 && !step1Valid)}
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-[rgba(67,56,202,0.24)] bg-[rgba(67,56,202,0.10)] text-[14px] font-bold text-[var(--imc-indigo-text)] shadow-[0_6px_18px_rgba(67,56,202,0.08)] transition active:scale-[0.98] active:bg-[rgba(67,56,202,0.16)] disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : setupStep === 3
              ? isEditingExisting
                ? "Save Changes"
                : "Complete Profile"
              : "Next"}
            {!loading && (setupStep === 3 ? <Check size={17} /> : <ChevronRight size={17} />)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;
