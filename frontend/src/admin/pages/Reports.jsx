import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye as EyeIcon, XCircle } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";

const STATUS_STYLE = {
  open: "text-[#B54708]",
  reviewing: "text-[#4338CA]",
  resolved: "text-[#067647]",
  dismissed: "text-[#667085]",
};

const ACTION_COPY = {
  resolve: {
    title: "Mark this report resolved?",
    description: "Use this once you've actually fixed or addressed the issue.",
    confirmLabel: "Mark resolved",
    danger: false,
  },
  dismiss: {
    title: "Dismiss this report?",
    description: "Use this if it isn't actionable — it's kept for the record but closed out.",
    confirmLabel: "Dismiss",
    danger: true,
  },
};

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingAction, setPendingAction] = useState(null); // { report, action }
  const [actionLoading, setActionLoading] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/reports", { params: { status } });
      setReports(res.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const quickUpdate = async (report, action) => {
    // "review" is non-destructive (just moves it into progress), so it
    // doesn't need a confirmation step — only resolve/dismiss do.
    await adminApi.patch(`/admin/reports/${report._id}`, { action });
    load();
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/admin/reports/${pendingAction.report._id}`, {
        action: pendingAction.action,
      });
      setPendingAction(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "That action failed. Try again.");
      setPendingAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (report) => {
    setDetail({ report: null });
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await adminApi.get(`/admin/reports/${report._id}`);
      setDetail({ report: res.data.report });
    } catch (err) {
      setDetailError(err.response?.data?.message || "Could not load report details");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-[13px] font-bold outline-none"
      >
        <option value="all">All reports</option>
        <option value="open">Pending</option>
        <option value="reviewing">Reviewing</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </select>

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError text={error} onRetry={load} />
      ) : reports.length === 0 ? (
        <AdminEmpty title="No reports" text="Reports will show here as people submit them." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report._id} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
              <button type="button" onClick={() => openDetail(report)} className="w-full text-left active:scale-[0.99]">
                <p className={`text-[12px] font-black uppercase ${STATUS_STYLE[report.status] || "text-[#4338CA]"}`}>
                  {report.status}
                </p>
                <p className="mt-2 line-clamp-2 text-[14px] font-bold text-[#12141C]">{report.message}</p>
                <p className="mt-2 text-[12px] font-bold text-[#667085]">
                  By {report.user?.fullName || report.email || "User"}
                  {" · "}
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton onClick={() => quickUpdate(report, "review")}>
                  <span className="flex items-center gap-1.5">
                    <EyeIcon size={13} /> Reviewing
                  </span>
                </AdminButton>
                <AdminButton onClick={() => setPendingAction({ report, action: "resolve" })}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Mark resolved
                  </span>
                </AdminButton>
                <AdminButton danger onClick={() => setPendingAction({ report, action: "dismiss" })}>
                  <span className="flex items-center gap-1.5">
                    <XCircle size={13} /> Dismiss
                  </span>
                </AdminButton>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        loading={actionLoading}
        title={pendingAction ? ACTION_COPY[pendingAction.action].title : ""}
        description={pendingAction ? ACTION_COPY[pendingAction.action].description : ""}
        confirmLabel={pendingAction ? ACTION_COPY[pendingAction.action].confirmLabel : "Confirm"}
        danger={pendingAction ? ACTION_COPY[pendingAction.action].danger : false}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Report"
        subtitle={detail?.report?.status}
      >
        {detailLoading ? (
          <AdminLoading rows={2} />
        ) : detailError ? (
          <AdminError text={detailError} />
        ) : (
          <ReportDetailBody report={detail?.report} />
        )}
      </Drawer>
    </div>
  );
}

function ReportDetailBody({ report }) {
  if (!report) return null;
  const user = report.user;

  return (
    <div className="space-y-4">
      {user && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#F2F4F7] p-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white text-[13px] font-black text-[#667085]">
            {user.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="h-full w-full object-cover" />
            ) : (
              (user.fullName || user.username || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-[#12141C]">{user.fullName || user.username}</p>
            <p className="truncate text-[11px] font-bold text-[#667085]">{user.mobile || user.email}</p>
          </div>
          {user.isBlocked && (
            <span className="ml-auto shrink-0 rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-black text-[#D92D20]">
              Suspended
            </span>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">Message</h3>
        <p className="whitespace-pre-line text-[13.5px] font-semibold leading-6 text-[#344054]">{report.message}</p>
      </div>

      <p className="text-[11px] font-bold text-[#98A2B3]">
        Submitted {new Date(report.createdAt).toLocaleString()}
        {report.emailSent ? " · notified by email" : ""}
      </p>
    </div>
  );
}
