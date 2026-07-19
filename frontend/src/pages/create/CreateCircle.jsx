import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Loader2,
  Lock,
  Send,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { createCircle } from "../../api/circleApi";
import { uploadImage } from "../../api/uploadApi";

const INK = "var(--imc-text)";
const PAPER = "var(--imc-surface-2)";
const MARIGOLD = "#EC9A1E";
const GOLD_TINT = "rgba(236,154,30,0.12)";
const MUTED = "var(--imc-text-muted)";
const LINE = "var(--imc-border)";

const visibilityOptions = [
  {
    label: "Public",
    value: "public",
    icon: <Globe2 size={17} />,
  },
  {
    label: "Private",
    value: "private",
    icon: <Lock size={17} />,
  },
  {
    label: "Invite Only",
    value: "invite-only",
    icon: <UsersRound size={17} />,
  },
];

function CreateCircle() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    visibility: "public",
    tags: [],
    coverImage: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (key, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCoverSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const localPreview = URL.createObjectURL(file);
      setCoverPreview(localPreview);

      const uploaded = await uploadImage(file, { purpose: "community" });
      updateForm("coverImage", uploaded?.url || "");
    } catch (uploadError) {
      setError(
        uploadError?.response?.data?.message ||
          "Failed to upload cover image. Please try again."
      );
      setCoverPreview("");
      updateForm("coverImage", "");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeCover = () => {
    setCoverPreview("");
    updateForm("coverImage", "");
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");

    if (!tag) return;

    if (form.tags.includes(tag)) {
      setTagInput("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, tag],
    }));

    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Circle name is required.");
      return;
    }

    if (uploading) {
      setError("Please wait, cover image is uploading.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await createCircle({
        name: form.name.trim(),
        description: form.description.trim(),
        visibility: form.visibility,
        tags: form.tags,
        coverImage: form.coverImage,
      });

      const circleId = data?.circle?._id;

      navigate("/network", {
        replace: true,
        state: { createdCircleId: circleId || "" },
      });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          "Failed to create circle. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen justify-center"
      style={{ background: "var(--imc-bg)" }}
    >
      <div
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden pb-28"
        style={{ background: "var(--imc-bg)" }}
      >
        <div className="relative border-b px-4 py-4 backdrop-blur-xl" style={{ borderColor: LINE, background: "color-mix(in srgb, var(--imc-surface) 92%, transparent)" }}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full active:scale-95"
              style={{ background: PAPER, color: INK }}
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center">
              <h1 className="text-[16px] font-black" style={{ color: INK }}>Create Circle</h1>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: MUTED }}>Bring the right people together</p>
            </div>

            <div className="h-10 w-10" />
          </div>
        </div>

        <main className="relative px-5 pb-6 pt-5">
          <section className="space-y-6">
            <div>
              <Label title="Cover image" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
              />

              {coverPreview || form.coverImage ? (
                <div
                  className="relative mt-2 overflow-hidden rounded-[22px]"
                  style={{ border: `1px solid ${LINE}`, background: PAPER }}
                >
                  <img
                    src={coverPreview || form.coverImage}
                    alt="Circle cover"
                    className="h-40 w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
                  >
                    <X size={17} />
                  </button>

                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/45 text-[13px] font-black text-white">
                      Uploading...
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex h-28 w-full items-center gap-3 rounded-[18px] border border-dashed px-4 text-left active:scale-[0.99]"
                  style={{ borderColor: "var(--imc-action-border)", background: "var(--imc-action-soft)" }}
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-[18px]"
                    style={{ background: "var(--imc-surface)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-border)" }}
                  >
                    <ImagePlus size={23} />
                  </div>

                  <div><p className="text-[13px] font-black" style={{ color: INK }}>Add a cover image</p><p className="mt-1 text-[10px] font-semibold" style={{ color: MUTED }}>JPG, PNG or WEBP · maximum 5MB</p></div>
                </button>
              )}

              {(coverPreview || form.coverImage) && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-[12px] font-black"
                  style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }}
                >
                  <Camera size={16} />
                  Change cover image
                </button>
              )}
            </div>

            <div>
              <Label title="Circle name" />

              <div className="mt-2 flex h-12 items-center gap-3 rounded-[16px] border px-4" style={{ background: "var(--imc-surface)", borderColor: LINE }}>
                <UsersRound size={18} style={{ color: "var(--imc-indigo-text)" }} />

                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="AI Builders India"
                  maxLength={80}
                  className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
                  style={{ color: INK }}
                />
              </div>
            </div>

            <div>
              <Label title="Short description" />

              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Tell people what this circle is about and who should join..."
                maxLength={1000}
                className="mt-2 min-h-[132px] w-full resize-none rounded-[20px] p-4 text-[14px] font-semibold leading-6 outline-none placeholder:text-[var(--imc-text-faint)]"
                style={{ background: "var(--imc-surface)", color: INK, border: `1px solid ${LINE}` }}
              />
            </div>

            <div>
              <Label title="Visibility" />

              <div className="mt-2 grid grid-cols-3 gap-2">
                {visibilityOptions.map((item) => {
                  const active = form.visibility === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateForm("visibility", item.value)}
                      className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-2 py-3 text-[10px] font-black"
                      style={{
                        background: active ? "var(--imc-action-soft)" : "var(--imc-surface)",
                        color: active ? "var(--imc-indigo-text)" : MUTED,
                        border: active ? "1px solid var(--imc-action-border)" : `1px solid ${LINE}`,
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label title="Tags" />

              <div className="mt-2 flex h-12 items-center gap-2 rounded-[16px] border px-4" style={{ background: "var(--imc-surface)", borderColor: LINE }}>
                <Tag size={17} style={{ color: "var(--imc-indigo-text)" }} />

                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="startup, react, delhi..."
                  className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
                  style={{ color: INK }}
                />

                <button
                  type="button"
                  onClick={addTag}
                  className="text-[12px] font-black"
                  style={{ color: "var(--imc-indigo-text)" }}
                >
                  Add
                </button>
              </div>

              {form.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-black"
                      style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }}
                    >
                      #{tag}
                      <X size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {error && (
            <div
              className="mt-4 flex items-start gap-2 rounded-[18px] p-3 text-[12px] font-bold leading-5"
              style={{ background: "#FFF1F0", color: "#B42318", border: "1px solid rgba(180,35,24,0.14)" }}
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-[16px] text-[13px] font-black active:scale-[0.98] disabled:opacity-60"
            style={{ background: "var(--imc-action-soft)", color: "var(--imc-indigo-text)", border: "1px solid var(--imc-action-border)" }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : uploading ? (
              <Camera size={18} />
            ) : (
              <Send size={18} />
            )}
            {loading ? "Creating..." : uploading ? "Uploading..." : "Create Circle"}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold" style={{ color: MUTED }}>
            <CheckCircle2 size={14} style={{ color: "var(--imc-indigo-text)" }} />
            You become the owner automatically.
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function Label({ title }) {
  return (
    <p className="text-[12px] font-black uppercase" style={{ color: INK, letterSpacing: "0.02em" }}>
      {title}
    </p>
  );
}

export default CreateCircle;
