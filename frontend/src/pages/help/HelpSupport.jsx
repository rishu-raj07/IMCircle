import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Mail,
  MessageCircle,
  ShieldCheck,
  FileText,
  Bug,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Help & Support
            </h1>

            <div className="h-11 w-11" />
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-[30px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl">
            <h2 className="text-[22px] font-black">
              How can we help you?
            </h2>

            <p className="mt-2 text-[13px] font-semibold text-white/75">
              Find answers, report issues and contact IMCircle support.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <Item icon={<CircleHelp />} title="FAQs" />
            <Item icon={<MessageCircle />} title="Chat Support" />
            <Item icon={<Mail />} title="Contact Us" />
            <Item icon={<Bug />} title="Report a Problem" />
            <Item icon={<ShieldCheck />} title="Safety Center" />
            <Item icon={<FileText />} title="Terms & Privacy" />
          </div>

          <div className="mt-6 rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-5 shadow-sm">
            <h3 className="text-[16px] font-black text-[var(--imc-text)]">
              Need immediate help?
            </h3>

            <p className="mt-2 text-[13px] leading-6 text-[var(--imc-text-muted)]">
              Reach us at
              <span className="font-black text-[var(--imc-indigo-text)]">
                {" "}support@imcircle.in
              </span>
            </p>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

function Item({ icon, title }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <span className="flex-1 text-left text-[14px] font-black text-[var(--imc-text)]">
        {title}
      </span>

      <ChevronRight size={18} className="text-[var(--imc-text-faint)]" />
    </button>
  );
}

export default HelpSupport;