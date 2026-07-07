import {
  ArrowLeft,
  Compass,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { useSEO } from "../../hooks/useSEO";

const APP_VERSION = "1.0.0";

const HIGHLIGHTS = [
  {
    icon: <Rocket size={18} />,
    title: "Our mission",
    subtitle:
      "Make building in public feel less lonely — real progress, shared with people who care about the same things you do.",
  },
  {
    icon: <Users size={18} />,
    title: "Circles",
    subtitle:
      "Small communities built around a shared interest — startups, fitness, career, design, and more — where you can post, chat, and grow with people on the same path.",
  },
  {
    icon: <Compass size={18} />,
    title: "Journeys",
    subtitle:
      "A simple way to document progress over time — day by day, milestone by milestone — instead of a single highlight-reel post.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Trust and safety",
    subtitle:
      "Verification, reporting, and moderation tools are built in so the people and progress you see on IMCircle are genuine.",
  },
  {
    icon: <Sparkles size={18} />,
    title: "Always improving",
    subtitle:
      "IMCircle is early and evolving quickly. Features, design, and policies may change as we learn from how people actually use the app.",
  },
];

function About() {
  const navigate = useNavigate();
  useSEO({
    title: "About & Founder Story",
    description: "IMCircle was founded by Rishu Raj to help ambitious people from small towns, cities, colleges, and working backgrounds find the right circle, share their growth journey, learn publicly, discover opportunities, and build their future.",
    path: "/about",
  });


  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              About IMCircle
            </h1>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="flex flex-col items-center rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-6 text-center shadow-sm">
            <img
              src="/logo.png"
              alt="IMCircle"
              className="h-14 w-14 object-contain"
            />

            <h2 className="mt-3 font-serif text-[20px] font-black text-[var(--imc-text)]">
              IM<span className="text-[var(--imc-indigo-text)]">Circle</span>
            </h2>

            <p className="mt-2 max-w-[260px] text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
              A place to share your journey and grow alongside people who
              get it — whether you're building a startup, chasing a fitness
              goal, or learning something new.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <InfoRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
              />
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <h3 className="text-[13px] font-black text-[var(--imc-text)]">
              A note from the team
            </h3>
            <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
              IMCircle is built by a small, independent team. We read every
              report and piece of feedback that comes in through Settings —
              if something feels off or missing, tell us.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] font-bold text-[var(--imc-text-faint)]">
            IMCircle v{APP_VERSION}
          </p>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

function InfoRow({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <div className="min-w-0">
        <h3 className="text-[13px] font-black text-[var(--imc-text)]">{title}</h3>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default About;
