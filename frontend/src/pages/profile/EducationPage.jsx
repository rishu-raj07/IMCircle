import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FileText,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import CollegeSearch from "./CollegeSearch";
import DatePickerField from "./DatePickerField";
import LocationField from "./LocationField";

const today = new Date().toISOString().slice(0, 10);

function getDateValue(value) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function getFirstItem(value) {
  if (Array.isArray(value)) return value[0] || {};
  return value || {};
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 80,
  required,
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <FieldLabel required={required}>{label}</FieldLabel>

        <span className="mb-2 text-[11px] font-bold text-[var(--imc-text-faint)]">
          {value.length}/{maxLength}
        </span>
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[16px] font-black text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
      />
    </div>
  );
}

function CollegeField({ collegeName, collegeLogo, collegeType, onClick }) {
  return (
    <div className="mt-5">
      <FieldLabel required>School / College</FieldLabel>

      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-left active:scale-[0.99]"
      >
        {collegeLogo ? (
          <img
            src={collegeLogo}
            alt="School"
            className="h-12 w-12 rounded-2xl border border-[var(--imc-border)] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]">
            <GraduationCap size={24} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[16px] font-black ${
              collegeName ? "text-[var(--imc-text)]" : "text-[var(--imc-text-faint)]"
            }`}
          >
            {collegeName || "Search school / college"}
          </p>

          <p className="mt-0.5 text-[12px] font-bold text-[var(--imc-text-muted)]">
            {collegeType || "Choose from IMCircle education hub"}
          </p>
        </div>
      </button>
    </div>
  );
}

function EducationPage({ value, onBack, onSave }) {
  const data = getFirstItem(value);

  const [college, setCollege] = useState(null);
  const [collegeName, setCollegeName] = useState("");
  const [collegeLogo, setCollegeLogo] = useState("");
  const [collegeCity, setCollegeCity] = useState("");
  const [collegeState, setCollegeState] = useState("");
  const [collegeType, setCollegeType] = useState("College");

  const [degree, setDegree] = useState("");
  const [stream, setStream] = useState("");
  const [grade, setGrade] = useState("");
  const [activities, setActivities] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [current, setCurrent] = useState(true);

  const [collegeSearchOpen, setCollegeSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const item = getFirstItem(value);

    setCollege(item?.college?._id || item?.college || null);
    setCollegeName(
      item?.collegeName ||
        item?.college?.name ||
        (typeof item?.college === "string" ? item.college : "") ||
        ""
    );
    setCollegeLogo(
      item?.collegeLogo ||
        item?.college?.logo?.url ||
        item?.college?.logoUrl ||
        ""
    );
    setCollegeCity(item?.collegeCity || item?.college?.location?.city || "");
    setCollegeState(item?.collegeState || item?.college?.location?.state || "");
    setCollegeType(item?.collegeType || item?.college?.type || "College");

    setDegree(item?.degree || "");
    setStream(item?.stream || item?.fieldOfStudy || "");
    setGrade(item?.grade || "");
    setActivities(item?.activities || "");
    setDescription(item?.description || "");

    setStartDate(getDateValue(item?.startDate || item?.startedIn));
    setEndDate(getDateValue(item?.endDate || item?.studiedTill));
    setCurrent(item?.current ?? true);
    setStep(1);
  }, [value]);

  useEffect(() => {
    if (current) setEndDate("");
  }, [current]);

  useEffect(() => {
    if (!startDate || !endDate) return;

    if (new Date(endDate) < new Date(startDate)) {
      setEndDate("");
    }
  }, [startDate, endDate]);

  const canSave = useMemo(() => {
    if (!degree.trim()) return false;
    if (!collegeName.trim()) return false;
    if (!startDate) return false;
    if (!current && !endDate) return false;
    return true;
  }, [degree, collegeName, startDate, current, endDate]);

  const stepMeta = [
    {
      icon: GraduationCap,
      eyebrow: "PROGRAM & CAMPUS",
      title: "What did you study?",
      copy: "Choose your institution and add the program people will recognize.",
    },
    {
      icon: CalendarDays,
      eyebrow: "TIMELINE & RESULT",
      title: "When did you study?",
      copy: "Add your dates and an optional grade or score.",
    },
    {
      icon: Sparkles,
      eyebrow: "CAMPUS STORY",
      title: "What shaped you there?",
      copy: "Share activities, projects and achievements that made it meaningful.",
    },
  ];

  const validateStep = () => {
    setError("");
    if (step === 1 && !collegeName.trim()) {
      setError("Choose or create a school or college to continue.");
      return false;
    }
    if (step === 1 && !degree.trim()) {
      setError("Add your degree, class or certification to continue.");
      return false;
    }
    if (step === 2 && !startDate) {
      setError("Choose a start date to continue.");
      return false;
    }
    if (step === 2 && (!collegeCity.trim() || !collegeState.trim())) {
      setError("Choose a campus location from the suggestions.");
      return false;
    }
    if (step === 2 && !current && !endDate) {
      setError("Choose an end date or mark this as your current education.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((currentStep) => Math.min(3, currentStep + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setError("");
    if (step > 1) {
      setStep((currentStep) => currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    onBack();
  };

  const handleSave = async () => {
    setError("");

    if (!degree.trim()) return setError("Degree / class is required");
    if (!collegeName.trim()) return setError("School / college is required");
    if (!startDate) return setError("Start date is required");
    if (!collegeCity.trim() || !collegeState.trim()) {
      return setError("Campus location is required");
    }

    if (new Date(startDate) > new Date(today)) {
      return setError("Start date cannot be in future");
    }

    if (!current) {
      if (!endDate) return setError("End date is required");

      if (new Date(endDate) < new Date(startDate)) {
        return setError("End date cannot be before start date");
      }

      if (new Date(endDate) > new Date(today)) {
        return setError("End date cannot be in future");
      }
    }

    try {
      setSaving(true);

      await onSave({
        _id: data?._id,
        college,
        collegeName: collegeName.trim(),
        collegeLogo,
        collegeCity,
        collegeState,
        collegeType,
        degree: degree.trim(),
        stream: stream.trim(),
        grade: grade.trim(),
        activities: activities.trim(),
        description: description.trim(),
        startDate,
        endDate: current ? "" : endDate,
        current,
        achievements: data?.achievements || [],
        skills: data?.skills || [],
        media: data?.media || [],
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Could not save. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const ActiveIcon = stepMeta[step - 1].icon;

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] px-5 pb-8">
        <div className="-mx-5 border-b border-[var(--imc-border)] bg-[var(--imc-bg)] px-5 pb-4 pt-2">
          <div className="flex h-12 items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--imc-surface)] disabled:opacity-40"
          >
            <ArrowLeft size={27} />
          </button>

          <h1 className="text-[18px] font-black text-[var(--imc-text)]">
            {data?._id ? "Edit Education" : "Add Education"}
          </h1>
          <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-2 text-[12px] font-black text-[var(--imc-indigo-text)]">{step}/3</span>
          </div>
          <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <div key={item} className={`h-1.5 rounded-full transition-colors ${item <= step ? "bg-[var(--imc-indigo-text)]" : "bg-[var(--imc-surface-2)]"}`} />)}</div>
        </div>

        <div className="pb-28 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(79,70,229,0.09)] text-[var(--imc-indigo-text)]"><ActiveIcon size={19} /></div>
            <div><p className="text-[10px] font-black tracking-[0.14em] text-[var(--imc-indigo-text)]">{stepMeta[step - 1].eyebrow}</p>
            <h2 className="mt-1 text-[24px] font-black tracking-[-0.6px] text-[var(--imc-text)]">{stepMeta[step - 1].title}</h2></div>
          </div>

          <div className="mt-5 border-t border-[var(--imc-border)] pt-1">
          {step === 1 && <>

          <CollegeField
            collegeName={collegeName}
            collegeLogo={collegeLogo}
            collegeType={collegeType}
            onClick={() => setCollegeSearchOpen(true)}
          />

          <TextInput
            label="Degree / Class"
            value={degree}
            onChange={setDegree}
            placeholder="B.Com, B.Tech, 12th, Diploma..."
            required
          />

          <TextInput
            label="Stream / Field"
            value={stream}
            onChange={setStream}
            placeholder="Commerce, Computer Science, Arts..."
          />

          </>}

          {step === 2 && <>
          <div className="mt-5">
            <LocationField
              label="Campus location"
              value={{ city: collegeCity, state: collegeState }}
              onChange={(location) => {
                setCollegeCity(location?.city || "");
                setCollegeState(location?.state || "");
              }}
              placeholder="Search the campus city"
            />
          </div>
          <TextInput
            label="Grade / Score"
            value={grade}
            onChange={setGrade}
            placeholder="8.5 CGPA, 82%, A Grade..."
            maxLength={40}
          />

          <DatePickerField
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            maxDate={today}
            required
          />

          <label className="mt-5 flex items-center gap-3 text-[15px] font-black text-[var(--imc-text)]">
            <input
              type="checkbox"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
              className="h-6 w-6 accent-[var(--imc-indigo-text)]"
            />
            I currently study here
          </label>

          {!current && (
            <DatePickerField
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
              maxDate={today}
              required
            />
          )}

          </>}

          {step === 3 && <>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel>Activities</FieldLabel>

              <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                {activities.length}/300
              </span>
            </div>

            <textarea
              value={activities}
              onChange={(e) => setActivities(e.target.value.slice(0, 300))}
              placeholder="Clubs, societies, competitions, leadership roles..."
              className="min-h-[110px] w-full resize-none rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 text-[16px] font-bold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
            />
          </div>

          </>}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel>Description</FieldLabel>

              <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                {description.length}/500
              </span>
            </div>

            <div className="relative">
              <FileText
                size={18}
                className="absolute left-4 top-4 text-[var(--imc-indigo-text)]"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="What did you learn, build or achieve here?"
                className="min-h-[120px] w-full resize-none rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 pl-11 text-[16px] font-bold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
              {error}
            </div>
          )}

        </div>

        <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 gap-3 border-t border-[var(--imc-border)] bg-[var(--imc-bg)] px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {step > 1 && <button type="button" onClick={handleBack} disabled={saving} className="h-[52px] min-w-[104px] rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[14px] font-black text-[var(--imc-text)]">Back</button>}
          <button type="button" onClick={step === 3 ? handleSave : goNext} disabled={(step === 3 && !canSave) || saving} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--imc-indigo-text)] bg-[rgba(79,70,229,0.08)] text-[15px] font-black text-[var(--imc-indigo-text)] active:scale-[0.99] disabled:opacity-45">
            {saving ? "Saving..." : step === 3 ? "Save Education" : "Continue"}
            {!saving && step < 3 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      <CollegeSearch
        open={collegeSearchOpen}
        value={collegeName}
        onClose={() => setCollegeSearchOpen(false)}
        onSelect={(data) => {
          setCollege(data.college || null);
          setCollegeName(data.collegeName || "");
          setCollegeLogo(data.collegeLogo || "");
          setCollegeCity(data.collegeCity || "");
          setCollegeState(data.collegeState || "");
          setCollegeType(data.collegeType || "College");
        }}
      />
    </div>
  );
}

export default EducationPage;
