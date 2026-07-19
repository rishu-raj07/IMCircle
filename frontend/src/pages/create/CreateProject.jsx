import { useRef, useState } from "react";
import {
  ArrowLeft,
  Rocket,
  Users,
  ImagePlus,
  Send,
  Sparkles,
  Target,
  BriefcaseBusiness,
  X,
  Camera,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { uploadImage } from "../../api/uploadApi";
import { createProject } from "../../api/projectApi";

function CreateProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [goal, setGoal] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const skillList = skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    try {
      setUploading(true);

      const preview = URL.createObjectURL(file);
      setImagePreview(preview);

      const uploaded = await uploadImage(file);
      setImage(uploaded?.url || "");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to upload image. Please try again."
      );
      setImage("");
      setImagePreview("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setImage("");
    setImagePreview("");
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      alert("Project name is required");
      return;
    }

    if (!description.trim()) {
      alert("Project description is required");
      return;
    }

    if (uploading) {
      alert("Please wait, image is uploading");
      return;
    }

    try {
      setLoading(true);

      const data = await createProject({
        title: projectName.trim(),
        name: projectName.trim(),
        description: description.trim(),
        requiredSkills: skillList,
        skills: skillList,
        goal: goal.trim(),
        image,
        coverImage: image,
        status: "active",
      });

      const projectId = data?.project?._id || data?.data?._id || data?._id;

      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate("/my-projects");
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to publish project. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] pb-24">
      <div className="border-b border-[rgba(18,20,28,0.08)] bg-white/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-[17px] font-black text-[var(--imc-text)]">
            Create Project
          </h1>

          <div className="h-10 w-10" />
        </div>
      </div>

      <main className="px-4 pt-5">
        <div className="mb-6">
          <h2 className="text-[24px] font-black leading-tight text-[var(--imc-text)]">
            Start a project
          </h2>

          <p className="mt-2 text-[14px] font-semibold leading-relaxed text-[var(--imc-text-muted)]">
            Share what you are building and find people to build with.
          </p>
        </div>

        <section className="space-y-4 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <div>
            <Label title="Project image" />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imagePreview || image ? (
              <div className="relative mt-2 overflow-hidden rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface-2)]">
                <img
                  src={imagePreview || image}
                  alt="Project"
                  className="h-40 w-full object-cover"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white"
                >
                  <X size={17} />
                </button>

                {uploading && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-[13px] font-black text-white">
                    Uploading...
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex h-36 w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-center active:scale-[0.99]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                  <ImagePlus size={24} />
                </div>

                <p className="mt-3 text-[13px] font-black text-[var(--imc-text)]">
                  Upload image from gallery
                </p>

                <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
                  JPG, PNG or WEBP up to 5MB
                </p>
              </button>
            )}

            {(imagePreview || image) && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--imc-surface-2)] text-[12px] font-black text-[var(--imc-indigo-text)]"
              >
                <Camera size={16} />
                Change project image
              </button>
            )}
          </div>

          <InputField
            label="Project name"
            value={projectName}
            onChange={setProjectName}
            placeholder="Example: IMCircle"
          />

          <div>
            <Label title="Project description" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your startup, app or project..."
              className="mt-2 min-h-[150px] w-full resize-none rounded-[24px] bg-[var(--imc-surface-2)] p-4 text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>

          <InputField
            label="Required skills"
            value={skills}
            onChange={setSkills}
            placeholder="React, UI/UX, Marketing, Node.js"
          />

          <InputField
            label="Goal"
            value={goal}
            onChange={setGoal}
            placeholder="Launch MVP in 3 months"
          />
        </section>

        <div className="mt-4 rounded-[26px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4">
          <div className="flex gap-3">
            <Sparkles size={20} className="text-[var(--imc-indigo-text)]" />

            <div>
              <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                Increase responses
              </h3>

              <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                Clearly explain what you are building and who you are looking
                for.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={18} className="text-[var(--imc-indigo-text)]" />
            <p className="text-[13px] font-black">Preview</p>
          </div>

          {(imagePreview || image) && (
            <img
              src={imagePreview || image}
              alt="Project preview"
              className="mt-4 h-36 w-full rounded-[22px] object-cover"
            />
          )}

          <h3 className="mt-4 text-[16px] font-black text-[var(--imc-text)]">
            {projectName || "IMCircle"}
          </h3>

          <p className="mt-2 text-[13px] leading-6 text-[var(--imc-text-muted)]">
            {description || "Building a growth network for ambitious people."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(skillList.length ? skillList : ["React"]).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[var(--imc-surface-2)] px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[12px] font-black text-[var(--imc-text)]">
            <Target size={15} />
            {goal || "Launch MVP"}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[12px] font-black text-[var(--imc-text)]">
            <Users size={15} />
            Looking for collaborators
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-[15px] font-black text-white shadow-[0_16px_36px_rgba(91,45,255,0.25)] active:scale-[0.98] disabled:opacity-60"
        >
          <Send size={18} />
          {loading ? "Publishing..." : uploading ? "Uploading..." : "Publish Project"}
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

function Label({ title }) {
  return <p className="text-[13px] font-black text-[var(--imc-text)]">{title}</p>;
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <Label title={label} />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl bg-[var(--imc-surface-2)] px-4 text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
      />
    </div>
  );
}

export default CreateProject;