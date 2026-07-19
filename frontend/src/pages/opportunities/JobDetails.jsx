import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function JobDetails() {
  const navigate = useNavigate();

  const skills = ["React", "JavaScript", "Tailwind CSS", "UI Design"];

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

            <h1 className="text-[19px] font-black text-[var(--imc-text)]">
              Opportunity
            </h1>

            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm">
              <Share2 size={20} className="text-[var(--imc-indigo-text)]" />
            </button>
          </div>
        </div>

        <main className="px-5 py-5">
          <section className="rounded-[32px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl shadow-purple-200">
            <div className="flex gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/15">
                <Briefcase size={28} />
              </div>

              <div className="flex-1">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black">
                  Internship
                </span>

                <h2 className="mt-3 text-[23px] font-black leading-7">
                  Frontend Developer Intern
                </h2>

                <p className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-white/75">
                  <Building2 size={14} />
                  IMCircle Creators
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniInfo label="Match" value="86%" />
              <MiniInfo label="Applicants" value="42" />
              <MiniInfo label="Deadline" value="3d" />
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3">
            <InfoCard icon={<MapPin />} label="Location" value="Remote" />
            <InfoCard icon={<Clock />} label="Type" value="Internship" />
            <InfoCard icon={<IndianRupee />} label="Stipend" value="₹8k - ₹15k" />
            <InfoCard icon={<Users />} label="Openings" value="2 Positions" />
          </section>

          <section className="mt-5 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#059669]">
                <Sparkles size={21} />
              </div>

              <div>
                <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                  Why this matches you
                </h3>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                  Your React, startup building and UI skills match this
                  opportunity strongly.
                </p>
              </div>
            </div>
          </section>

          <Section title="About the role">
            <p className="text-[13px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              We are looking for a frontend intern who can build clean,
              mobile-first interfaces using React and Tailwind CSS. You will
              work on real product screens and improve user experience.
            </p>
          </Section>

          <Section title="Responsibilities">
            <Bullet text="Build responsive React components." />
            <Bullet text="Convert UI ideas into clean frontend pages." />
            <Bullet text="Improve mobile user experience." />
            <Bullet text="Collaborate with founders and designers." />
          </Section>

          <Section title="Required skills">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[var(--imc-surface-2)] px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Company">
            <div className="flex gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#12141C] p-3 text-[18px] font-black text-white">
                B
              </div>

              <div className="flex-1">
                <h3 className="text-[15px] font-black text-[var(--imc-text)]">
                  IMCircle Creators
                </h3>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                  Building tools and opportunities for IMCircle&apos;s young
                  creators and professionals.
                </p>

                <div className="mt-3 flex items-center gap-2 text-[11px] font-black text-[#059669]">
                  <ShieldCheck size={15} />
                  Verified organization
                </div>
              </div>
            </div>
          </Section>

          <section className="mt-5 rounded-[28px] bg-[#12141C] p-4 text-white shadow-xl">
            <div className="flex gap-3">
              <CheckCircle2 size={21} className="text-[#059669]" />
              <div>
                <h3 className="text-[14px] font-black">Apply with proof</h3>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-white/65">
                  Your profile, skills, projects and journey updates can help
                  you stand out more than a normal resume.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-5 flex gap-3">
            <button className="flex h-14 w-14 items-center justify-center rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm">
              <Bookmark size={21} />
            </button>

            <button
              onClick={() => navigate("/apply")}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-[15px] font-black text-white shadow-xl shadow-purple-200 active:scale-[0.98]"
            >
              <Send size={18} />
              Apply Now
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/12 p-3 text-center">
      <h3 className="text-[14px] font-black">{value}</h3>
      <p className="text-[10px] font-bold text-white/60">{label}</p>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>
      <p className="mt-3 text-[11px] font-bold text-[var(--imc-text-faint)]">{label}</p>
      <h3 className="mt-0.5 text-[13px] font-black text-[var(--imc-text)]">
        {value}
      </h3>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-5 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
      <h2 className="mb-3 text-[15px] font-black text-[var(--imc-text)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet({ text }) {
  return (
    <div className="mb-2 flex gap-2 last:mb-0">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4338CA]" />
      <p className="text-[13px] font-semibold leading-6 text-[var(--imc-text-muted)]">
        {text}
      </p>
    </div>
  );
}

export default JobDetails;