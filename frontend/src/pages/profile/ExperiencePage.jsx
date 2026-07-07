import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
} from "lucide-react";

import CompanySearch from "./CompanySearch";
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

  const handleSave = async () => {
    setError("");

    if (!title.trim()) return setError("Title is required");
    if (!organisation.trim()) return setError("Organisation is required");
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
            Add Experience
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
            Work Details
          </h2>

          <p className="mt-1 text-[13px] font-bold leading-5 text-[var(--imc-text-muted)]">
            Add your job, business, internship, freelance or self-employed work.
          </p>

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

          <TextInput
            label="Location"
            value={location}
            onChange={setLocation}
            placeholder="Delhi, India"
            maxLength={80}
          />

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
            {saving ? "Saving..." : "Save Experience"}
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