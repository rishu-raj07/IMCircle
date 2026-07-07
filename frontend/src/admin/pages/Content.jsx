import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Flag } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";

const types = [
  { key: "posts", label: "Posts" },
  { key: "learning", label: "Learning" },
  { key: "journeys", label: "Journeys" },
  { key: "milestones", label: "Milestones" },
];

export default function AdminContent() {
  const [type, setType] = useState("posts");
  const [items, setItems] = useState([]);
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingItem, setPendingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/content", { params: { type, reported } });
      setItems(res.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load content");
    } finally {
      setLoading(false);
    }
  }, [type, reported]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmToggle = async () => {
    if (!pendingItem) return;
    setActionLoading(true);
    try {
      await adminApi.patch(`/admin/content/${type}/${pendingItem._id}`, {
        action: pendingItem.isDeleted ? "restore" : "remove",
      });
      setPendingItem(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "That action failed. Try again.");
      setPendingItem(null);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (item) => {
    setDetail({ item: null });
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await adminApi.get(`/admin/content/${type}/${item._id}`);
      setDetail({ item: res.data.item });
    } catch (err) {
      setDetailError(err.response?.data?.message || "Could not load content details");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#EAECF0] bg-white p-3">
        {types.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`rounded-2xl px-4 py-2 text-[12px] font-black transition ${
              type === key ? "bg-[#4338CA] text-white" : "bg-[#F2F4F7] text-[#344054]"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setReported((v) => !v)}
          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-black transition ${
            reported ? "bg-[#F04438] text-white" : "bg-[#F2F4F7] text-[#344054]"
          }`}
        >
          <Flag size={13} />
          Reported only
        </button>
      </div>

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError text={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmpty
          title="No content"
          text={reported ? "Nothing has been reported here yet." : "Nothing matches this filter."}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item._id} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
              <button type="button" onClick={() => openDetail(item)} className="w-full text-left active:scale-[0.99]">
                <p className="line-clamp-2 text-[14px] font-black text-[#12141C]">
                  {item.title || item.content || item.description || "Untitled content"}
                </p>
                <p className="mt-2 text-[12px] font-bold text-[#667085]">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.reports?.length > 0 && (
                    <span className="ml-2 text-[#D92D20]">
                      &middot; {item.reports.length} report{item.reports.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {item.isDeleted && <span className="ml-2 text-[#B54708]">&middot; hidden</span>}
                </p>
              </button>
              <div className="mt-4">
                <AdminButton danger={!item.isDeleted} onClick={() => setPendingItem(item)}>
                  <span className="flex items-center gap-1.5">
                    {item.isDeleted ? <Eye size={13} /> : <EyeOff size={13} />}
                    {item.isDeleted ? "Restore" : "Hide/remove"}
                  </span>
                </AdminButton>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingItem)}
        loading={actionLoading}
        danger={!pendingItem?.isDeleted}
        title={pendingItem?.isDeleted ? "Restore this content?" : "Hide this content?"}
        description={
          pendingItem?.isDeleted
            ? "It becomes visible to everyone again."
            : "It's immediately hidden from feeds and profiles. You can restore it any time."
        }
        confirmLabel={pendingItem?.isDeleted ? "Restore" : "Hide"}
        onCancel={() => setPendingItem(null)}
        onConfirm={confirmToggle}
      />

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={types.find((t) => t.key === type)?.label.replace(/s$/, "") || "Content"}
        subtitle={detail?.item?._id}
      >
        {detailLoading ? (
          <AdminLoading rows={2} />
        ) : detailError ? (
          <AdminError text={detailError} />
        ) : (
          <ContentDetailBody item={detail?.item} />
        )}
      </Drawer>
    </div>
  );
}

function ContentDetailBody({ item }) {
  if (!item) return null;
  const owner = item.author || item.creator;

  return (
    <div className="space-y-4">
      {owner && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#F2F4F7] p-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white text-[13px] font-black text-[#667085]">
            {owner.avatar ? (
              <img src={owner.avatar} alt={owner.fullName} className="h-full w-full object-cover" />
            ) : (
              (owner.fullName || owner.username || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-[#12141C]">{owner.fullName || owner.username}</p>
            <p className="truncate text-[11px] font-bold text-[#667085]">@{owner.username || "unknown"}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">Content</h3>
        <p className="whitespace-pre-line text-[13.5px] font-semibold leading-6 text-[#344054]">
          {item.title || item.content || item.description || "No text content"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Likes" value={item.likesCount} />
        <StatBox label="Comments" value={item.commentsCount} />
        <StatBox label="Reposts" value={item.repostsCount} />
      </div>

      {item.reports?.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D92D20]">
            Reports ({item.reports.length})
          </h3>
          <div className="space-y-2">
            {item.reports.map((report, index) => (
              <div key={report._id || index} className="rounded-2xl border border-[#FEE4E2] bg-[#FEF3F2] p-3">
                <p className="text-[12px] font-black text-[#912018]">
                  {report.user?.fullName || report.user?.username || "A user"}
                </p>
                {report.reason && (
                  <p className="mt-1 text-[12px] font-semibold text-[#B42318]">{report.reason}</p>
                )}
                <p className="mt-1 text-[10.5px] font-bold text-[#98A2B3]">
                  {report.createdAt ? new Date(report.createdAt).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] font-bold text-[#98A2B3]">
        Created {new Date(item.createdAt).toLocaleString()}
        {item.isDeleted ? " · currently hidden" : ""}
      </p>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F2F4F7] p-3">
      <p className="text-[16px] font-black text-[#12141C]">{value ?? 0}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#667085]">{label}</p>
    </div>
  );
}
