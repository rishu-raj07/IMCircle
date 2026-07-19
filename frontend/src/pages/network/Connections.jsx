import {
  ArrowLeft,
  Search,
  Users,
  MessageCircle,
  UserMinus,
  MapPin,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function Connections() {
  const navigate = useNavigate();

  const connections = [
    {
      name: "Ananya Joshi",
      role: "Makeup Artist",
      location: "Delhi NCR",
      mutual: "12 mutual connections",
      initial: "A",
    },
    {
      name: "Karan Singh",
      role: "Decorator",
      location: "Noida",
      mutual: "8 mutual connections",
      initial: "K",
    },
    {
      name: "Priya Sharma",
      role: "Graphic Designer",
      location: "Remote",
      mutual: "18 mutual connections",
      initial: "P",
    },
    {
      name: "Rahul Verma",
      role: "Frontend Developer",
      location: "Gurugram",
      mutual: "6 mutual connections",
      initial: "R",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 pb-4 pt-2 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">
              <h1 className="text-[19px] font-black text-[var(--imc-text)]">
                Connections
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                People in your network
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm">
              <Users size={21} />
            </div>
          </div>

          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface)] px-4 shadow-sm">
            <Search size={18} className="text-[var(--imc-text-muted)]" />
            <input
              placeholder="Search connections..."
              className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>
        </div>

        <main className="px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard value="324" label="Connections" />
            <StatCard value="48" label="Active" />
            <StatCard value="21" label="Nearby" />
          </div>

          <div className="mt-5 rounded-[30px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl shadow-purple-200">
            <h2 className="text-[21px] font-black">Grow real network</h2>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-white/75">
              Connect with people who can help you build, hire, learn and grow.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {connections.map((person) => (
              <div
                key={person.name}
                className="rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[20px] font-black text-[var(--imc-indigo-text)]">
                    {person.initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-black text-[var(--imc-text)]">
                      {person.name}
                    </h3>

                    <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                      <Briefcase size={13} />
                      {person.role}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                      <MapPin size={13} />
                      {person.location}
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-[var(--imc-indigo-text)]">
                      {person.mutual}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => navigate("/chat")}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4338CA] text-[13px] font-black text-white"
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>

                  <button className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text-muted)]">
                    <UserMinus size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-center shadow-sm">
      <h3 className="text-[20px] font-black text-[var(--imc-text)]">{value}</h3>
      <p className="text-[11px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

export default Connections;