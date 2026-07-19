import { useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  IndianRupee,
  MapPin,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { createOpportunity } from "../../api/opportunityApi";

const workModes = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];

const experienceLevels = [
  { label: "Fresher", value: "fresher" },
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
];

const employmentTypes = [
  { label: "Full-time", value: "job" },
  { label: "Internship", value: "internship" },
  { label: "Freelance", value: "freelance" },
  { label: "Founder Hiring", value: "founder-hiring" },
];

function CreateJob() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    companyName: "",
    location: "",
    type: "job",
    workMode: "remote",
    experienceLevel: "fresher",
    salaryMin: "",
    salaryMax: "",
    description: "",
    skills: [],
  });

  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSkill = () => {
    const skill = skillInput.trim();

    if (!skill) return;

    if (form.skills.includes(skill)) {
      setSkillInput("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      skills: [...prev.skills, skill],
    }));

    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((item) => item !== skill),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }

    if (!form.description.trim()) {
      alert("Description is required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      };

      const data = await createOpportunity(payload);

      navigate(`/job-details/${data?.opportunity?._id || ""}`);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to create opportunity. Please try again."
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
            Hire Talent
          </h1>

          <div className="h-10 w-10" />
        </div>
      </div>

      <main className="px-4 pt-5">
        <div className="mb-6">
          <h2 className="text-[24px] font-black leading-tight text-[var(--imc-text)]">
            Create a hiring post
          </h2>

          <p className="mt-2 text-[14px] font-semibold leading-relaxed text-[var(--imc-text-muted)]">
            Share what you need and let the right people apply.
          </p>
        </div>

        <section className="space-y-4 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <InputField
            icon={<BriefcaseBusiness size={18} />}
            label="Role title"
            placeholder="Frontend Developer Intern"
            value={form.title}
            onChange={(value) => updateForm("title", value)}
          />

          <InputField
            icon={<Building2 size={18} />}
            label="Company / startup name"
            placeholder="IMCircle"
            value={form.companyName}
            onChange={(value) => updateForm("companyName", value)}
          />

          <InputField
            icon={<MapPin size={18} />}
            label="Location"
            placeholder="Remote, Delhi, Bengaluru..."
            value={form.location}
            onChange={(value) => updateForm("location", value)}
          />

          <div>
            <Label title="Opportunity type" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {employmentTypes.map((item) => (
                <ChipButton
                  key={item.value}
                  active={form.type === item.value}
                  label={item.label}
                  onClick={() => updateForm("type", item.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label title="Work mode" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {workModes.map((item) => (
                <ChipButton
                  key={item.value}
                  active={form.workMode === item.value}
                  label={item.label}
                  onClick={() => updateForm("workMode", item.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label title="Experience level" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {experienceLevels.map((item) => (
                <ChipButton
                  key={item.value}
                  active={form.experienceLevel === item.value}
                  label={item.label}
                  onClick={() => updateForm("experienceLevel", item.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label title="Pay range" />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <MoneyInput
                placeholder="Min"
                value={form.salaryMin}
                onChange={(value) => updateForm("salaryMin", value)}
              />
              <MoneyInput
                placeholder="Max"
                value={form.salaryMax}
                onChange={(value) => updateForm("salaryMax", value)}
              />
            </div>
          </div>

          <div>
            <Label title="Required skills" />
            <div className="mt-2 flex h-12 items-center gap-2 rounded-2xl bg-[var(--imc-surface-2)] px-4">
              <Sparkles size={17} className="text-[var(--imc-indigo-text)]" />
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="React, Sales, Design..."
                className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <button
                type="button"
                onClick={addSkill}
                className="text-[12px] font-black text-[var(--imc-indigo-text)]"
              >
                Add
              </button>
            </div>

            {form.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => removeSkill(skill)}
                    className="flex items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]"
                  >
                    {skill}
                    <X size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label title="Description" />
            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Explain the role, responsibilities, requirements and why someone should apply..."
              className="mt-2 min-h-[170px] w-full resize-none rounded-[24px] bg-[var(--imc-surface-2)] p-4 text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>
        </section>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-[15px] font-black text-white shadow-[0_16px_36px_rgba(91,45,255,0.25)] active:scale-[0.98] disabled:opacity-60"
        >
          <Send size={18} />
          {loading ? "Posting..." : "Post Opportunity"}
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

function Label({ title }) {
  return <p className="text-[13px] font-black text-[var(--imc-text)]">{title}</p>;
}

function InputField({ icon, label, placeholder, value, onChange }) {
  return (
    <div>
      <Label title={label} />
      <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
        <div className="text-[var(--imc-indigo-text)]">{icon}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
        />
      </div>
    </div>
  );
}

function MoneyInput({ placeholder, value, onChange }) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--imc-surface-2)] px-4">
      <IndianRupee size={16} className="text-[var(--imc-indigo-text)]" />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
      />
    </div>
  );
}

function ChipButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-3 text-[12px] font-black ${
        active
          ? "bg-[#4338CA] text-white"
          : "bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

export default CreateJob;