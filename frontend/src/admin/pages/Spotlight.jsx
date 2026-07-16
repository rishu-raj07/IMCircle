import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, Sparkles, XCircle } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";

const TABS = ["Weeks", "Nominations"];

function getCurrentWeekKeyGuess() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export default function AdminSpotlight() {
  const [tab, setTab] = useState("Weeks");
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editCategory, setEditCategory] = useState(null);
  const [editUserId, setEditUserId] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingWinner, setSavingWinner] = useState(false);

  // Same edit-a-single-slot pattern as category winners above, but keyed by
  // numbered position (1-12) instead of a category string — see
  // editActivityPosition/removeActivityPosition on the backend.
  const [editPosition, setEditPosition] = useState(null);
  const [editPositionUserId, setEditPositionUserId] = useState("");
  const [editPositionReason, setEditPositionReason] = useState("");
  const [savingPosition, setSavingPosition] = useState(false);

  const [nominations, setNominations] = useState([]);
  const [nominationsLoading, setNominationsLoading] = useState(true);
  const [nominationsError, setNominationsError] = useState("");

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/spotlight/weeks");
      setWeeks(res.data.weeks || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load Spotlight weeks");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNominations = useCallback(async () => {
    setNominationsLoading(true);
    setNominationsError("");
    try {
      const res = await adminApi.get("/admin/spotlight/nominations", { params: { status: "pending" } });
      setNominations(res.data.nominations || []);
    } catch (err) {
      setNominationsError(err.response?.data?.message || "Could not load nominations");
    } finally {
      setNominationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeeks();
  }, [loadWeeks]);

  useEffect(() => {
    if (tab === "Nominations") loadNominations();
  }, [tab, loadNominations]);

  const generateWeek = async (weekKey, force = false) => {
    setGenerating(true);
    try {
      await adminApi.post("/admin/spotlight/generate", { weekKey, force });
      await loadWeeks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate that week");
    } finally {
      setGenerating(false);
    }
  };

  const openWeek = async (weekKey) => {
    setDetail({ week: null });
    setDetailLoading(true);
    try {
      const res = await adminApi.get(`/admin/spotlight/weeks/${weekKey}`);
      setDetail({ week: res.data.week });
    } catch (err) {
      setDetail({ week: null, error: err.response?.data?.message });
    } finally {
      setDetailLoading(false);
    }
  };

  const togglePublish = async (week) => {
    const action = week.status === "published" ? "unpublish" : "publish";
    try {
      await adminApi.post(`/admin/spotlight/weeks/${week.weekKey}/${action}`);
      await loadWeeks();
      if (detail?.week?.weekKey === week.weekKey) await openWeek(week.weekKey);
    } catch (err) {
      setError(err.response?.data?.message || "That action failed");
    }
  };

  const startEditWinner = (category) => {
    setEditCategory(category);
    setEditUserId(category.winner?.user?._id || "");
    setEditReason((category.winner?.reason || []).join("\n"));
  };

  const saveWinner = async () => {
    if (!editCategory || !detail?.week) return;
    setSavingWinner(true);
    try {
      await adminApi.put(`/admin/spotlight/weeks/${detail.week.weekKey}/winner`, {
        category: editCategory.key,
        userId: editUserId,
        reason: editReason.split("\n").map((line) => line.trim()).filter(Boolean),
      });
      setEditCategory(null);
      await openWeek(detail.week.weekKey);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that winner");
    } finally {
      setSavingWinner(false);
    }
  };

  const startEditPosition = (entry) => {
    setEditPosition(entry);
    setEditPositionUserId(entry.winner?.user?._id || "");
    setEditPositionReason((entry.winner?.reason || []).join("\n"));
  };

  const savePosition = async () => {
    if (!editPosition || !detail?.week) return;
    setSavingPosition(true);
    try {
      await adminApi.put(`/admin/spotlight/weeks/${detail.week.weekKey}/activity/${editPosition.position}`, {
        userId: editPositionUserId,
        reason: editPositionReason.split("\n").map((line) => line.trim()).filter(Boolean),
      });
      setEditPosition(null);
      await openWeek(detail.week.weekKey);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that position");
    } finally {
      setSavingPosition(false);
    }
  };

  const removePosition = async (entry) => {
    if (!detail?.week) return;
    try {
      await adminApi.delete(`/admin/spotlight/weeks/${detail.week.weekKey}/activity/${entry.position}`);
      await openWeek(detail.week.weekKey);
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove that position");
    }
  };

  const reviewNomination = async (id, action) => {
    try {
      await adminApi.patch(`/admin/spotlight/nominations/${id}`, { action });
      setNominations((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setNominationsError(err.response?.data?.message || "That action failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgba(236,154,30,0.14)] text-[#EC9A1E]">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[15px] font-black text-[#12141C]">Weekly Spotlight</p>
            <p className="text-[11px] font-bold text-[#667085]">Generate, review, and publish each week's rankings</p>
          </div>
        </div>

        <button
          type="button"
          disabled={generating}
          onClick={() => generateWeek(getCurrentWeekKeyGuess())}
          className="flex items-center gap-2 rounded-2xl bg-[#4338CA] px-4 py-2.5 text-[12px] font-black text-white active:scale-95 disabled:opacity-60"
        >
          <RefreshCcw size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating..." : "Generate this week"}
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-2xl px-4 py-2 text-[12px] font-black transition ${
              tab === item ? "bg-[#4338CA] text-white" : "bg-[#F2F4F7] text-[#344054]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Weeks" && (
        loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError text={error} onRetry={loadWeeks} />
        ) : weeks.length === 0 ? (
          <AdminEmpty title="No weeks yet" text="Generate the current week to get started." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {weeks.map((week) => (
              <article key={week.weekKey} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
                <button type="button" onClick={() => openWeek(week.weekKey)} className="w-full text-left active:scale-[0.99]">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-black text-[#12141C]">
                      Week {week.weekNumber}, {week.year}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        week.status === "published" ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#F2F4F7] text-[#667085]"
                      }`}
                    >
                      {week.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-[#667085]">{week.weekKey}</p>
                </button>
                <div className="mt-3 flex gap-2">
                  <AdminButton onClick={() => generateWeek(week.weekKey, true)}>Regenerate</AdminButton>
                  <AdminButton onClick={() => togglePublish(week)} danger={week.status === "published"}>
                    {week.status === "published" ? "Unpublish" : "Publish"}
                  </AdminButton>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {tab === "Nominations" && (
        nominationsLoading ? (
          <AdminLoading />
        ) : nominationsError ? (
          <AdminError text={nominationsError} onRetry={loadNominations} />
        ) : nominations.length === 0 ? (
          <AdminEmpty title="No pending nominations" text="Member nominations for Spotlight will show up here." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {nominations.map((nomination) => (
              <article key={nomination._id} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
                <p className="text-[13px] font-black text-[#12141C]">
                  {nomination.category?.replace(/_/g, " ")} &middot; {nomination.targetType}
                </p>
                <p className="mt-1 text-[12px] font-bold text-[#667085]">
                  Nominated by {nomination.nominator?.fullName || nomination.nominator?.username || "a user"}
                </p>
                {nomination.targetUser && (
                  <p className="mt-1 text-[12px] font-bold text-[#667085]">
                    For {nomination.targetUser.fullName || nomination.targetUser.username}
                  </p>
                )}
                {nomination.note && (
                  <p className="mt-2 whitespace-pre-line text-[12.5px] font-semibold text-[#344054]">{nomination.note}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => reviewNomination(nomination._id, "approve")}
                    className="flex items-center gap-1.5 rounded-2xl bg-[#ECFDF3] px-3 py-2 text-[11px] font-black text-[#067647] active:scale-95"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewNomination(nomination._id, "reject")}
                    className="flex items-center gap-1.5 rounded-2xl bg-[#FEF3F2] px-3 py-2 text-[11px] font-black text-[#D92D20] active:scale-95"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.week ? `Week ${detail.week.weekNumber}, ${detail.week.year}` : "Spotlight week"}
        subtitle={detail?.week?.weekKey}
      >
        {detailLoading ? (
          <AdminLoading rows={2} />
        ) : detail?.error ? (
          <AdminError text={detail.error} />
        ) : !detail?.week ? (
          <AdminEmpty title="Not generated" text="This week hasn't been generated yet." />
        ) : (
          <div className="space-y-3">
            {(detail.week.categories || []).map((category) => (
              <div key={category.key} className="rounded-2xl border border-[#EAECF0] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-black text-[#12141C]">
                    {category.emoji} {category.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEditWinner(category)}
                    className="text-[11px] font-black text-[#4338CA]"
                  >
                    {category.winner ? "Edit" : "Set winner"}
                  </button>
                </div>
                {category.winner ? (
                  <>
                    <p className="mt-1 text-[12px] font-bold text-[#344054]">
                      {category.winner.user?.fullName || category.winner.user?.username}
                    </p>
                    {category.winner.reason?.length > 0 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#667085]">
                        {category.winner.reason.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-bold uppercase text-[#98A2B3]">{category.winner.setBy}</p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-[#98A2B3]">No winner set</p>
                )}
              </div>
            ))}

            <p className="pt-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              ⚡ Top Active leaderboard
            </p>
            <p className="-mt-2 text-[10.5px] font-semibold text-[#98A2B3]">
              Auto-filled by activity score every week. Edit a position to lock it — locked positions never get
              overwritten by regeneration, and that person is skipped for the rest of the board.
            </p>
            {(detail.week.activityBoard || []).map((entry) => (
              <div key={entry.position} className="rounded-2xl border border-[#EAECF0] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-black text-[#12141C]">#{entry.position}</p>
                  <div className="flex items-center gap-3">
                    {entry.winner && (
                      <button
                        type="button"
                        onClick={() => removePosition(entry)}
                        className="text-[11px] font-black text-[#D92D20]"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditPosition(entry)}
                      className="text-[11px] font-black text-[#4338CA]"
                    >
                      {entry.winner ? "Edit" : "Set"}
                    </button>
                  </div>
                </div>
                {entry.winner ? (
                  <>
                    <p className="mt-1 text-[12px] font-bold text-[#344054]">
                      {entry.winner.user?.username || entry.winner.user?.fullName}
                    </p>
                    {entry.winner.reason?.length > 0 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#667085]">
                        {entry.winner.reason.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-bold uppercase text-[#98A2B3]">{entry.winner.setBy}</p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-[#98A2B3]">No one at this position</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer
        open={Boolean(editPosition)}
        onClose={() => setEditPosition(null)}
        title={`Set position #${editPosition?.position || ""}`}
        footer={
          <button
            type="button"
            disabled={savingPosition || !editPositionUserId}
            onClick={savePosition}
            className="h-11 w-full rounded-2xl bg-[#4338CA] text-[12.5px] font-black text-white active:scale-95 disabled:opacity-60"
          >
            {savingPosition ? "Saving..." : "Save position"}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              User ID
            </label>
            <input
              value={editPositionUserId}
              onChange={(event) => setEditPositionUserId(event.target.value.trim())}
              placeholder="Paste the user's ID"
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
            <p className="mt-1 text-[10.5px] font-bold text-[#98A2B3]">
              Find the ID on the Users admin page — full search picker is a future improvement.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Reason (one bullet per line)
            </label>
            <textarea
              value={editPositionReason}
              onChange={(event) => setEditPositionReason(event.target.value)}
              rows={4}
              placeholder={"12-day streak\n4 people invited"}
              className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={Boolean(editCategory)}
        onClose={() => setEditCategory(null)}
        title={`Set winner: ${editCategory?.label || ""}`}
        footer={
          <button
            type="button"
            disabled={savingWinner || !editUserId}
            onClick={saveWinner}
            className="h-11 w-full rounded-2xl bg-[#4338CA] text-[12.5px] font-black text-white active:scale-95 disabled:opacity-60"
          >
            {savingWinner ? "Saving..." : "Save winner"}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              User ID
            </label>
            <input
              value={editUserId}
              onChange={(event) => setEditUserId(event.target.value.trim())}
              placeholder="Paste the winner's user ID"
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
            <p className="mt-1 text-[10.5px] font-bold text-[#98A2B3]">
              Find the ID on the Users admin page — full search picker is a future improvement.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Reason (one bullet per line)
            </label>
            <textarea
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              rows={4}
              placeholder={"Completed 18 Journey Days\nReached 5,000 Followers"}
              className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
