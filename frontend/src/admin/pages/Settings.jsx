export default function AdminSettings() {
  return (
    <div className="rounded-[28px] border border-[#EAECF0] bg-white p-6">
      <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#4338CA]">Settings</p>
      <h2 className="mt-2 text-[24px] font-black">Admin access</h2>
      <p className="mt-2 max-w-2xl text-[13px] font-bold leading-6 text-[#667085]">
        Admin authentication is separate from user authentication. The current allowed owner mobile is 9661140991 and development OTP is 123456.
      </p>
    </div>
  );
}
