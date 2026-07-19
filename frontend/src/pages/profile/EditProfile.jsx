import { useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  FileText,
  Globe2,
  Link,
  MapPin,
  Save,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function EditProfile() {
  const navigate = useNavigate();

  const [name, setName] = useState("Rishu Raj");
  const [headline, setHeadline] = useState("Founder · Building IMCircle");
  const [location, setLocation] = useState("Delhi, India");
  const [role, setRole] = useState("Founder");
  const [skills, setSkills] = useState("React, Startup, Marketing, UI Design");
  const [about, setAbout] = useState(
    "Building IMCircle, a professional opportunity network for India."
  );
  const [openToWork, setOpenToWork] = useState(true);
  const [cofounder, setCofounder] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">
              <h1 className="text-[19px] font-black text-[var(--imc-text)]">
                Edit Profile
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                Keep your identity updated
              </p>
            </div>

            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4338CA] text-white shadow-sm">
              <Save size={19} />
            </button>
          </div>
        </div>

        <main className="px-5 py-5">
          <section className="rounded-[32px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl shadow-purple-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/15">
                  <User size={38} />
                </div>

                <button className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-lg">
                  <Camera size={16} />
                </button>
              </div>

              <div className="flex-1">
                <h2 className="text-[22px] font-black">{name}</h2>
                <p className="mt-1 text-[12px] font-semibold text-white/75">
                  {headline}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-white/60">
                  {location}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Basic Information
            </h2>

            <InputField
              icon={<User />}
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Your name"
            />

            <InputField
              icon={<Briefcase />}
              label="Headline"
              value={headline}
              onChange={setHeadline}
              placeholder="Founder, Designer, Developer..."
            />

            <InputField
              icon={<MapPin />}
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="Delhi, India"
            />

            <InputField
              icon={<Sparkles />}
              label="Role"
              value={role}
              onChange={setRole}
              placeholder="Student, Founder, Freelancer..."
            />
          </section>

          <section className="mt-5 rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Skills & About
            </h2>

            <InputField
              icon={<Sparkles />}
              label="Skills"
              value={skills}
              onChange={setSkills}
              placeholder="React, Sales, Design..."
            />

            <label className="mt-4 block text-[13px] font-black text-[var(--imc-text)]">
              About
            </label>

            <div className="mt-2 flex min-h-[130px] gap-3 rounded-[24px] bg-[var(--imc-surface-2)] px-4 py-4">
              <FileText size={19} className="mt-1 shrink-0 text-[var(--imc-indigo-text)]" />
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write about yourself..."
                className="w-full resize-none bg-transparent text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
            </div>
          </section>

          <section className="mt-5 rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Availability
            </h2>

            <ToggleItem
              icon={<Briefcase />}
              title="Open to Work"
              subtitle="Show recruiters that you are open for jobs or gigs"
              checked={openToWork}
              onClick={() => setOpenToWork(!openToWork)}
            />

            <ToggleItem
              icon={<Users />}
              title="Open for Co-founder"
              subtitle="Let founders know you are open to build together"
              checked={cofounder}
              onClick={() => setCofounder(!cofounder)}
            />
          </section>

          <section className="mt-5 rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Links
            </h2>

            <InputField
              icon={<Globe2 />}
              label="Website"
              value=""
              onChange={() => {}}
              placeholder="https://yourwebsite.com"
            />

            <InputField
              icon={<Link />}
              label="Portfolio / GitHub"
              value=""
              onChange={() => {}}
              placeholder="Project, GitHub, Behance link"
            />
          </section>

          <button
            onClick={() => navigate("/profile")}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-[15px] font-black text-white shadow-xl shadow-purple-200 active:scale-[0.98]"
          >
            <Save size={18} />
            Save Changes
          </button>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function InputField({ icon, label, value, onChange, placeholder }) {
  return (
    <div className="mt-4">
      <label className="text-[13px] font-black text-[var(--imc-text)]">
        {label}
      </label>

      <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
        <span className="text-[var(--imc-indigo-text)]">{icon}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
        />
      </div>
    </div>
  );
}

function ToggleItem({ icon, title, subtitle, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 flex w-full items-center gap-3 rounded-[24px] bg-[var(--imc-surface-2)] p-4 text-left"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-[14px] font-black text-[var(--imc-text)]">{title}</h3>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[var(--imc-text-muted)]">
          {subtitle}
        </p>
      </div>

      <div
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
          checked ? "bg-[#4338CA]" : "bg-[rgba(18,20,28,0.14)]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-[var(--imc-surface)] transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

export default EditProfile;