import { useCallback, useState } from "react";
import { Phone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import heroImg from "../../assets/images/login-hero.png";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import { googleLogin, sendMobileOtp } from "../../api/authApi";
import { saveLoginData } from "../../store/authStore";
import { setPendingRegister } from "../../utils/storage";

function Signup() {
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleMobileContinue = async (e) => {
    e.preventDefault();
    setError("");
    setDevOtp("");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter valid 10 digit Indian mobile number");
      return;
    }

    try {
      setLoading(true);

      const data = await sendMobileOtp({ mobile });

      setPendingRegister({
        mobile,
        authType: "mobile-signup",
        devOtp: data?.devOtp || "",
      });

      navigate("/verify");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
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
        const data = await googleLogin({
          credential: credentialResponse.credential,
        });

        saveLoginData(data);

        // ProtectedRoute checks onboarding status on every private route, so
        // it will bounce first-time users into /profile-setup automatically.
        navigate("/home");
      } catch (err) {
        setError(err.response?.data?.message || "Google signup failed");
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
    setError(detail ? `Google signup failed: ${detail}` : "Google signup failed");
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-[var(--imc-surface-2)] flex justify-center">
      <div className="relative h-screen w-full max-w-[430px] overflow-hidden bg-[var(--imc-surface-2)] px-5 pt-14">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="IMCircle"
            className="mx-auto h-14 w-auto object-contain"
          />

          <p className="mt-2 text-[12.5px] font-semibold text-[var(--imc-text-muted)]">
            Earn. Build. Grow Together.
          </p>

          <div className="mx-auto mt-3 h-[130px] w-full overflow-hidden rounded-2xl">
            <img
              src={heroImg}
              alt=""
              className="h-full w-full object-cover object-center opacity-95"
            />
          </div>
        </div>

        <div className="mt-3 rounded-[25px] border border-[var(--imc-border)] bg-white/95 px-5 py-5 shadow-[0_18px_45px_rgba(109,40,217,0.10)]">
          <h2 className="text-[23px] font-black text-[var(--imc-text)]">
            Create account
          </h2>

          <p className="mt-0.5 text-[13px] font-medium text-[var(--imc-text-muted)]">
            Start with mobile OTP or Google.
          </p>

          <form className="mt-4" onSubmit={handleMobileContinue}>
            <label className="text-[12px] font-bold text-[var(--imc-text)]">
              Mobile Number
            </label>

            <div className="mt-1.5 flex h-[46px] items-center gap-3 rounded-2xl border border-[var(--imc-border)] px-3">
              <Phone size={18} className="text-[var(--imc-indigo-text)]" />
              <span className="text-[13px] font-bold text-[var(--imc-text)]">+91</span>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Enter mobile number"
                className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-[var(--imc-text-muted)]"
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
            <div className="h-px flex-1 bg-[rgba(18,20,28,0.08)]" />
            <span className="text-[12px] font-semibold text-[var(--imc-text-muted)]">or</span>
            <div className="h-px flex-1 bg-[rgba(18,20,28,0.08)]" />
          </div>

          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
          />

          <p className="mt-3 text-center text-[10.8px] leading-4 text-[var(--imc-text-muted)]">
            By signing up, you agree to our{" "}
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

          <p className="mt-3 text-center text-[13px] font-medium text-[var(--imc-text-muted)]">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[var(--imc-indigo-text)]">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
