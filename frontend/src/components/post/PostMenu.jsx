import { useState } from "react";
import {
  MoreHorizontal,
  Copy,
  EyeOff,
  Flag,
  X,
  ShieldAlert,
  Ban,
  MessageCircleWarning,
  UserX,
  ImageOff,
  Trash2,
} from "lucide-react";

import { reportPost, deletePost } from "../../api/postApi";
import { deleteLearning } from "../../api/learningApi";

const reportOptions = [
  { key: "spam", label: "Spam or fake", icon: ShieldAlert },
  { key: "nudity", label: "Nudity or sexual content", icon: ImageOff },
  { key: "hate", label: "Hate or harassment", icon: MessageCircleWarning },
  { key: "violence", label: "Violence or dangerous content", icon: Ban },
  { key: "impersonation", label: "Impersonation", icon: UserX },
];

function PostMenu({ post = {}, type = "post", isMine = false, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const postId = post?._id;

  const copyLink = async () => {
    const url = `${window.location.origin}/${
      type === "learning" ? "learning" : "post"
    }/${postId || ""}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // silent
    }

    setOpen(false);
  };

  const handleNotInterested = () => {
    setOpen(false);
  };

  const submitReport = async (reason) => {
    if (!postId) return;

    setError("");

    try {
      await reportPost(postId, reason);
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
    if (!postId || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      if (type === "learning") {
        await deleteLearning(postId);
      } else {
        await deletePost(postId);
      }

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
      <div className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)] active:scale-95 active:bg-[rgba(18,20,28,0.08)]"
        >
          <MoreHorizontal size={18} />
        </button>

        {open && (
          <>
            {/* Invisible full-screen tap catcher — tapping ANYWHERE else on
                the page closes the menu, not just the three-dot button
                again. Same proven pattern as the report/delete sheets below
                and SideDrawer's backdrop, more reliable on touch/WebView
                than a document-level "click outside" listener. */}
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

            <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-[22px] border border-[#EEE4DA] bg-[var(--imc-surface-2)] p-1.5 shadow-xl">
              <MenuItem icon={Copy} label="Copy link" onClick={copyLink} />
              <MenuItem
                icon={EyeOff}
                label="Not interested"
                onClick={handleNotInterested}
              />

              {isMine ? (
                <MenuItem
                  icon={Trash2}
                  label={type === "learning" ? "Delete learning" : "Delete post"}
                  red
                  onClick={() => {
                    setDeleteError("");
                    setDeleteOpen(true);
                  }}
                />
              ) : (
                <MenuItem
                  icon={Flag}
                  label="Report post"
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
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/35 backdrop-blur-[2px]">
          <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface-2)] px-5 pb-6 pt-4 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-black text-[var(--imc-text)]">
                  Report this post
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
                  Choose the reason. Reports are private.
                </p>
              </div>

              <button
                onClick={() => {
                  setReportOpen(false);
                  setError("");
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
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
                      className="flex w-full items-center gap-3 rounded-[20px] bg-[var(--imc-surface)] p-3 text-left ring-1 ring-[#EEE4DA] active:scale-[0.99]"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FEF2F2] text-[#D92D20]">
                        <item.icon size={19} />
                      </div>

                      <span className="flex-1 text-[13px] font-black text-[var(--imc-text)]">
                        {item.label}
                      </span>

                      <Flag size={15} className="text-[var(--imc-text-faint)]" />
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
            className="w-full max-w-[360px] rounded-[26px] bg-[var(--imc-surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FEF2F2] text-[#D92D20]">
              <Trash2 size={22} />
            </div>

            <h2 className="mt-3 text-center text-[16px] font-black text-[var(--imc-text)]">
              {type === "learning" ? "Delete this learning?" : "Delete this post?"}
            </h2>
            <p className="mt-1 text-center text-[12.5px] font-semibold text-[var(--imc-text-muted)]">
              This can't be undone. It'll be removed from your profile and everyone's feed.
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
                className="h-11 flex-1 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text)] active:scale-[0.99] disabled:opacity-60"
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
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-[13px] font-black active:bg-[var(--imc-surface-2)] ${
        red ? "text-red-600" : "text-[var(--imc-text)]"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default PostMenu;
