import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import {
  preRegisterForVerification,
  getVerificationStatus,
} from "../../api/verificationApi";

function Verification() {
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getVerificationStatus();
        if (!cancelled) setRegistered(Boolean(res?.registered));
      } catch {
        // best-effort — button still works either way
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePreRegister = async () => {
    setSubmitting(true);
    setError("");

    try {
      await preRegisterForVerification();
      setRegistered(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't submit your request. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] flex justify-center">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface)] pb-24">
        <div className="sticky top-0 z-20 border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-[18px] font-black text-[var(--imc-text)]">
              Verification
            </h1>
          </div>
        </div>

        <main className="px-5 pt-6">
          <div className="flex flex-col items-center rounded-[32px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] px-6 py-10 text-center text-white shadow-xl shadow-purple-200">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15">
              <ShieldCheck size={32} />
            </div>

            <span className="mt-5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide">
              Launching soon
            </span>

            <h2 className="mt-4 text-[22px] font-black leading-tight">
              The IMCircle verification tick is on its way
            </h2>

            <p className="mt-3 max-w-[280px] text-[13px] font-semibold text-white/80">
              Pre-register now and we'll notify you the moment verification
              opens — and give early access to the people who asked first.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Perk
              icon={<BadgeCheck size={18} />}
              title="A real trust badge"
              subtitle="Show people your profile and journeys are genuine."
            />
            <Perk
              icon={<Sparkles size={18} />}
              title="Priority visibility"
              subtitle="Verified profiles get surfaced first across IMCircle."
            />
            <Perk
              icon={<Rocket size={18} />}
              title="Early access"
              subtitle="Pre-registered users get the tick before anyone else."
            />
          </div>

          <div className="mt-6">
            {registered ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-[#ECFDF3] bg-[#ECFDF3] p-4">
                <CheckCircle2 size={22} className="shrink-0 text-[#059669]" />
                <div>
                  <p className="text-[13px] font-black text-[#065F46]">
                    You're on the list
                  </p>
                  <p className="text-[11px] font-semibold text-[#059669]">
                    We'll email you as soon as verification launches.
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePreRegister}
                disabled={loading || submitting}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[14px] font-black text-white shadow-lg shadow-indigo-200 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Pre-register for verification"}
              </button>
            )}

            {error && (
              <p className="mt-2 text-center text-[11px] font-semibold text-red-500">
                {error}
              </p>
            )}
          </div>

          <p className="mt-5 px-3 text-center text-[11px] font-semibold leading-5 text-[var(--imc-text-faint)]">
            No documents or payment needed to pre-register. We'll reach out
            with next steps when verification opens.
          </p>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function Perk({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-3.5 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <div className="min-w-0">
        <h3 className="text-[13px] font-black text-[var(--imc-text)]">{title}</h3>
        <p className="mt-0.5 text-[11px] font-semibold text-[var(--imc-text-muted)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default Verification;
