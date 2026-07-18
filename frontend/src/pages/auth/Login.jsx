import { useCallback, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import heroImg from "../../assets/images/login-hero.webp";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import { googleLogin, sendMobileOtp } from "../../api/authApi";
import { saveLoginData } from "../../store/authStore";
import { setPendingRegister } from "../../utils/storage";
import { perfMark } from "../../utils/perfLog.js";
import { getReferralCode } from "../../utils/referral.js";

function Login() {
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  // Extra guard against a double-fire beyond just the disabled button state
  // (e.g. a very fast double-tap before React re-renders with loading=true)
  // — spec: "Prevent double-clicks... allow only one active OTP request per
  // number."
  const otpRequestInProgress = useRef(false);

  const navigate = useNavigate();

  const handleMobileContinue = async (e) => {
    e.preventDefault();
    setError("");
    setDevOtp("");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter valid 10 digit Indian mobile number");
      return;
    }

    if (otpRequestInProgress.current) return;
    otpRequestInProgress.current = true;

    try {
      setLoading(true);

      const data = await sendMobileOtp({ mobile, ref: getReferralCode() || undefined });

      setPendingRegister({
        mobile,
        authType: "mobile-login",
        devOtp: data?.devOtp || "",
      });

      navigate("/verify");
    } catch (err) {
      // A cooldown response (rapid double-tap, or a very recent OTP already
      // sent to this number) still means a valid, usable OTP is sitting in
      // the person's messages right now — send them straight to Verify to
      // enter it instead of stranding them here on an error. retryAfter
      // seeds Verify's own resend countdown so it doesn't show a fresh 60s
      // when the real remaining wait might be much shorter.
      if (err.response?.data?.cooldown) {
        setPendingRegister({
          mobile,
          authType: "mobile-login",
          devOtp: "",
          retryAfter: Number(err.response.data.retryAfter) || 30,
        });
        navigate("/verify");
        return;
      }

      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
      otpRequestInProgress.current = false;
    }
  };

  // Stable identities via useCallback so GoogleAuthButton (memoized) never
  // re-renders — and never re-invokes Google's renderButton — just because
  // this page re-rendered from typing in the mobile field or a loading
  // state change.
  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      setError("");

      try {
        perfMark("backend_auth_google_request_start");
        const data = await googleLogin({
          credential: credentialResponse.credential,
          ref: getReferralCode() || undefined,
        });
        perfMark("backend_auth_google_response_received");

        // saveLoginData's own analytics call is already fire-and-forget
        // (see authStore.js's trackEvent(...).catch(() => {})) — nothing
        // here should block navigation waiting on unrelated async work.
        saveLoginData(data);
        perfMark("auth_context_updated");

        // ProtectedRoute checks onboarding status on every private route, so
        // it will bounce first-time users into /profile-setup automatically.
        navigate("/home", { replace: true });
        perfMark("navigate_to_home_called");
      } catch (err) {
        perfMark("backend_auth_google_failed", { message: err?.message });
        setError(err.response?.data?.message || "Google login failed");
      }
    },
    [navigate]
  );

  // On native (Android/iOS), NativeGoogleButton passes the actual thrown
  // error object here — surface its real message instead of a generic
  // string, so a failure is diagnosable from the screen itself without
  // needing adb logcat / chrome://inspect. The web GoogleLogin widget's
  // onError doesn't pass anything useful, so this falls back gracefully.
  const handleGoogleError = useCallback((err) => {
    const detail = err?.message || err?.error || (typeof err === "string" ? err : "");
    setError(detail ? `Google login failed: ${detail}` : "Google login failed");
  }, []);

  return (
    <div className="min-h-screen bg-[var(--imc-surface-2)] flex justify-center">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface-2)] px-5 pt-14 pb-8">
        <div className="text-center">
          <div className="text-[34px] font-black leading-none tracking-[-1.5px] text-[var(--imc-text)]" aria-label="IMCircle">
            <span className="text-[var(--imc-indigo-text)]">IM</span>Circle
          </div>

          <p className="mt-2 text-[12.5px] font-semibold text-[var(--imc-text-muted)]">
            Grow With Your Circle.
          </p>

          <div className="mx-auto mt-3 h-[130px] w-full overflow-hidden rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)]">
            <img
              src={heroImg}
              alt=""
              className="auth-hero-image h-full w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="mt-3 rounded-[25px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-5 shadow-[0_18px_45px_rgba(18,20,28,0.10)]">
          <h2 className="text-[23px] font-black text-[var(--imc-text)]">
            Welcome to IMCircle
          </h2>

          <p className="mt-0.5 text-[13px] font-medium text-[var(--imc-text-muted)]">
            Continue with mobile OTP or Google.
          </p>

          <form className="mt-4" onSubmit={handleMobileContinue}>
            <label className="text-[12px] font-bold text-[var(--imc-text)]">
              Mobile Number
            </label>

            <div className="mt-1.5 flex h-[46px] items-center gap-3 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-3">
              <Phone size={18} className="text-[var(--imc-indigo-text)]" />
              <span className="text-[13px] font-bold text-[var(--imc-text)]">+91</span>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Enter mobile number"
                className="w-full bg-transparent text-[13px] font-medium text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-muted)]"
              />
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
              className="mt-4 h-[46px] w-full rounded-2xl bg-gradient-to-r from-[#4338CA] to-[#2E2A8F] text-[16px] font-bold text-white shadow-lg shadow-[rgba(67,56,202,0.18)] active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? "Sending OTP..." : "Continue with Mobile"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--imc-border)]" />
            <span className="text-[12px] font-semibold text-[var(--imc-text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--imc-border)]" />
          </div>

          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="continue_with"
          />

          <p className="mt-3 text-center text-[10.8px] leading-4 text-[var(--imc-text-muted)]">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="font-bold text-[var(--imc-indigo-text)]">
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy-policy"
              className="font-bold text-[var(--imc-indigo-text)]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
