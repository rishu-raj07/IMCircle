import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  FileText,
  MapPin,
  Sparkles,
} from "lucide-react";

import CompanySearch from "./CompanySearch";
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

function parseLocationText(value = "") {
  const [city = "", state = ""] = String(value).split(",").map((item) => item.trim());
  return { city, state };
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

function SelectInput({ label, value, onChange, children }) {
  return (
    <div className="mt-5">
      <FieldLabel>{label}</FieldLabel>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[16px] font-black text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo-text)]"
      >
        {children}
      </select>
    </div>
  );
}

function CompanyField({ organisation, companyLogo, onClick }) {
  return (
    <div className="mt-5">
      <FieldLabel required>Organisation</FieldLabel>

      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-left active:scale-[0.99]"
      >
        {companyLogo ? (
          <img
            src={companyLogo}
            alt="Company"
            className="h-12 w-12 rounded-2xl border border-[var(--imc-border)] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]">
            <Building2 size={24} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[16px] font-black ${
              organisation ? "text-[var(--imc-text)]" : "text-[var(--imc-text-faint)]"
            }`}
          >
            {organisation || "Search company / business"}
          </p>

          <p className="mt-0.5 text-[12px] font-bold text-[var(--imc-text-muted)]">
            Choose from IMCircle company hub or create a page
          </p>
        </div>
      </button>
    </div>
  );
}

function ExperiencePage({ value, onBack, onSave }) {
  const data = getFirstItem(value);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(null);
  const [organisation, setOrganisation] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyType, setCompanyType] = useState("");

  const [employmentType, setEmploymentType] = useState("Full-time");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState("On-site");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [current, setCurrent] = useState(true);

  const [summary, setSummary] = useState("");
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const item = getFirstItem(value);

    setTitle(item?.title || "");
    setCompany(item?.company?._id || item?.company || null);
    setOrganisation(
      item?.organisation ||
        item?.companyName ||
        item?.company?.name ||
        (typeof item?.company === "string" ? item.company : "") ||
        ""
    );
    setCompanyLogo(
      item?.companyLogo ||
        item?.company?.logo?.url ||
        item?.company?.logoUrl ||
        ""
    );
    setCompanyDomain(item?.companyDomain || item?.company?.domain || "");
    setCompanyEmail(item?.companyEmail || item?.company?.email || "");
    setCompanyIndustry(item?.companyIndustry || item?.company?.industry || "");
    setCompanyType(item?.companyType || item?.company?.type || "");
    setEmploymentType(item?.employmentType || "Full-time");
    setLocation(item?.location || "");
    setLocationType(item?.locationType || "On-site");
    setStartDate(getDateValue(item?.startDate || item?.startedIn));
    setEndDate(getDateValue(item?.endDate || item?.workedTill));
    setCurrent(item?.current ?? true);
    setSummary(item?.summary || "");
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
    if (!title.trim()) return false;
    if (!organisation.trim()) return false;
    if (!startDate) return false;
    if (!current && !endDate) return false;
    return true;
  }, [title, organisation, startDate, current, endDate]);

  const stepMeta = [
    {
      icon: BriefcaseBusiness,
      eyebrow: "ROLE & COMPANY",
      title: "Where did you work?",
      copy: "Start with the role and organisation people will recognize.",
    },
    {
      icon: MapPin,
      eyebrow: "WORK SETUP",
      title: "When and where?",
      copy: "Add the work style, location and timeline for this experience.",
    },
    {
      icon: Sparkles,
      eyebrow: "YOUR IMPACT",
      title: "What did you accomplish?",
      copy: "A short, specific summary makes your experience stand out.",
    },
  ];

  const validateStep = () => {
    setError("");
    if (step === 1 && !title.trim()) {
      setError("Add your role or title to continue.");
      return false;
    }
    if (step === 1 && !organisation.trim()) {
      setError("Choose or create an organisation to continue.");
      return false;
    }
    if (step === 2 && !startDate) {
      setError("Choose a start date to continue.");
      return false;
    }
    if (step === 2 && !location.trim()) {
      setError("Choose a work location from the suggestions.");
      return false;
    }
    if (step === 2 && !current && !endDate) {
      setError("Choose an end date or mark this as your current role.");
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

    if (!title.trim()) return setError("Title is required");
    if (!organisation.trim()) return setError("Organisation is required");
    if (!location.trim()) {
      return setError("Choose a work location from the suggestions");
    }
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
        title: title.trim(),
        company,
        organisation: organisation.trim(),
        companyLogo,
        companyDomain,
        companyEmail,
        companyIndustry,
        companyType,
        employmentType,
        location: location.trim(),
        locationType,
        startDate,
        endDate: current ? "" : endDate,
        current,
        summary: summary.trim(),
        highlights: data?.highlights || [],
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
            {data?._id ? "Edit Experience" : "Add Experience"}
          </h1>
          <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-2 text-[12px] font-black text-[var(--imc-indigo-text)]">{step}/3</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-1.5 rounded-full transition-colors ${item <= step ? "bg-[var(--imc-indigo-text)]" : "bg-[var(--imc-surface-2)]"}`} />
            ))}
          </div>
        </div>

        <div className="pb-28 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(79,70,229,0.09)] text-[var(--imc-indigo-text)]"><ActiveIcon size={19} /></div>
            <div><p className="text-[10px] font-black tracking-[0.14em] text-[var(--imc-indigo-text)]">{stepMeta[step - 1].eyebrow}</p>
            <h2 className="mt-1 text-[24px] font-black tracking-[-0.6px] text-[var(--imc-text)]">{stepMeta[step - 1].title}</h2></div>
          </div>

          <div className="mt-5 border-t border-[var(--imc-border)] pt-1">
          {step === 1 && <>

          <TextInput
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Founder, Receptionist, Developer..."
            maxLength={80}
            required
          />

          <CompanyField
            organisation={organisation}
            companyLogo={companyLogo}
            onClick={() => setCompanySearchOpen(true)}
          />

          <SelectInput
            label="Employment Type"
            value={employmentType}
            onChange={setEmploymentType}
          >
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Self-employed</option>
            <option>Freelance</option>
            <option>Internship</option>
            <option>Trainee</option>
            <option>Contract</option>
            <option>Founder</option>
          </SelectInput>

          </>}

          {step === 2 && <>
          <div className="mt-5">
            <LocationField
              label="Work location"
              value={parseLocationText(location)}
              onChange={(nextLocation) => setLocation([nextLocation?.city, nextLocation?.state].filter(Boolean).join(", "))}
              placeholder="Search your work city"
            />
          </div>

          <SelectInput
            label="Location Type"
            value={locationType}
            onChange={setLocationType}
          >
            <option>On-site</option>
            <option>Hybrid</option>
            <option>Remote</option>
          </SelectInput>

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
            I currently work here
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
              <FieldLabel>Summary</FieldLabel>

              <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                {summary.length}/500
              </span>
            </div>

            <div className="relative">
              <FileText
                size={18}
                className="absolute left-4 top-4 text-[var(--imc-indigo-text)]"
              />

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, 500))}
                placeholder="What did you build, manage or achieve here?"
                className="min-h-[130px] w-full resize-none rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3 pl-11 text-[16px] font-bold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
              />
            </div>
          </div>

          </>}
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
              {error}
            </div>
          )}

        </div>

        <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 gap-3 border-t border-[var(--imc-border)] bg-[var(--imc-bg)] px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {step > 1 && <button type="button" onClick={handleBack} disabled={saving} className="h-[52px] min-w-[104px] rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[14px] font-black text-[var(--imc-text)]">Back</button>}
          <button
            type="button"
            onClick={step === 3 ? handleSave : goNext}
            disabled={(step === 3 && !canSave) || saving}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--imc-indigo-text)] bg-[rgba(79,70,229,0.08)] text-[15px] font-black text-[var(--imc-indigo-text)] active:scale-[0.99] disabled:opacity-45"
          >
            {saving ? "Saving..." : step === 3 ? "Save Experience" : "Continue"}
            {!saving && step < 3 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      <CompanySearch
        open={companySearchOpen}
        value={organisation}
        onClose={() => setCompanySearchOpen(false)}
        onSelect={(companyData) => {
          setCompany(companyData.company || null);
          setOrganisation(companyData.organisation || "");
          setCompanyLogo(companyData.companyLogo || "");
          setCompanyDomain(companyData.companyDomain || "");
          setCompanyEmail(companyData.companyEmail || "");
          setCompanyIndustry(companyData.companyIndustry || "");
          setCompanyType(companyData.companyType || "");
        }}
      />
    </div>
  );
}

export default ExperiencePage;
