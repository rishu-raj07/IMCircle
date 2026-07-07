import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
} from "lucide-react";

import CollegeSearch from "./CollegeSearch";
import DatePickerField from "./DatePickerField";

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

  const handleSave = async () => {
    setError("");

    if (!degree.trim()) return setError("Degree / class is required");
    if (!collegeName.trim()) return setError("School / college is required");
    if (!startDate) return setError("Start date is required");

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

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] px-5 pb-8">
        <div className="sticky top-0 z-30 -mx-5 flex h-[72px] items-center justify-between border-b border-[var(--imc-border)] bg-[var(--imc-bg)] px-5">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--imc-surface)] disabled:opacity-40"
          >
            <ArrowLeft size={27} />
          </button>

          <h1 className="text-[22px] font-black text-[var(--imc-text)]">
            Add Education
          </h1>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="text-[var(--imc-text)] disabled:opacity-40"
          >
            <CheckCircle2 size={34} />
          </button>
        </div>

        <div className="pt-6">
          <h2 className="text-[25px] font-black tracking-[-0.5px] text-[var(--imc-text)]">
            Education Details
          </h2>

          <p className="mt-1 text-[13px] font-bold leading-5 text-[var(--imc-text-muted)]">
            Add your school, college, university, course or certification.
          </p>

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

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="mt-8 flex h-[54px] w-full items-center justify-center rounded-full bg-[var(--imc-surface-strong)] text-[16px] font-black text-[var(--imc-on-surface-strong)] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Education"}
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