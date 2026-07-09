import { useRef, useState } from "react";
import {
  MoreVertical,
  Copy,
  Flag,
  X,
  ShieldAlert,
  Ban,
  MessageCircleWarning,
  UserX,
  ImageOff,
  Trash2,
} from "lucide-react";

import { reportJourney, deleteJourney } from "../../api/journeyApi";

const reportOptions = [
  { key: "spam", label: "Spam or fake", icon: ShieldAlert },
  { key: "nudity", label: "Nudity or sexual content", icon: ImageOff },
  { key: "hate", label: "Hate or harassment", icon: MessageCircleWarning },
  { key: "violence", label: "Violence or dangerous content", icon: Ban },
  { key: "impersonation", label: "Impersonation", icon: UserX },
];

function JourneyMenu({ journeyId, isMine = false, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const copyLink = async () => {
    const url = `${window.location.origin}/journey/${journeyId || ""}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // silent
    }

    setOpen(false);
  };

  const submitReport = async (reason) => {
    if (!journeyId) return;

    setError("");

    try {
      await reportJourney(journeyId, reason);
      setReported(true);

      setTimeout(() => {
        setReported(false);
        setReportOpen(false);
        setOpen(false);
      }, 900);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to submit report";
      setError(message);
    }
  };

  const confirmDelete = async () => {
    if (!journeyId || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteJourney(journeyId);
      setDeleteOpen(false);
      setOpen(false);
      onDeleted?.();
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || "Unable to delete. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className="grid h-7 w-7 place-items-center rounded-full active:scale-95"
        >
          <MoreVertical size={15} style={{ color: "var(--imc-text-muted)" }} />
        </button>

        {open && (
          <>
            {/* Invisible full-screen tap catcher — tapping ANYWHERE else on
                the page closes the menu, not just the three-dot button
                again. Replaces the old mousedown/menuRef listener, which
                wasn't reliably firing from touch taps in the WebView. */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-1.5 shadow-xl">
              <MenuItem icon={Copy} label="Copy link" onClick={copyLink} />

              {isMine ? (
                <MenuItem
                  icon={Trash2}
                  label="Delete journey"
                  red
                  onClick={() => {
                    setDeleteError("");
                    setDeleteOpen(true);
                  }}
                />
              ) : (
                <MenuItem
                  icon={Flag}
                  label="Report journey"
                  red
                  onClick={() => {
                    setError("");
                    setReportOpen(true);
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-end justify-center bg-black/35 backdrop-blur-[2px]"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] px-5 pb-6 pt-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-black" style={{ color: "var(--imc-text)" }}>
                  Report this journey
                </h2>
                <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                  Choose the reason. Reports are private.
                </p>
              </div>

              <button
                onClick={() => {
                  setReportOpen(false);
                  setError("");
                }}
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
              >
                <X size={18} />
              </button>
            </div>

            {reported ? (
              <div className="rounded-[22px] bg-[#ECFDF3] p-4 text-center">
                <p className="text-[14px] font-black text-[#079455]">
                  Report submitted
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-3 rounded-[18px] bg-red-50 p-3 text-[12px] font-black text-red-600">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  {reportOptions.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => submitReport(item.key)}
                      className="flex w-full items-center gap-3 rounded-[20px] p-3 text-left ring-1 ring-[var(--imc-border)] active:scale-[0.99]"
                      style={{ background: "var(--imc-surface)" }}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FEF2F2] text-[#D92D20]">
                        <item.icon size={19} />
                      </div>

                      <span className="flex-1 text-[13px] font-black" style={{ color: "var(--imc-text)" }}>
                        {item.label}
                      </span>

                      <Flag size={15} style={{ color: "var(--imc-text-faint)" }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-6 backdrop-blur-[2px]"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-[26px] p-5 shadow-2xl"
            style={{ background: "var(--imc-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FEF2F2] text-[#D92D20]">
              <Trash2 size={22} />
            </div>

            <h2 className="mt-3 text-center text-[16px] font-black" style={{ color: "var(--imc-text)" }}>
              Delete this journey?
            </h2>
            <p className="mt-1 text-center text-[12.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              This removes the entire journey and all of its updates — every
              day, every milestone. This can't be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-[16px] bg-red-50 p-3 text-center text-[12px] font-black text-red-600">
                {deleteError}
              </div>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="h-11 flex-1 rounded-2xl text-[13px] font-black active:scale-[0.99] disabled:opacity-60"
                style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="h-11 flex-1 rounded-2xl bg-[#D92D20] text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, red, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] font-black active:bg-[var(--imc-surface-2)] ${
        red ? "text-red-600" : ""
      }`}
      style={red ? {} : { color: "var(--imc-text)" }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default JourneyMenu;
