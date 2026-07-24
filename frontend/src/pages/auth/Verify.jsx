import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  getPendingRegister,
  removePendingRegister,
} from "../../utils/storage";
import { verifyMobileOtp, sendMobileOtp } from "../../api/authApi";
import { saveLoginData } from "../../store/authStore";
import { getReferralCode } from "../../utils/referral.js";
import { consumePostLoginRedirect } from "../../utils/postLoginRedirect";

const OTP_LENGTH = 6;

function emptyDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

function Verify() {
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  const [mobile, setMobile] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(emptyDigits);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Resend cooldown: 60s after the first send, 60s after the first resend
  // (the 2nd send overall), then 120s from the 3rd send onward — and it
  // stays at 120s for every resend after that. `sendAttempt` starts at 1
  // because getting to this page already means one OTP was just sent.
  const [sendAttempt, setSendAttempt] = useState(1);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    const id = setInterval(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const otp = otpDigits.join("");

  useEffect(() => {
    const pending = getPendingRegister();

    if (!pending?.mobile) {
      navigate("/login", { replace: true });
      return;
    }

    setMobile(pending.mobile);

    if (pending?.devOtp) {
      setDevOtp(pending.devOtp);
    }

    // Login.jsx hands this off when the initial send hit the backend's
    // cooldown (a valid OTP was already sent moments ago) instead of
    // treating it as a failure — seeds the real remaining wait instead of
    // always showing a fresh 60s here.
    if (pending?.retryAfter) {
      setResendCooldown(Number(pending.retryAfter) || 60);
    }
  }, [navigate]);

  // Web OTP API — on supporting browsers (Android Chrome), this listens for
  // an incoming SMS and auto-fills the code without the user touching
  // anything. It silently no-ops everywhere else (iOS/desktop), where the
  // autoComplete="one-time-code" hint on the first box still lets the
  // keyboard suggest the code from Messages.
  useEffect(() => {
    if (!("OTPCredential" in window) || !navigator.credentials?.get) return;

    const controller = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: controller.signal,
      })
      .then((credential) => {
        const code = String(credential?.code || "")
          .replace(/\D/g, "")
          .slice(0, OTP_LENGTH);

        if (code.length === OTP_LENGTH) {
          setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, i) => code[i] || ""));
        }
      })
      .catch(() => {
        // user dismissed the prompt, browser unsupported, or timed out
      });

    return () => controller.abort();
  }, []);

  const verifyOtp = async (value) => {
    setError("");

    if (value.length !== OTP_LENGTH) {
      setError(`Please enter ${OTP_LENGTH} digit OTP`);
      return;
    }

    try {
      setLoading(true);

      const data = await verifyMobileOtp({
        mobile,
        otp: value,
      });

      saveLoginData(data);
      removePendingRegister();

      // ProtectedRoute checks onboarding status on every private route, so
      // it will bounce first-time users into /profile-setup automatically.
      navigate(consumePostLoginRedirect() || "/home", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit the moment all 6 boxes are filled — whether the user typed
  // them, pasted them, or Web OTP filled them in automatically.
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading) {
      verifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    verifyOtp(otp);
  };

  const handleDigitChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);

    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key !== "Backspace") return;

    if (otpDigits[index]) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  };

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData?.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!text) return;

    e.preventDefault();

    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, i) => text[i] || ""));

    const lastFilledIndex = Math.min(text.length, OTP_LENGTH) - 1;
    otpRefs.current[Math.max(lastFilledIndex, 0)]?.focus();
  };

  const handleResendOtp = async () => {
    // Guards against duplicate OTP calls from a double-tap/double-submit —
    // the button is also visually disabled during both of these states.
    if (resending || resendCooldown > 0) return;

    setError("");
    setDevOtp("");
    setOtpDigits(emptyDigits());
    otpRefs.current[0]?.focus();

    try {
      setResending(true);

      const data = await sendMobileOtp({ mobile, ref: getReferralCode() || undefined });

      if (data?.devOtp) {
        setDevOtp(data.devOtp);
      }

      const nextAttempt = sendAttempt + 1;
      setSendAttempt(nextAttempt);
      setResendCooldown(nextAttempt <= 2 ? 60 : 120);
    } catch (err) {
      // Cooldown response (backend 30s guard or MSG91's own 311) — show the
      // friendly message and pick up the countdown from the server's real
      // retryAfter instead of leaving the button permanently stuck on
      // whatever local cooldown value was already showing.
      if (err.response?.data?.cooldown) {
        setResendCooldown(Number(err.response.data.retryAfter) || 30);
      }
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-surface-2)] flex justify-center">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface-2)] px-5 pt-10 pb-8">
        <Link
          to="/login"
          className="absolute left-5 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
        >
          <ArrowLeft size={20} className="text-[var(--imc-text)]" />
        </Link>

        <div className="flex items-center justify-center">
          <div className="text-[25px] font-black leading-none tracking-[-1px] text-[var(--imc-text)]" aria-label="IMCircle">
            <span className="text-[var(--imc-indigo-text)]">IM</span>Circle
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-[25px] font-black tracking-[-0.5px] text-[var(--imc-text)]">
            Verify OTP
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-[var(--imc-text-muted)]">
            Enter the 6 digit code sent to +91 {mobile}
          </p>
        </div>

        <div className="mt-6 rounded-[25px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-5 shadow-[0_18px_45px_rgba(18,20,28,0.10)]">
          <form onSubmit={handleVerifySubmit}>
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--imc-surface)]">
                <ShieldCheck size={22} className="text-[var(--imc-indigo-text)]" />
              </div>

              <div>
                <h3 className="text-[15px] font-black text-[var(--imc-text)]">
                  Mobile Verification
                </h3>
                <p className="text-[12px] font-medium text-[var(--imc-text-muted)]">
                  This helps complete your verified profile.
                </p>
              </div>
            </div>

            <label className="mt-5 block text-[12px] font-bold text-[var(--imc-text)]">
              Enter OTP
            </label>

            <div className="mt-1.5 flex justify-between gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  disabled={loading}
                  className="h-[54px] w-[15%] rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-center text-[22px] font-black text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo-text)] disabled:opacity-60"
                />
              ))}
            </div>

            {devOtp && (
              <p className="mt-2 text-[12px] font-bold text-green-600">
                Dev OTP: {devOtp}
              </p>
            )}

            {error && (
              <p className="mt-2 text-[12px] font-bold text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 h-[46px] w-full rounded-2xl bg-gradient-to-r from-[#4338CA] to-[#2E2A8F] text-[16px] font-bold text-white shadow-lg shadow-[rgba(67,56,202,0.18)] active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending || resendCooldown > 0}
              className="mt-4 w-full text-center text-[13px] font-bold text-[var(--imc-indigo-text)] disabled:opacity-60"
            >
              {resending
                ? "Resending..."
                : resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : "Resend OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Verify;
