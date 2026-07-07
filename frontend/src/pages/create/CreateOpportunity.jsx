import {
  ArrowLeft,
  BriefcaseBusiness,
  Rocket,
  UsersRound,
  Handshake,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function CreateOpportunity() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] pb-24">
      <div className="sticky top-0 z-20 border-b border-[rgba(18,20,28,0.08)] bg-white/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-[17px] font-black text-[var(--imc-text)]">
            Create Opportunity
          </h1>

          <div className="h-10 w-10" />
        </div>
      </div>

      <main className="px-4 pt-6">
        <div className="mb-6">
          <h2 className="text-[24px] font-black leading-tight text-[var(--imc-text)]">
            What do you want to create?
          </h2>

          <p className="mt-2 max-w-[310px] text-[14px] font-semibold leading-relaxed text-[var(--imc-text-muted)]">
            Choose how you'd like to help someone grow.
          </p>
        </div>

        <div className="space-y-3">
          <OpportunityCard
            icon={<BriefcaseBusiness size={23} />}
            title="Hire Talent"
            subtitle="Find the right people for your team"
            onClick={() => navigate("/create-job")}
          />

          <OpportunityCard
            icon={<Rocket size={23} />}
            title="Start a Project"
            subtitle="Build something meaningful together"
            onClick={() => navigate("/create-project")}
          />

          <OpportunityCard
            icon={<UsersRound size={23} />}
            title="Create Circle"
            subtitle="Create a community around an idea"
            onClick={() => navigate("/create-circle")}
          />

          <OpportunityCard
            icon={<Handshake size={23} />}
            title="Find Co-founder"
            subtitle="Meet someone to build your startup"
            onClick={() => navigate("/create-cofounder")}
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function OpportunityCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[26px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.035)] transition active:scale-[0.985]"
    >
      <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-[#ECEBF9] to-[#ECEBF9] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-black text-[var(--imc-text)]">
          {title}
        </h3>

        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[var(--imc-text-muted)]">
          {subtitle}
        </p>
      </div>

      <ChevronRight size={19} className="text-[var(--imc-text-faint)]" />
    </button>
  );
}

export default CreateOpportunity;