import {
  Rocket,
  Users,
  Clock3,
  MapPin,
  BriefcaseBusiness,
  ArrowRight,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MARIGOLD_DARK = "#8A5A12";

function ProjectCard({
  item = null,
  title = "IMCircle",
  founder = "Rishu Raj",
  category = "Professional Network",
  location = "Delhi, India",
  status = "Building MVP",
  days = "32",
  builders = "3",
  openRoles = "UI Designer",
  goal = "Launch beta in 60 days",
  description = "Building a mobile-first opportunity network for India where people can post real journeys, find work, connect and grow professionally.",
}) {
  const navigate = useNavigate();
  const project = item || {};
  const creator = project.creator || project.author || {};
  const finalTitle = project.title || title;
  const finalFounder = creator.fullName || creator.name || creator.username || founder;
  const finalCategory = project.category || category;
  const finalLocation =
    project.location ||
    creator.location?.city ||
    creator.location?.state ||
    location;
  const finalStatus = project.stage || project.status || status;
  const finalDays = project.days || project.updatesCount || days;
  const finalBuilders = project.buildersCount || project.followersCount || builders;
  const finalOpenRoles = Array.isArray(project.openRoles)
    ? project.openRoles.join(", ")
    : project.openRoles || openRoles;
  const finalGoal = project.goal || project.currentGoal || goal;
  const finalDescription = project.description || description;
  const projectId = project._id || project.id;

  return (
    <article className="imc-enter px-4 py-4" style={{ background: "var(--imc-surface)", borderBottom: "1px solid var(--imc-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
            style={{ background: "var(--imc-surface-2)", color: MARIGOLD_DARK }}
          >
            <Rocket size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
                style={{ background: "#FDF3E3", color: MARIGOLD_DARK }}
              >
                Project
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--imc-text-faint)]">
                {finalStatus}
              </span>
            </div>

            <h2 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-5 text-[var(--imc-text)]">
              {finalTitle}
            </h2>

            <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
              by {finalFounder}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-[13px] font-semibold leading-6 text-[var(--imc-text-muted)]">
        {finalDescription}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <InfoPill icon={BriefcaseBusiness} text={finalCategory} />
        <InfoPill icon={MapPin} text={finalLocation} />
        <InfoPill icon={Clock3} text={`${finalDays} days`} />
        <InfoPill icon={Users} text={`${finalBuilders} builders`} />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-[16px] px-3 py-2.5" style={{ border: "1px solid var(--imc-border)" }}>
        <Target size={15} className="mt-0.5 shrink-0 text-[var(--imc-text-faint)]" />
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[var(--imc-text)]">Current goal</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--imc-text-muted)]">
            {finalGoal}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--imc-text-faint)]">
            Open role
          </p>
          <p className="truncate text-[12px] font-black text-[var(--imc-text)]">
            {finalOpenRoles}
          </p>
        </div>

        <button
          onClick={() => navigate(projectId ? "/my-projects" : "/create-project")}
          className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-black active:scale-95"
          style={{ background: "var(--imc-surface-strong)", color: "var(--imc-on-surface-strong)" }}
        >
          View Project
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function InfoPill({ icon: Icon, text }) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-[var(--imc-text-muted)]"
      style={{ border: "1px solid var(--imc-border)" }}
    >
      <Icon size={13} className="shrink-0 text-[var(--imc-text-faint)]" />
      <span className="truncate">{text}</span>
    </div>
  );
}

export default ProjectCard;
