import {
  ArrowLeft,
  Users,
  Briefcase,
  Plus,
  MoreHorizontal,
  Search,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function MyProjects() {
  const navigate = useNavigate();

  const tabs = ["All", "Active", "Completed", "Hiring"];

  const projects = [
    {
      name: "IMCircle",
      role: "Founder",
      progress: 72,
      team: 3,
      openings: "UI Designer",
      status: "Active",
      created: "Jan 2026",
    },
    {
      name: "Serveasily",
      role: "Founder",
      progress: 100,
      team: 2,
      openings: "-",
      status: "Completed",
      created: "Dec 2025",
    },
    {
      name: "Nighttout",
      role: "Co-Founder",
      progress: 40,
      team: 3,
      openings: "-",
      status: "Paused",
      created: "Apr 2026",
    },
  ];

  const getStatusColor = (status) => {
    if (status === "Active") {
      return "bg-[#ECFDF3] text-[#059669]";
    }

    if (status === "Completed") {
      return "bg-[#ECEBF9] text-[var(--imc-indigo-text)]";
    }

    return "bg-[#FEF3F2] text-[#D92D20]";
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] pb-28">
        {/* Header */}
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              My Projects
            </h1>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
            <Search size={18} className="text-[var(--imc-text-muted)]" />
            <input
              placeholder="Search projects..."
              className="w-full bg-transparent text-[14px] outline-none"
            />
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-black ${
                  index === 0
                    ? "bg-[#4338CA] text-white"
                    : "bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <StatCard value="3" label="Projects" />
          <StatCard value="5" label="Team Members" />
          <StatCard value="1" label="Open Roles" />
          <StatCard value="1" label="Completed" />
        </div>

        {/* Projects */}
        <div className="space-y-4 px-5">
          {projects.map((project, index) => (
            <div
              key={index}
              className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[16px] font-black text-[var(--imc-text)]">
                    {project.name}
                  </h2>

                  <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                    {project.role}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${getStatusColor(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} />
                  Progress: {project.progress}%
                </div>

                <div className="flex items-center gap-2">
                  <Users size={15} />
                  Team Members: {project.team}
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase size={15} />
                  Open Role: {project.openings}
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  Created: {project.created}
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button className="flex-1 rounded-2xl bg-[var(--imc-surface-2)] py-3 text-[13px] font-black text-[var(--imc-indigo-text)]">
                  View Project
                </button>

                <button className="flex-1 rounded-2xl border border-[rgba(18,20,28,0.08)] py-3 text-[13px] font-black text-[var(--imc-text)]">
                  Edit Project
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Project Button */}
        <div className="fixed bottom-24 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 px-5">
          <button
            onClick={() => navigate("/create-project")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[#4338CA] text-white shadow-xl"
          >
            <Plus size={20} />
            <span className="font-black">Create Project</span>
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-3xl bg-[var(--imc-surface-2)] p-4 text-center">
      <h3 className="text-[22px] font-black text-[var(--imc-text)]">{value}</h3>
      <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

export default MyProjects;