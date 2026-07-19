import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import OpportunityCard from "../../components/opportunity/OpportunityCard";
import OpportunityTabs from "../../components/opportunity/OpportunityTabs";
import { getOpportunities } from "../../api/opportunityApi";

const filters = [
  { label: "All", value: "" },
  { label: "Jobs", value: "job" },
  { label: "Internships", value: "internship" },
  { label: "Freelance", value: "freelance" },
  { label: "Co-founder", value: "founder-hiring" },
];

function Opportunities() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Recommended");
  const [activeType, setActiveType] = useState("");
  const [search, setSearch] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOpportunities = async () => {
    try {
      setLoading(true);

      const data = await getOpportunities({
        type: activeType || undefined,
        search: search.trim() || undefined,
        page: 1,
        limit: 30,
      });

      setOpportunities(data?.opportunities || []);
    } catch (error) {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [activeType]);

  const visibleOpportunities = useMemo(() => {
    if (activeTab === "Recent") {
      return [...opportunities].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    return opportunities;
  }, [opportunities, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOpportunities();
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] pb-24">
      <div className="border-b border-[var(--imc-border)] bg-white/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-black text-[var(--imc-text)]">
              Opportunities
            </h1>
            <p className="text-[11px] font-semibold text-[var(--imc-text-muted)]">
              Find work, projects and people to build with.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/messages")}>
              <MessageCircle size={20} className="text-[var(--imc-text)]" />
            </button>

            <button
              onClick={() => navigate("/notifications")}
              className="relative"
            >
              <Bell size={20} className="text-[var(--imc-text)]" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#4338CA]" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
          <div className="flex h-[44px] flex-1 items-center gap-2 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-3">
            <Search size={17} className="text-[var(--imc-text-muted)]" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search role, skill, startup..."
              className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>

          <button
            type="submit"
            className="flex h-[44px] items-center gap-1.5 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-3 text-[11px] font-black text-[var(--imc-indigo-text)]"
          >
            <SlidersHorizontal size={15} />
            Search
          </button>
        </form>
      </div>

      <main className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <OpportunityTabs activeTab={activeTab} onChange={setActiveTab} />

          <button
            onClick={() => navigate("/create-opportunity")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white shadow-[0_12px_24px_rgba(91,45,255,0.22)] active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        <section className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => {
            const active = activeType === filter.value;

            return (
              <button
                key={filter.label}
                onClick={() => setActiveType(filter.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black ${
                  active
                    ? "bg-[#12141C] text-white"
                    : "border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text-muted)]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat
            icon={<Briefcase size={17} />}
            value={opportunities.length}
            label="Open"
          />
          <MiniStat
            icon={<Sparkles size={17} />}
            value="New"
            label="Matches"
          />
          <MiniStat
            icon={<UsersRound size={17} />}
            value="Apply"
            label="With profile"
          />
        </section>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[var(--imc-text)]">
            {activeTab === "Recent" ? "Recent Opportunities" : "Recommended"}
          </h2>

          <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
            {visibleOpportunities.length} found
          </p>
        </div>

        <section className="mt-3 space-y-3">
          {loading ? (
            <LoadingState />
          ) : visibleOpportunities.length > 0 ? (
            visibleOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity._id}
                opportunity={opportunity}
              />
            ))
          ) : (
            <EmptyState navigate={navigate} />
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.025)]">
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <h3 className="mt-3 text-[15px] font-black text-[var(--imc-text)]">{value}</h3>
      <p className="text-[10px] font-bold text-[var(--imc-text-muted)]">{label}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)]"
        />
      ))}
    </div>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        <GraduationCap size={26} />
      </div>

      <h3 className="mt-4 text-[16px] font-black text-[var(--imc-text)]">
        No opportunities yet
      </h3>

      <p className="mt-2 text-[13px] font-semibold leading-5 text-[var(--imc-text-muted)]">
        Create the first opportunity and help someone grow.
      </p>

      <button
        onClick={() => navigate("/create-opportunity")}
        className="mt-4 rounded-2xl bg-[#4338CA] px-5 py-3 text-[13px] font-black text-white"
      >
        Create Opportunity
      </button>
    </div>
  );
}

export default Opportunities;