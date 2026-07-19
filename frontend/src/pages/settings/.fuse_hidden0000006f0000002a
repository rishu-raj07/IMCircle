import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Sparkles,
  Tag,
  User,
  AtSign,
  Phone,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { getMyProfile } from "../../api/profileApi";
import { sendProfileMobileOtp, verifyProfileMobileOtp } from "../../api/userApi";

function formatDob(dob) {
  if (!dob) return "Not set";

  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatLocation(location) {
  if (!location) return "Not set";
  if (typeof location === "string") return location || "Not set";

  const parts = [location.city, location.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not set";
}

function AccountDetails() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone verification flow: blank field + "Send OTP" -> separate OTP box
  // appears -> verify -> saved to the profile and shown as verified.
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [verifiedMobile, setVerifiedMobile] = useState(null);
  const otpAbortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getMyProfile();
        const data = res?.user || res?.data?.user || res?.data || res;
        if (!cancelled) {
          setUser(data || null);
          if (data?.mobile && data?.verification?.mobile) {
            setVerifiedMobile(data.mobile);
          }
        }
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // WebOTP auto-detect: on supporting mobile browsers, this fills the OTP
  // box automatically as soon as the SMS arrives, no manual typing needed.
  useEffect(() => {
    if (!otpSent || !("OTPCredential" in window)) return undefined;

    const controller = new AbortController();
    otpAbortRef.current = controller;

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: controller.signal,
      })
      .then((credential) => {
        if (credential?.code) setOtp(credential.code);
      })
      .catch(() => {
        // user dismissed, timed out, or unsupported — fine, manual entry still works
      });

    return () => controller.abort();
  }, [otpSent]);

  const handleSendOtp = async () => {
    setPhoneError("");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError("Enter a valid 10 digit mobile number");
      return;
    }

    try {
      setSendingOtp(true);
      await sendProfileMobileOtp(phone);
      setOtpSent(true);
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setPhoneError("");

    if (!/^\d{4,8}$/.test(otp)) {
      setPhoneError("Enter the OTP you received");
      return;
    }

    try {
      setVerifyingOtp(true);
      await verifyProfileMobileOtp(phone, otp);
      setVerifiedMobile(phone);
      setOtpSent(false);
      setOtp("");
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const rows = [
    {
      icon: <User size={18} />,
      label: "Name",
      value: user?.fullName || user?.name || "Not set",
    },
    {
      icon: <AtSign size={18} />,
      label: "Username",
      value: user?.username ? `@${user.username}` : "Not set",
    },
    {
      icon: <Mail size={18} />,
      label: "Email",
      value: user?.email || "Not set",
    },
    {
      icon: <Tag size={18} />,
      label: "Tagline",
      value: user?.headline || "Not set",
    },
    {
      icon: <Calendar size={18} />,
      label: "Date of birth",
      value: formatDob(user?.dob),
    },
    {
      icon: <MapPin size={18} />,
      label: "Location",
      value: formatLocation(user?.location),
    },
    {
      icon: <Sparkles size={18} />,
      label: "Interest",
      value: user?.primaryInterest || "Not set",
    },
  ];

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
              My Account
            </h1>
          </div>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <p className="py-10 text-center text-[12px] font-semibold text-[var(--imc-text-muted)]">
              Loading your details…
            </p>
          ) : (
            <div>
              {rows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex items-center gap-3 py-4 ${
                    index === 0 ? "" : "border-t border-[var(--imc-border)]"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                    {row.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10.5px] font-black uppercase tracking-wide text-[var(--imc-text-faint)]">
                      {row.label}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-black text-[var(--imc-text)]">
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-3 border-t border-[var(--imc-border)] py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                  <Phone size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-black uppercase tracking-wide text-[var(--imc-text-faint)]">
                    Mobile number
                  </p>

                  {verifiedMobile ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <p className="text-[14px] font-black text-[var(--imc-text)]">
                        +91 {verifiedMobile}
                      </p>
                      <ShieldCheck size={15} className="text-emerald-500" />
                      <span className="text-[10.5px] font-bold text-emerald-500">
                        Verified
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          disabled={otpSent}
                          placeholder="10 digit mobile number"
                          inputMode="numeric"
                          className="h-11 min-w-0 flex-1 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-3.5 text-[13px] font-bold text-[var(--imc-text)] outline-none disabled:opacity-60"
                        />
                        {!otpSent && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || phone.length !== 10}
                            className="h-11 shrink-0 rounded-2xl bg-[#4338CA] px-4 text-[12.5px] font-black text-white disabled:opacity-50"
                          >
                            {sendingOtp ? "Sending…" : "Send OTP"}
                          </button>
                        )}
                      </div>

                      {otpSent && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={otp}
                            onChange={(event) =>
                              setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))
                            }
                            placeholder="Enter OTP"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className="h-11 min-w-0 flex-1 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-3.5 text-[13px] font-bold text-[var(--imc-text)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otp.length < 4}
                            className="h-11 shrink-0 rounded-2xl bg-[#4338CA] px-4 text-[12.5px] font-black text-white disabled:opacity-50"
                          >
                            {verifyingOtp ? "Verifying…" : "Verify"}
                          </button>
                        </div>
                      )}

                      {otpSent && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp("");
                            setPhoneError("");
                          }}
                          className="mt-2 text-[11px] font-bold text-[var(--imc-text-muted)] underline"
                        >
                          Change number
                        </button>
                      )}

                      {phoneError && (
                        <p className="mt-2 text-[11px] font-bold text-red-500">{phoneError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/profile-setup")}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.99]"
          >
            Edit
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default AccountDetails;
