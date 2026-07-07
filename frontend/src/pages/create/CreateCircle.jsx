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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg
            className="absolute -right-28 -top-32 h-[390px] w-[390px] opacity-[0.28]"
            viewBox="0 0 420 420"
            fill="none"
          >
            <circle cx="210" cy="210" r="209" stroke={MARIGOLD} strokeOpacity="0.14" />
            <circle cx="210" cy="210" r="154" stroke={MARIGOLD} strokeOpacity="0.1" />
            <circle cx="210" cy="210" r="96" stroke="#4338CA" strokeOpacity="0.12" />
          </svg>
        </div>

        <div className="relative sticky top-0 z-20 border-b px-4 py-4 backdrop-blur-xl" style={{ borderColor: LINE, background: "color-mix(in srgb, var(--imc-surface) 92%, transparent)" }}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full active:scale-95"
              style={{ background: PAPER, color: INK }}
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[16px] font-black" style={{ color: INK }}>
              Create Circle
            </h1>

            <div className="h-10 w-10" />
          </div>
        </div>

        <main className="relative px-4 pt-5">
          <section
            className="rounded-[26px] p-5 text-white shadow-[0_18px_45px_rgba(138,90,18,0.14)]"
            style={{
              background:
                "linear-gradient(145deg, #151515 0%, #211B12 58%, #3A270D 100%)",
              border: "1px solid rgba(236,154,30,0.14)",
            }}
          >
            <div
              className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase"
              style={{ background: "rgba(236,154,30,0.06)", color: MARIGOLD }}
            >
              <UsersRound size={13} />
              Builder circle
            </div>

            <h2 className="font-serif text-[25px] font-semibold leading-tight">
              Start a focused community
            </h2>

            <p className="mt-2 max-w-[320px] text-[12px] font-semibold leading-5 text-white/65">
              Bring people together around a goal, skill, city, startup or idea.
            </p>
          </section>

          <section
            className="mt-4 space-y-4 rounded-[26px] bg-[var(--imc-surface)] p-4 shadow-[0_12px_30px_rgba(18,20,28,0.04)]"
            style={{ border: `1px solid ${LINE}` }}
          >
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
                  className="mt-2 flex h-36 w-full flex-col items-center justify-center rounded-[22px] border border-dashed text-center active:scale-[0.99]"
                  style={{ borderColor: "rgba(236,154,30,0.28)", background: GOLD_TINT }}
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-[18px]"
                    style={{ background: "var(--imc-surface-strong)", color: MARIGOLD, border: "1px solid var(--imc-surface-strong-border)" }}
                  >
                    <ImagePlus size={23} />
                  </div>

                  <p className="mt-3 text-[13px] font-black" style={{ color: INK }}>
                    Upload cover from gallery
                  </p>

                  <p className="mt-1 text-[11px] font-semibold" style={{ color: MUTED }}>
                    JPG, PNG or WEBP up to 5MB
                  </p>
                </button>
              )}

              {(coverPreview || form.coverImage) && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-[12px] font-black"
                  style={{ background: GOLD_TINT, color: MARIGOLD }}
                >
                  <Camera size={16} />
                  Change cover image
                </button>
              )}
            </div>

            <div>
              <Label title="Circle name" />

              <div className="mt-2 flex h-12 items-center gap-3 rounded-[16px] px-4" style={{ background: PAPER }}>
                <UsersRound size={18} style={{ color: MARIGOLD }} />

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
                style={{ background: PAPER, color: INK }}
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
                        background: active ? MARIGOLD : PAPER,
                        color: active ? "#12141C" : MUTED,
                        border: active ? "1px solid transparent" : `1px solid ${LINE}`,
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

              <div className="mt-2 flex h-12 items-center gap-2 rounded-[16px] px-4" style={{ background: PAPER }}>
                <Tag size={17} style={{ color: MARIGOLD }} />

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
                  style={{ color: MARIGOLD }}
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
                      style={{ background: GOLD_TINT, color: MARIGOLD }}
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
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[14px] font-black shadow-[0_18px_38px_rgba(236,154,30,0.22)] active:scale-[0.98] disabled:opacity-60"
            style={{ background: MARIGOLD, color: "#12141C" }}
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
            <CheckCircle2 size={14} style={{ color: MARIGOLD }} />
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
