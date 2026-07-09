import { ArrowLeft, Ban, Flag, Mail, MessageCircle, Scale, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { useSEO } from "../../hooks/useSEO";

// Google Play's Child Safety Standards policy (required for social apps)
// expects this content to be reachable both as a public web page (no
// login required — see the route registration in AppRoutes.jsx) and
// discoverable from inside the app itself (see the Settings menu entry).
const COMMITMENTS = [
  {
    icon: Ban,
    title: "Zero tolerance for CSAE",
    body: "IMCircle has zero tolerance for Child Sexual Abuse and Exploitation (CSAE) in any form, anywhere on the platform — posts, comments, messages, profiles, and communities alike.",
  },
  {
    icon: ShieldCheck,
    title: "Immediate, permanent removal",
    body: "Any content involving the exploitation of minors is permanently removed the moment it's identified, with no exceptions.",
  },
  {
    icon: Ban,
    title: "Permanent account bans",
    body: "Accounts found violating these policies are permanently banned from IMCircle.",
  },
  {
    icon: Scale,
    title: "Cooperation with law enforcement",
    body: "IMCircle cooperates with law enforcement whenever legally required, including reporting violations to the relevant authorities.",
  },
  {
    icon: Flag,
    title: "Reporting is always available",
    body: "Every post, comment, message, profile, and community on IMCircle can be reported directly from within the app, at any time, by any user.",
  },
  {
    icon: MessageCircle,
    title: "Reports reviewed promptly",
    body: "Reports are reviewed by the IMCircle team as quickly as possible, with child safety reports treated as our highest priority.",
  },
];

const REPORTABLE = ["Posts", "Comments", "Messages", "Profiles", "Communities"];

function ChildSafety() {
  const navigate = useNavigate();

  useSEO({
    title: "Child Safety Standards",
    description:
      "IMCircle's Child Safety Standards — our zero-tolerance policy on Child Sexual Abuse and Exploitation (CSAE), how to report content, and how to reach our safety team.",
    path: "/child-safety",
  });

  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
              Child Safety Standards
            </h1>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-[25px] border border-[var(--imc-border)] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] px-5 py-6 shadow-[0_18px_45px_rgba(67,56,202,0.25)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h2 className="mt-4 text-[19px] font-black leading-6 text-white">
              IMCircle is committed to creating a safe community for everyone.
            </h2>
            <p className="mt-2 text-[12.5px] font-semibold leading-5 text-white/85">
              These standards explain how we protect minors on IMCircle, and
              what we do the moment we find content or accounts that put them
              at risk.
            </p>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 text-[13px] font-black uppercase tracking-wide text-[var(--imc-text-faint)]">
              Our commitment
            </h3>

            <div className="space-y-3">
              {COMMITMENTS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                      <Icon size={17} />
                    </div>
                    <h4 className="text-[13.5px] font-black text-[var(--imc-text)]">
                      {title}
                    </h4>
                  </div>
                  <p className="mt-2 text-[12.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                <Flag size={17} />
              </div>
              <h3 className="text-[13.5px] font-black text-[var(--imc-text)]">
                How to report
              </h3>
            </div>

            <p className="mt-2 text-[12.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              You can report any of the following directly from within the
              app, using the "⋯" menu wherever it appears:
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {REPORTABLE.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-3 py-1.5 text-[12px] font-bold text-[var(--imc-text)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                <Mail size={17} />
              </div>
              <h3 className="text-[13.5px] font-black text-[var(--imc-text)]">
                Safety contact
              </h3>
            </div>

            <p className="mt-2 text-[12.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              If you have a safety concern involving a minor, or need to reach
              us about anything on this page, contact us directly:
            </p>

            <a
              href="mailto:rishurajmld@gmail.com"
              className="mt-3 inline-block text-[13px] font-black text-[var(--imc-indigo-text)]"
            >
              rishurajmld@gmail.com
            </a>
          </div>

          <p className="mt-6 text-center text-[11px] font-semibold text-[var(--imc-text-faint)]">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default ChildSafety;
