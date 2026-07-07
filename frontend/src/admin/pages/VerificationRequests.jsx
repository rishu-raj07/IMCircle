import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Mail, Search } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";

const statusClasses = {
  pending: "bg-[#FFFAEB] text-[#B54708]",
  reviewing: "bg-[#EEF4FF] text-[#3538CD]",
  approved: "bg-[#ECFDF3] text-[#067647]",
  rejected: "bg-[#FEF3F2] text-[#D92D20]",
};

function getDisplayName(request) {
  const user = request?.user || {};
  return user.fullName || user.name || request?.name || user.username || request?.username || request?.email || "Unknown user";
}

function getContact(request) {
  const user = request?.user || {};
  return user.mobile || request?.mobile || user.email || request?.email || "No contact";
}

export default function VerificationRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/verification-requests", {
        params: { status, q },
      });
      setRequests(Array.isArray(res.data.requests) ? res.data.requests : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load verification requests");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-[#12141C] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
            <BadgeCheck size={21} />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/60">
              Verification
            </p>
            <h2 className="text-[24px] font-black">Pre-registration requests</h2>
          </div>
        </div>
        <p className="mt-3 text-[13px] font-bold text-white/65">
          Users who tap pre-register on the verification page appear here.
        </p>
      </section>

      <div className="flex flex-col gap-3 rounded-[24px] border border-[#EAECF0] bg-white p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by name, username, mobile, or email"
            className="h-11 w-full rounded-2xl border border-[#D0D5DD] pl-10 pr-4 text-[13px] font-bold outline-none focus:border-[#4338CA]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-2xl border border-[#D0D5DD] px-4 text-[13px] font-bold outline-none"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <AdminButton onClick={load}>Search</AdminButton>
      </div>

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError text={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <AdminEmpty
          title="No pre-registrations yet"
          text="Requests will appear here after users tap the verification pre-register button."
        />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#EAECF0] bg-white">
          {requests.map((request) => (
            <div
              key={request._id}
              className="flex flex-col gap-3 border-b border-[#EAECF0] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-[#12141C]">{getDisplayName(request)}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      statusClasses[request.status] || "bg-[#F2F4F7] text-[#667085]"
                    }`}
                  >
                    {request.status || "pending"}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] font-bold text-[#667085]">
                  <Mail size={13} />
                  {getContact(request)}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#98A2B3]">
                  Requested {request.createdAt ? new Date(request.createdAt).toLocaleString() : "recently"}
                  {request.emailSent ? " · email notification sent" : ""}
                </p>
              </div>

              <div className="rounded-2xl bg-[#F2F4F7] px-3 py-2 text-[11px] font-black text-[#667085]">
                @{request.user?.username || request.username || "unknown"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
