import {
  Home,
  Compass,
  Plus,
  Users,
  User,
  PenLine,
  Rocket,
  X,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const MARIGOLD = "#EC9A1E";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const isActive = (path) => location.pathname === path;

  const goTo = (path) => {
    setShowCreate(false);
    navigate(path);
  };

  return (
    <>
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[3px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-[34px] px-5 pb-7 pt-5 shadow-2xl"
            style={{ background: "var(--imc-bg)" }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black"
                  style={{ background: "rgba(67,56,202,0.1)", color: "var(--imc-indigo-text)" }}
                >
                  <Sparkles size={13} />
                  IMCircle Builder Space
                </div>

                <h2
                  className="font-serif text-[22px] font-semibold leading-tight"
                  style={{ color: "var(--imc-text)" }}
                >
                  Share your next step
                </h2>

                <p
                  className="mt-1 max-w-[270px] text-[12px] font-semibold leading-5"
                  style={{ color: "var(--imc-text-muted)" }}
                >
                  Share progress, start a journey, or post your learning of
                  the day.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95"
                style={{
                  background: "var(--imc-surface)",
                  border: "1px solid var(--imc-border)",
                  color: "var(--imc-text)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <CreateOption
                icon={PenLine}
                title="Progress Update"
                subtitle="Share what you built or improved today"
                onClick={() => goTo("/create-post")}
              />

              <CreateOption
                icon={Rocket}
                title="Make New Journey"
                subtitle="Start your long-term progress story"
                highlight
                featured
                onClick={() => goTo("/create-journey")}
              />

              <CreateOption
                icon={BookOpen}
                title="Learning of the Day"
                subtitle="Share one thing you learned today"
                onClick={() => goTo("/create-learning")}
              />
            </div>
          </div>
        </div>
      )}

      {/*
        Flat, monochrome-first nav — deliberately NOT an elevated floating
        action button. Every item sits in the same row at the same weight;
        "Create" is told apart only by a small filled square, not by
        breaking out of the row. This is the one structural change most
        responsible for the app not reading as an Instagram clone.
      */}
      <div
        className="fixed bottom-0 left-1/2 z-40 flex min-h-[68px] w-full max-w-[430px] -translate-x-1/2 items-center justify-around px-2"
        style={{
          background: "var(--imc-surface)",
          borderTop: "1px solid var(--imc-border)",
          // On notched/gesture-bar phones (iPhone, many Android devices) a
          // fixed-position bottom bar without this sits under the home
          // indicator / gesture pill — env() resolves to 0 on devices
          // without a safe-area inset, so this is a no-op elsewhere.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <NavItem
          active={isActive("/home")}
          icon={Home}
          label="Home"
          onClick={() => navigate("/home")}
        />

        <NavItem
          active={isActive("/discover")}
          icon={Compass}
          label="Discover"
          onClick={() => navigate("/discover")}
        />

        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 active:scale-95"
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-[10px]"
            style={{
              background: "var(--imc-surface-strong)",
              border: "1px solid var(--imc-surface-strong-border)",
              color: MARIGOLD,
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </span>
          <span className="text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            Create
          </span>
        </button>

        <NavItem
          active={isActive("/network")}
          icon={Users}
          label="Network"
          onClick={() => navigate("/network")}
        />

        <NavItem
          active={isActive("/profile")}
          icon={User}
          label="Profile"
          onClick={() => navigate("/profile")}
        />
      </div>
    </>
  );
}

function CreateOption({ icon: Icon, title, subtitle, onClick, highlight, featured }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 text-left active:scale-[0.98] ${
        featured ? "rounded-[28px] p-4" : "rounded-[22px] p-3.5"
      }`}
      style={{
        border: highlight
          ? "1px solid rgba(236,154,30,0.18)"
          : "1px solid var(--imc-border)",
        background: highlight
          ? "linear-gradient(135deg, rgba(236,154,30,0.08), rgba(255,255,255,0.95))"
          : "var(--imc-surface)",
        boxShadow: featured ? "0 16px 34px rgba(236,154,30,0.12)" : "none",
      }}
    >
      <div
        className={`grid shrink-0 place-items-center ${
          featured ? "h-14 w-14 rounded-[20px]" : "h-12 w-12 rounded-2xl"
        }`}
        style={{
          background: highlight ? "var(--imc-surface-strong)" : "rgba(67,56,202,0.1)",
          color: highlight ? MARIGOLD : "var(--imc-indigo-text)",
        }}
      >
        <Icon size={featured ? 24 : 21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={`${featured ? "text-[16px]" : "text-[14px]"} font-black`}
          style={{ color: "var(--imc-text)" }}
        >
          {title}
        </h3>
        <p
          className="mt-0.5 text-[11px] font-semibold leading-4"
          style={{ color: "var(--imc-text-muted)" }}
        >
          {subtitle}
        </p>
      </div>

      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{
          background: highlight ? "var(--imc-surface)" : "rgba(67,56,202,0.08)",
          color: highlight ? MARIGOLD : "var(--imc-indigo-text)",
        }}
      >
        <ChevronRight size={17} />
      </div>
    </button>
  );
}

function NavItem({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      style={{ color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 2} />
      <span className="text-[10.5px] font-semibold">{label}</span>
    </button>
  );
}

export default BottomNav;
