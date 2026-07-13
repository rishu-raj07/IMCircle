import {
  Home,
  Compass,
  Plus,
  Users,
  User,
  Rocket,
  X,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const MARIGOLD = "#EC9A1E";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [showJourneyConfirm, setShowJourneyConfirm] = useState(false);

  const isActive = (path) => location.pathname === path;

  const goTo = (path) => {
    setShowCreate(false);
    setShowJourneyConfirm(false);
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
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[20px] font-black" style={{ color: "var(--imc-text)" }}>
                Create
              </h2>

              <button
                onClick={() => setShowCreate(false)}
                aria-label="Close create menu"
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
                icon={Plus}
                title="Create Post"
                onClick={() => goTo("/create-post")}
              />

              <CreateOption
                icon={Rocket}
                title="Make a New Journey"
                onClick={() => setShowJourneyConfirm(true)}
              />
            </div>
          </div>
        </div>
      )}

      {showJourneyConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-5 backdrop-blur-[3px]"
          onClick={() => setShowJourneyConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-journey-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[360px] rounded-[26px] bg-[var(--imc-surface)] p-5 shadow-2xl"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(236,154,30,0.12)]" style={{ color: MARIGOLD }}>
              <Rocket size={22} />
            </div>
            <h2 id="new-journey-title" className="mt-4 text-[18px] font-black" style={{ color: "var(--imc-text)" }}>
              Start another journey?
            </h2>
            <p className="mt-2 text-[12.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
              Your existing journey is already in progress. Are you sure you want to create a new journey?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowJourneyConfirm(false)}
                className="h-11 flex-1 rounded-[14px] bg-[var(--imc-surface-2)] text-[12px] font-black active:scale-[0.98]"
                style={{ color: "var(--imc-text-muted)", border: "1px solid var(--imc-border)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => goTo("/create-journey")}
                className="h-11 flex-1 rounded-[14px] bg-[#4338CA] text-[12px] font-black text-white active:scale-[0.98]"
              >
                Yes, continue
              </button>
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
            className="grid h-8 w-8 place-items-center rounded-[7px]"
            style={{
              background: "#171923",
              color: "#ffffff",
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

function CreateOption({ icon: Icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left active:scale-[0.98]"
      style={{
        border: "1px solid var(--imc-border)",
        background: "var(--imc-surface)",
      }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
        style={{
          background: "rgba(67,56,202,0.1)",
          color: "var(--imc-indigo-text)",
        }}
      >
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
          {title}
        </h3>
      </div>

      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{
          background: "rgba(67,56,202,0.08)",
          color: "var(--imc-indigo-text)",
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
      className="relative flex min-w-[50px] flex-col items-center gap-1 pb-1 pt-2"
      style={{ color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 2} />
      <span className="text-[10.5px] font-semibold">{label}</span>
      {active && <span className="absolute inset-x-2 -bottom-1 h-[2px] rounded-full bg-[var(--imc-indigo)]" />}
    </button>
  );
}

export default BottomNav;
