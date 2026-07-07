import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
} from "lucide-react";

import { createCollege } from "../../api/collegeApi";
import { uploadImage } from "../../api/uploadApi";
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
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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
      name: validateOrgName(name, "School / college name"),
      website: validateOptionalWebsite(website),
      email: validateOptionalEmail(email),
      city: validateOptionalPlace(city, "City"),
      state: validateOptionalPlace(state, "State"),
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
    } catch (err) {
      setError(err?.response?.data?.message || "School save failed");
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
            Create School
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
                alt="School logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <GraduationCap size={38} />
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
            <label className="mb-2 block text-[13px] font-black text-[#2B2E38]">
              Type
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-[56px] w-full rounded-[18px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] px-4 text-[16px] font-bold text-[var(--imc-text)] outline-none focus:border-[#4338CA]"
            >
              <option>School</option>
              <option>College</option>
              <option>University</option>
              <option>Institute</option>
              <option>Other</option>
            </select>
          </div>

          <TextInput
            label="Website"
            value={website}
            onChange={(value) => {
              setWebsite(value);
              setFieldErrors((prev) => ({ ...prev, website: "" }));
            }}
            placeholder="https://example.edu"
            error={fieldErrors.website}
          />

          <TextInput
            label="Email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="contact@example.edu"
            error={fieldErrors.email}
          />

          <TextInput
            label="City"
            value={city}
            onChange={(value) => {
              setCity(value);
              setFieldErrors((prev) => ({ ...prev, city: "" }));
            }}
            placeholder="Delhi"
            error={fieldErrors.city}
          />

          <TextInput
            label="State"
            value={state}
            onChange={(value) => {
              setState(value);
              setFieldErrors((prev) => ({ ...prev, state: "" }));
            }}
            placeholder="Delhi"
            error={fieldErrors.state}
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
          {saving ? "Saving..." : "Create Education Page"}
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
