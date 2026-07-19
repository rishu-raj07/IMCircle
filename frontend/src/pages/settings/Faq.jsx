import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

const FAQS = [
  {
    q: "What is IMCircle?",
    a: "IMCircle is a place to share your journey — startups, fitness, career, creative work, whatever you're building — and connect with people going through the same thing.",
  },
  {
    q: "What's a Circle?",
    a: "A Circle is a community built around a shared interest, like startups or fitness. Join one to post, chat, and meet people with the same goals.",
  },
  {
    q: "How do I start a Journey?",
    a: "Tap Create from the bottom navigation and choose Journey. Post regular updates so people following you can see your progress over time.",
  },
  {
    q: "Is IMCircle free to use?",
    a: "Yes. Creating an account, joining circles, sharing journeys, and messaging are all free.",
  },
  {
    q: "What does verification do?",
    a: "A verification tick shows people your profile is genuine. It's launching soon — you can pre-register from the Verification page.",
  },
  {
    q: "How do I save a post for later?",
    a: "Tap the bookmark icon on any post, job, or journey update. Everything you save shows up on the Saved page.",
  },
  {
    q: "How do I control who sees my activity?",
    a: "Go to Settings → My Account to manage your profile details and visibility.",
  },
  {
    q: "How do I delete my account?",
    a: "Account deletion isn't available in the app yet. Reach out through Feedback & Support and we'll help you directly.",
  },
];

function Faq() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">FAQs</h1>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="overflow-hidden rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-sm">
            {FAQS.map((item, index) => (
              <div
                key={item.q}
                className="border-b border-[var(--imc-border)] last:border-b-0"
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <span className="text-[13px] font-black text-[var(--imc-text)]">
                    {item.q}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[var(--imc-text-faint)] transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openIndex === index && (
                  <p className="px-4 pb-4 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default Faq;
