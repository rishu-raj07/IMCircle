import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
} from "lucide-react";

import { createCompany, verifyCompanyWebsite } from "../../api/companyApi";
import { uploadImage } from "../../api/uploadApi";
import LocationField from "./LocationField";
import {
  validateOptionalEmail,
  validateOptionalWebsite,
  validateOrgName,
} from "../../utils/orgValidation";

// Best-effort domain inference so the email field can be "front part only" —
// the person never types or edits the domain themselves. Prefers the real
// website's hostname; falls back to a slugified version of the company name
// (e.g. "IMCircle" -> "imcircle.com") so the email row still works for
// companies that don't have a website yet.
function inferDomain(website, name) {
  const cleanWebsite = String(website || "").trim();

  if (cleanWebsite) {
    try {
      const withProtocol = /^https?:\/\//i.test(cleanWebsite)
        ? cleanWebsite
        : `https://${cleanWebsite}`;
      const hostname = new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
      if (hostname.includes(".")) return hostname;
    } catch {
      // fall through to name-based inference
    }
  }

  const slug = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

  return slug ? `${slug}.com` : "";
}

export default function AddCompanyModal({
  open,
  initialName = "",
  onClose,
  onCreated,
}) {
  const fileRef = useRef(null);

  const [name, setName] = useState(initialName);
  const [website, setWebsite] = useState("");
  const [emailLocalPart, setEmailLocalPart] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [type, setType] = useState("Company");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [step, setStep] = useState(1);
  const [websiteStatus, setWebsiteStatus] = useState("idle");
  const [verifiedDomain, setVerifiedDomain] = useState("");

  const domain = verifiedDomain;
  const email = emailLocalPart.trim() && domain ? `${emailLocalPart.trim()}@${domain}` : "";

  useEffect(() => {
    if (!open) return;
    setName(initialName || "");
    setFieldErrors({});
    setError("");
    setStep(1);
    setWebsiteStatus("idle");
    setVerifiedDomain("");
    setCity("");
    setState("");
  }, [open, initialName]);

  if (!open) return null;

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setError("");

      const uploaded = await uploadImage(file, { purpose: "logo" });

      setLogoUrl(uploaded?.url || uploaded?.secure_url || "");
      setLogoPublicId(uploaded?.publicId || uploaded?.public_id || "");
    } catch {
      setError("Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setError("");

    const nextErrors = {
      name: validateOrgName(name, "Company name"),
      website: validateOptionalWebsite(website),
      email: validateOptionalEmail(email),
      location: city.trim() && state.trim() ? "" : "Choose a location from the suggestions",
    };
    const visibleErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => Boolean(message))
    );

    setFieldErrors(visibleErrors);

    if (Object.keys(visibleErrors).length) {
      setError("Please fix the highlighted fields before creating the page.");
      return;
    }

    try {
      setSaving(true);

      const company = await createCompany({
        name: name.trim(),
        website: website.trim(),
        domain,
        email,
        industry: industry.trim(),
        companySize,
        type,
        location: { city: city.trim(), state: state.trim(), country: "India" },
        logo: {
          url: logoUrl,
          publicId: logoPublicId,
        },
      });

      onCreated(company);
    } catch {
      setError("Couldn't create the company. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    setError("");
    if (step === 1) {
      const nameError = validateOrgName(name, "Company name");
      if (nameError) {
        setFieldErrors((prev) => ({ ...prev, name: nameError }));
        setError("Add a valid company name to continue.");
        return;
      }
    }
    if (step === 2) {
      const websiteError = validateOptionalWebsite(website);
      const emailError = validateOptionalEmail(email);
      if (websiteError || emailError) {
        setFieldErrors((prev) => ({ ...prev, website: websiteError, email: emailError }));
        setError("Check the contact details before continuing.");
        return;
      }
      if (website.trim() && websiteStatus !== "verified") {
        try {
          setWebsiteStatus("checking");
          const verified = await verifyCompanyWebsite(website);
          setWebsite(verified?.website || website);
          setVerifiedDomain(verified?.domain || "");
          setWebsiteStatus("verified");
          return;
        } catch {
          setWebsiteStatus("error");
          setError("");
          return;
        }
      }
    }
    setStep((currentStep) => Math.min(3, currentStep + 1));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/35">
      <div className="absolute bottom-0 left-1/2 max-h-[92vh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[30px] bg-[var(--imc-surface)] px-5 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[rgba(18,20,28,0.08)]" />

        <div className="sticky top-0 z-10 -mx-5 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 pb-4">
          <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 1 ? setStep((value) => value - 1) : onClose()}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--imc-surface-2)]"
          >
            <ArrowLeft size={24} />
          </button>

          <h2 className="text-[18px] font-black text-[var(--imc-text)]">
            Create Company
          </h2>
          <span className="rounded-full border border-[var(--imc-border)] px-3 py-1.5 text-[11px] font-black text-[var(--imc-indigo-text)]">{step}/3</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">{[1,2,3].map((item) => <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[var(--imc-indigo-text)]" : "bg-[var(--imc-surface-2)]"}`} />)}</div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-black tracking-[0.14em] text-[var(--imc-indigo-text)]">STEP {step} OF 3</p>
          <h3 className="mt-1 text-[22px] font-black text-[var(--imc-text)]">{step === 1 ? "Company identity" : step === 2 ? "Verify website" : "Business details"}</h3>
        </div>

        {step === 1 && <><div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 size={34} />
            )}

            <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--imc-indigo-text)] text-white">
              {uploadingLogo ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ImagePlus size={16} />
              )}
            </div>
          </button>

          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*"
            onChange={handleLogoUpload}
          />
        </div>

        <p className="mt-2 text-center text-[12px] font-bold text-[var(--imc-text-muted)]">
          Logo is optional. If empty, IMCircle will show a company icon.
        </p>

        <div className="mt-6 space-y-4">
          <TextInput
            label="Company Name"
            required
            value={name}
            onChange={(value) => {
              setName(value);
              setFieldErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Example: IMCircle"
            error={fieldErrors.name}
          />

          <SelectInput
            label="Type"
            value={type}
            onChange={setType}
            options={["Startup", "Company", "Agency", "Small Business", "NGO", "Government", "Self Employed", "Other"]}
          />
        </div></>}

        {step === 2 && <div className="mt-6 space-y-4">
          <TextInput
            label="Website"
            value={website}
            onChange={(value) => {
              setWebsite(value);
              setWebsiteStatus("idle");
              setVerifiedDomain("");
              setEmailLocalPart("");
              setFieldErrors((prev) => ({ ...prev, website: "" }));
            }}
            placeholder="https://example.com"
            error={fieldErrors.website}
          />
          {website.trim() && <p className={`text-[12px] font-black ${websiteStatus === "verified" ? "text-emerald-600" : websiteStatus === "error" ? "text-red-500" : "text-[var(--imc-text-muted)]"}`}>{websiteStatus === "checking" ? "Checking website..." : websiteStatus === "verified" ? "Website verified" : websiteStatus === "error" ? "Website could not be verified" : "This website will be verified before continuing"}</p>}

          <div>
            <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">
              Company Email <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">(optional)</span>
            </label>

            <div
              className={`flex h-[56px] w-full items-center overflow-hidden rounded-[18px] border bg-[var(--imc-surface)] pl-4 text-[16px] font-bold text-[var(--imc-text)] focus-within:border-[var(--imc-indigo-text)] ${
                fieldErrors.email ? "border-red-300" : "border-[rgba(18,20,28,0.08)]"
              }`}
            >
              <input
                value={emailLocalPart}
                disabled={!verifiedDomain}
                onChange={(e) => {
                  setEmailLocalPart(
                    e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64)
                  );
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder={verifiedDomain ? "yourname" : "Verify website first"}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--imc-text-faint)] disabled:cursor-not-allowed"
              />

              {domain ? (
                <span className="shrink-0 bg-[var(--imc-surface-2)] px-3 py-2 text-[13px] font-black text-[var(--imc-text-muted)]">
                  @{domain}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] font-bold text-[var(--imc-text-faint)]">
              {domain
                ? "Type only the mailbox name. The verified domain is added automatically."
                : "Verify the company website to unlock the email field."}
            </p>

            {fieldErrors.email && (
              <p className="mt-2 text-[11px] font-black text-red-500">{fieldErrors.email}</p>
            )}
          </div>
        </div>}

        {step === 3 && <div className="mt-6 space-y-4">
          <LocationField
            label="Company location"
            value={{ city, state }}
            onChange={(location) => {
              setCity(location?.city || "");
              setState(location?.state || "");
              setFieldErrors((prev) => ({ ...prev, location: "" }));
            }}
            placeholder="Search the company city"
          />
          {fieldErrors.location && <p className="text-[11px] font-black text-red-500">{fieldErrors.location}</p>}
          <TextInput
            label="Industry"
            value={industry}
            onChange={setIndustry}
            placeholder="Tech, Hospitality, Education..."
          />

          <SelectInput
            label="Company Size"
            value={companySize}
            onChange={setCompanySize}
            placeholder="Select size"
            options={[
              "1-10",
              "11-50",
              "51-200",
              "201-500",
              "501-1000",
              "1001-5000",
              "5001-10000",
              "10000+",
            ]}
          />
        </div>}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} className="h-[52px] min-w-[100px] rounded-2xl border border-[var(--imc-border)] text-[14px] font-black text-[var(--imc-text)]">Back</button>}
          <button type="button" onClick={step === 3 ? handleSave : goNext} disabled={saving || websiteStatus === "checking"} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--imc-indigo-text)] bg-[rgba(79,70,229,0.08)] text-[15px] font-black text-[var(--imc-indigo-text)] disabled:opacity-60">
            {saving ? "Saving..." : step === 2 && website.trim() && websiteStatus !== "verified" ? "Verify website" : step === 3 ? "Create Company" : "Continue"}
            {!saving && (step === 3 ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />)}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, required, error }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 140))}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`h-[56px] w-full rounded-[18px] border bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)] ${
          error ? "border-red-300" : "border-[rgba(18,20,28,0.08)]"
        }`}
      />
      {error && <p className="mt-2 text-[11px] font-black text-red-500">{error}</p>}
    </div>
  );
}

function SelectInput({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[56px] w-full rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo-text)]"
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}
