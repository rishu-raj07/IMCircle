import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { adminAuthApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { admin, login } = useAdminAuth();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (admin) return <Navigate to="/admin/dashboard" replace />;

  const sendOtp = async () => {
    try {
      setLoading(true);
      setError("");
      await adminAuthApi.sendOtp(mobile);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminAuthApi.verifyOtp(mobile, otp);
      login(res.data);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F8FC] px-4 text-[#12141C]">
      <div className="w-full max-w-[420px] rounded-[28px] border border-[#EAECF0] bg-white p-6 shadow-[0_24px_70px_rgba(18,20,28,0.08)]">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#12141C] text-white">
          <ShieldCheck size={26} />
        </div>
        <h1 className="mt-5 text-[26px] font-black">Admin login</h1>
        <p className="mt-1 text-[13px] font-bold text-[#667085]">
          Separate OTP access for IMCircle owner tools.
        </p>

        <label className="mt-6 block text-[12px] font-black text-[#344054]">Mobile number</label>
        <input
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-[14px] font-bold outline-none focus:border-[#4338CA]"
          inputMode="numeric"
        />

        {otpSent && (
          <>
            <label className="mt-4 block text-[12px] font-black text-[#344054]">OTP</label>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-[14px] font-bold outline-none focus:border-[#4338CA]"
              inputMode="numeric"
              placeholder="123456"
            />
          </>
        )}

        {error && <p className="mt-3 rounded-2xl bg-[#FEF3F2] px-3 py-2 text-[12px] font-black text-[#D92D20]">{error}</p>}

        <button
          type="button"
          onClick={otpSent ? verifyOtp : sendOtp}
          disabled={loading}
          className="mt-5 h-12 w-full rounded-2xl bg-[#4338CA] text-[14px] font-black text-white disabled:opacity-60"
        >
          {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
        </button>
      </div>
    </div>
  );
}
