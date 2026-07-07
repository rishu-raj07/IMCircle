import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Clock,
  IndianRupee,
  MapPin,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatType(type = "") {
  const map = {
    job: "Job",
    freelance: "Freelance",
    internship: "Internship",
    "founder-hiring": "Co-founder",
  };

  return map[type] || "Opportunity";
}

function formatWorkMode(mode = "") {
  const map = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };

  return map[mode] || "Flexible";
}

function formatSalary(min, max) {
  if (!min && !max) return "Not disclosed";
  if (min && max) return `₹${min} - ₹${max}`;
  if (min) return `From ₹${min}`;
  return `Up to ₹${max}`;
}

function formatDate(date) {
  if (!date) return "Recently";

  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();

  const creator = opportunity?.creator || {};

  const title = opportunity?.title || "Untitled Opportunity";
  const company =
    opportunity?.companyName ||
    opportunity?.company ||
    creator?.fullName ||
    "IMCircle Member";

  const location = opportunity?.location || "Remote";
  const type = formatType(opportunity?.type);
  const workMode = formatWorkMode(opportunity?.workMode);
  const salary = formatSalary(opportunity?.salaryMin, opportunity?.salaryMax);
  const posted = formatDate(opportunity?.createdAt);
  const applicants = `${opportunity?.applicationsCount || 0} applicants`;

  const skills =
    opportunity?.skills ||
    opportunity?.requiredSkills ||
    opportunity?.tags ||
    [];

  const id = opportunity?._id || opportunity?.id;

  return (
    <article className="rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ECEBF9] to-[#ECEBF9] text-[var(--imc-indigo-text)]">
          <BriefcaseBusiness size={23} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-[15px] font-black leading-5 text-[var(--imc-text)]">
                {title}
              </h2>

              <p className="mt-1 flex items-center gap-1 truncate text-[12px] font-bold text-[var(--imc-text-muted)]">
                <Building2 size={13} />
                {company}
              </p>
            </div>

            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)] active:scale-95">
              <Bookmark size={17} />
            </button>
          </div>

          <p className="mt-2 flex items-center gap-1 text-[11px] font-black text-[#059669]">
            <ShieldCheck size={14} />
            Verified opportunity
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Info icon={<MapPin size={14} />} text={location} />
            <Info icon={<Clock size={14} />} text={`${type} · ${workMode}`} />
            <Info icon={<IndianRupee size={14} />} text={salary} />
            <Info icon={<BriefcaseBusiness size={14} />} text={applicants} />
          </div>

          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[var(--imc-surface-2)] px-3 py-1.5 text-[10px] font-black text-[var(--imc-indigo-text)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
              Posted {posted}
            </p>

            <button
              onClick={() => navigate(id ? `/job-details/${id}` : "/job-details")}
              className="flex items-center gap-2 rounded-2xl bg-[#4338CA] px-4 py-3 text-[12px] font-black text-white active:scale-95"
            >
              View
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ icon, text }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-[var(--imc-surface-2)] px-2.5 py-2 text-[10.5px] font-bold text-[var(--imc-text-muted)]">
      <span className="shrink-0 text-[var(--imc-indigo-text)]">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

export default OpportunityCard;