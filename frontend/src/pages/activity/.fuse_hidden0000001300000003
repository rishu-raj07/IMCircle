import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  MapPin,
  MoreHorizontal,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function MyApplications() {
  const navigate = useNavigate();

  const tabs = ["All", "Applied", "Reviewing", "Shortlisted", "Rejected"];

  const applications = [
    {
      company: "IMCircle Creators",
      role: "Frontend Developer Intern",
      location: "Remote",
      status: "Reviewing",
      time: "Applied 2h ago",
      icon: <Eye size={17} />,
    },
    {
      company: "Delhi Events Co.",
      role: "Graphic Designer",
      location: "Delhi NCR",
      status: "Shortlisted",
      time: "Applied yesterday",
      icon: <CheckCircle2 size={17} />,
    },
    {
      company: "SkillRise India",
      role: "Social Media Manager",
      location: "Noida",
      status: "Applied",
      time: "Applied 2d ago",
      icon: <Clock size={17} />,
    },
    {
      company: "LocalJobs Hub",
      role: "Video Editor",
      location: "Gurugram",
      status: "Rejected",
      time: "Applied 5d ago",
      icon: <XCircle size={17} />,
    },
  ];

  const getStatusStyle = (status) => {
    if (status === "Shortlisted") {
      return "bg-[#ECFDF3] text-[#059669]";
    }

    if (status === "Reviewing") {
      return "bg-[#ECEBF9] text-[var(--imc-indigo-text)]";
    }

    if (status === "Rejected") {
      return "bg-[#FEF3F2] text-[#D92D20]";
    }

    return "bg-[#ECEBF9] text-[var(--imc-indigo-text)]";
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={21} />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              My Applications
            </h1>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]">
              <MoreHorizontal size={21} />
            </button>
          </div>

          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
            <Search size={19} className="text-[var(--imc-text-muted)]" />
            <input
              placeholder="Search applications..."
              className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>

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

        <div className="px-5 py-5">
          <div className="mb-5 grid grid-cols-3 gap-3">
            <StatCard label="Applied" value="12" />
            <StatCard label="Reviewing" value="4" />
            <StatCard label="Shortlisted" value="2" />
          </div>

          <div className="space-y-4">
            {applications.map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                    <Briefcase size={21} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] font-black text-[var(--imc-text)]">
                          {item.role}
                        </h3>

                        <div className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                          <Building2 size={14} />
                          <span>{item.company}</span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${getStatusStyle(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {item.location}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {item.time}
                      </span>
                    </div>

                    <button className="mt-4 flex h-10 w-full items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-indigo-text)]">
                      View Application
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--imc-surface-2)] p-3 text-center">
      <h3 className="text-[18px] font-black text-[var(--imc-text)]">{value}</h3>
      <p className="text-[11px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

export default MyApplications;