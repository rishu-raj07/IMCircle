import { useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Link,
  MapPin,
  Send,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function Apply() {
  const navigate = useNavigate();

  const [coverNote, setCoverNote] = useState("");
  const [portfolio, setPortfolio] = useState("");

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
                Apply
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                Send a strong application
              </p>
            </div>

            <div className="h-11 w-11" />
          </div>
        </div>

        <main className="px-5 py-5">
          <section className="rounded-[32px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl shadow-purple-200">
            <div className="flex gap-3">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-3xl bg-white/15 p-3">
                <Briefcase size={27} />
              </div>

              <div className="flex-1">
                <h2 className="text-[20px] font-black leading-6">
                  Frontend Developer Intern
                </h2>

                <p className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-white/75">
                  <Building2 size={14} />
                  IMCircle Creators
                </p>

                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-white/65">
                  <MapPin size={14} />
                  Remote · Internship
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniInfo label="Match" value="86%" />
              <MiniInfo label="Applicants" value="42" />
              <MiniInfo label="Deadline" value="3d" />
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#059669]">
                <Sparkles size={21} />
              </div>

              <div>
                <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                  Smart Apply
                </h3>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                  Your profile, skills and journey updates will be attached with
                  this application.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Your application
            </h2>

            <div className="mt-4 flex gap-3 rounded-[24px] bg-[var(--imc-surface-2)] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                <User size={24} />
              </div>

              <div className="flex-1">
                <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                  Rishu Raj
                </h3>
                <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
                  Founder · Frontend Learner · Startup Builder
                </p>

                <button
                  onClick={() => navigate("/profile-setup")}
                  className="mt-2 text-[12px] font-black text-[var(--imc-indigo-text)]"
                >
                  Improve profile
                </button>
              </div>
            </div>

            <label className="mt-5 block text-[13px] font-black text-[var(--imc-text)]">
              Why are you a good fit?
            </label>

            <textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Write a short note about your skills, proof of work and why you want this opportunity..."
              className="mt-2 min-h-[150px] w-full resize-none rounded-[24px] bg-[var(--imc-surface-2)] p-4 text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />

            <label className="mt-5 block text-[13px] font-black text-[var(--imc-text)]">
              Portfolio / work link
            </label>

            <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
              <Link size={18} className="text-[var(--imc-indigo-text)]" />
              <input
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="GitHub, Behance, website or project link"
                className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
              />
            </div>

            <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-indigo-text)]">
              <Upload size={17} />
              Upload resume / document
            </button>
          </section>

          <section className="mt-5 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h2 className="text-[15px] font-black text-[var(--imc-text)]">
              Attached proof
            </h2>

            <div className="mt-4 space-y-3">
              <ProofItem title="Profile strength" value="86% complete" />
              <ProofItem title="Skills" value="React, JavaScript, UI Design" />
              <ProofItem title="Journey" value="Day 32 of building IMCircle" />
              <ProofItem title="Projects" value="3 portfolio projects" />
            </div>
          </section>

          <section className="mt-5 rounded-[28px] bg-[#12141C] p-4 text-white shadow-xl">
            <div className="flex gap-3">
              <CheckCircle2 size={21} className="text-[#059669]" />
              <div>
                <h3 className="text-[14px] font-black">
                  Before you apply
                </h3>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-white/65">
                  Keep your application real. Fake claims can reduce your trust
                  score and verification status.
                </p>
              </div>
            </div>
          </section>

          <button className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-[15px] font-black text-white shadow-xl shadow-purple-200 active:scale-[0.98]">
            <Send size={18} />
            Submit Application
          </button>
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

function ProofItem({ title, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        <FileText size={17} />
      </div>

      <div className="flex-1">
        <h3 className="text-[12px] font-black text-[var(--imc-text)]">{title}</h3>
        <p className="text-[11px] font-semibold text-[var(--imc-text-muted)]">{value}</p>
      </div>
    </div>
  );
}

export default Apply;