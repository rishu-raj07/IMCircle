import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";

import { createCompany } from "../../api/companyApi";
import { uploadImage } from "../../api/uploadApi";
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
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const domain = useMemo(() => inferDomain(website, name), [website, name]);
  const email = emailLocalPart.trim() && domain ? `${emailLocalPart.trim()}@${domain}` : "";

  useEffect(() => {
    if (!open) return;
    setName(initialName || "");
    setFieldErrors({});
    setError("");
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
        logo: {
          url: logoUrl,
          publicId: logoPublicId,
        },
      });

      onCreated(company);
    } catch (err) {
      setError(err?.response?.data?.message || "Company save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/35">
      <div className="absolute bottom-0 left-1/2 max-h-[92vh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[30px] bg-[var(--imc-surface)] px-5 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[rgba(18,20,28,0.08)]" />

        <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--imc-surface-2)]"
          >
            <ArrowLeft size={24} />
          </button>

          <h2 className="text-[22px] font-black text-[var(--imc-text)]">
            Create Company
          </h2>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-[var(--imc-indigo-text)] disabled:opacity-50"
          >
            <CheckCircle2 size={30} />
          </button>
        </div>

        <div className="mt-6 flex justify-center">
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

            <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#4338CA] text-white">
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

          <TextInput
            label="Website"
            value={website}
            onChange={(value) => {
              setWebsite(value);
              setFieldErrors((prev) => ({ ...prev, website: "" }));
            }}
            placeholder="https://example.com"
            error={fieldErrors.website}
          />

          <div>
            <label className="mb-2 block text-[13px] font-black text-[#2B2E38]">
              Company Email <span className="text-[11px] font-bold text-[var(--imc-text-faint)]">(optional)</span>
            </label>

            <div
              className={`flex h-[56px] w-full items-center overflow-hidden rounded-[18px] border bg-[var(--imc-surface)] pl-4 text-[16px] font-bold text-[var(--imc-text)] focus-within:border-[#4338CA] ${
                fieldErrors.email ? "border-red-300" : "border-[rgba(18,20,28,0.08)]"
              }`}
            >
              <input
                value={emailLocalPart}
                onChange={(e) => {
                  setEmailLocalPart(
                    e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64)
                  );
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="hello"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--imc-text-faint)]"
              />

              {domain ? (
                <span className="shrink-0 bg-[var(--imc-surface-2)] px-3 py-2 text-[13px] font-black text-[var(--imc-text-muted)]">
                  @{domain}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] font-bold text-[var(--imc-text-faint)]">
              {domain
                ? "Domain is set from the website (or company name) and can't be edited here."
                : "Add a website or company name to set the email domain."}
            </p>

            {fieldErrors.email && (
              <p className="mt-2 text-[11px] font-black text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <TextInput
            label="Industry"
            value={industry}
            onChange={setIndustry}
            placeholder="Tech, Hospitality, Education..."
          />

          <SelectInput
            label="Type"
            value={type}
            onChange={setType}
            options={[
              "Startup",
              "Company",
              "Agency",
              "Small Business",
              "NGO",
              "Government",
              "Self Employed",
              "Other",
            ]}
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
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex h-[54px] w-full items-center justify-center rounded-full bg-[#4338CA] text-[16px] font-black text-white shadow-xl shadow-[rgba(67,56,202,0.18)] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create Company Page"}
        </button>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, required, error }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[#2B2E38]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 140))}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`h-[56px] w-full rounded-[18px] border bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[#4338CA] ${
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
      <label className="mb-2 block text-[13px] font-black text-[#2B2E38]">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[56px] w-full rounded-[18px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none focus:border-[#4338CA]"
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}
