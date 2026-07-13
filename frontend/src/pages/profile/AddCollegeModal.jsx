import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  ImagePlus,
} from "lucide-react";

import { createCollege, verifyCollegeWebsite } from "../../api/collegeApi";
import { uploadImage } from "../../api/uploadApi";
import LocationField from "./LocationField";
import {
  validateOptionalEmail,
  validateOptionalPlace,
  validateOptionalWebsite,
  validateOrgName,
} from "../../utils/orgValidation";

export default function AddCollegeModal({
  open,
  initialName = "",
  onClose,
  onCreated,
}) {
  const fileRef = useRef(null);

  const [name, setName] = useState(initialName);
  const [type, setType] = useState("College");
  const [website, setWebsite] = useState("");
  const [emailLocalPart, setEmailLocalPart] = useState("");
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
  const email = emailLocalPart.trim() && verifiedDomain
    ? `${emailLocalPart.trim()}@${verifiedDomain}`
    : "";

  useEffect(() => {
    if (!open) return;
    setName(initialName || "");
    setFieldErrors({});
    setError("");
    setStep(1);
    setWebsiteStatus("idle");
    setVerifiedDomain("");
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
      name: validateOrgName(name, "School / college name"),
      website: validateOptionalWebsite(website),
      email: validateOptionalEmail(email),
      city: city.trim()
        ? validateOptionalPlace(city, "City")
        : "Campus location is required",
      state: state.trim()
        ? validateOptionalPlace(state, "State")
        : "Choose a location with a state",
    };
    const visibleErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => Boolean(message))
    );

    setFieldErrors(visibleErrors);

    if (Object.keys(visibleErrors).length) {
      setError("Please fix the highlighted fields before creating the page.");
      return;
    }

    if (website.trim() && websiteStatus !== "verified") {
      try {
        setWebsiteStatus("checking");
        const verified = await verifyCollegeWebsite(website);
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

    try {
      setSaving(true);

      const college = await createCollege({
        name: name.trim(),
        type,
        website: website.trim(),
        email: email.trim(),
        location: {
          city: city.trim(),
          state: state.trim(),
          country: "India",
        },
        logo: {
          url: logoUrl,
          publicId: logoPublicId,
        },
      });

      onCreated(college);
    } catch {
      setError("Couldn't create the education page. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    setError("");
    if (step === 1) {
      const nameError = validateOrgName(name, "School / college name");
      if (nameError) {
        setFieldErrors((prev) => ({ ...prev, name: nameError }));
        setError("Add a valid institution name to continue.");
        return;
      }
    }
    if (step === 2) {
      const cityError = city.trim() ? validateOptionalPlace(city, "City") : "Choose a city from the suggestions";
      const stateError = state.trim() ? validateOptionalPlace(state, "State") : "Choose a location with a state";
      if (cityError || stateError) {
        setFieldErrors((prev) => ({ ...prev, city: cityError, state: stateError }));
        setError("Check the location details before continuing.");
        return;
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
            Create Education Page
          </h2>
          <span className="rounded-full border border-[var(--imc-border)] px-3 py-1.5 text-[11px] font-black text-[var(--imc-indigo-text)]">{step}/3</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">{[1,2,3].map((item) => <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[var(--imc-indigo-text)]" : "bg-[var(--imc-surface-2)]"}`} />)}</div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-black tracking-[0.14em] text-[var(--imc-indigo-text)]">STEP {step} OF 3</p>
          <h3 className="mt-1 text-[22px] font-black text-[var(--imc-text)]">{step === 1 ? "Institution identity" : step === 2 ? "Campus location" : "Official contact"}</h3>
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
                alt="School logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <GraduationCap size={38} />
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
          Logo is optional. If empty, IMCircle will show an education icon.
        </p>

        <div className="mt-6 space-y-4">
          <TextInput
            label="School / College Name"
            required
            value={name}
            onChange={(value) => {
              setName(value);
              setFieldErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Example: IIT Delhi"
            error={fieldErrors.name}
          />

          <div>
            <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">
              Type
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-[56px] w-full rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo-text)]"
            >
              <option>School</option>
              <option>College</option>
              <option>University</option>
              <option>Institute</option>
              <option>Other</option>
            </select>
          </div>
        </div></>}

        {step === 3 && <div className="mt-6 space-y-4">
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
            placeholder="https://example.edu"
            error={fieldErrors.website}
          />
          {website.trim() && <p className={`text-[12px] font-black ${websiteStatus === "verified" ? "text-emerald-600" : websiteStatus === "error" ? "text-red-500" : "text-[var(--imc-text-muted)]"}`}>{websiteStatus === "checking" ? "Checking website..." : websiteStatus === "verified" ? "Website verified" : websiteStatus === "error" ? "Website could not be verified" : "This website will be verified before creation"}</p>}

          <EmailDomainInput
            value={emailLocalPart}
            domain={verifiedDomain}
            onChange={(value) => {
              setEmailLocalPart(value);
              setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            error={fieldErrors.email}
          />
        </div>}

        {step === 2 && <div className="mt-6 space-y-4">
          <LocationField
            label="Campus location"
            value={{ city, state }}
            onChange={(location) => {
              setCity(location?.city || "");
              setState(location?.state || "");
              setFieldErrors((prev) => ({ ...prev, city: "", state: "" }));
            }}
            placeholder="Search the school or college city"
          />
          {(fieldErrors.city || fieldErrors.state) && <p className="text-[11px] font-black text-red-500">{fieldErrors.city || fieldErrors.state}</p>}
        </div>}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} className="h-[52px] min-w-[100px] rounded-2xl border border-[var(--imc-border)] text-[14px] font-black text-[var(--imc-text)]">Back</button>}
          <button type="button" onClick={step === 3 ? handleSave : goNext} disabled={saving || websiteStatus === "checking"} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--imc-indigo-text)] bg-[rgba(79,70,229,0.08)] text-[15px] font-black text-[var(--imc-indigo-text)] disabled:opacity-60">
            {saving ? "Saving..." : step === 3 && website.trim() && websiteStatus !== "verified" ? "Verify website" : step === 3 ? "Create Education Page" : "Continue"}
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

function EmailDomainInput({ value, domain, onChange, error }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">Email</label>
      <div className={`flex h-[56px] items-center overflow-hidden rounded-[18px] border bg-[var(--imc-surface)] pl-4 focus-within:border-[var(--imc-indigo-text)] ${error ? "border-red-300" : "border-[var(--imc-border)]"}`}>
        <input
          value={value}
          disabled={!domain}
          onChange={(event) => onChange(event.target.value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64))}
          placeholder={domain ? "yourname" : "Verify website first"}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] disabled:cursor-not-allowed"
        />
        {domain && <span className="shrink-0 bg-[var(--imc-surface-2)] px-3 py-2 text-[13px] font-black text-[var(--imc-text-muted)]">@{domain}</span>}
      </div>
      <p className="mt-2 text-[11px] font-bold text-[var(--imc-text-faint)]">{domain ? "Type only the mailbox name." : "Verify the website to unlock the email field."}</p>
      {error && <p className="mt-2 text-[11px] font-black text-red-500">{error}</p>}
    </div>
  );
}
