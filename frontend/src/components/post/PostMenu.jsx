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
} from "lucide-react";

import { reportPost } from "../../api/postApi";

const reportOptions = [
  { key: "spam", label: "Spam or fake", icon: ShieldAlert },
  { key: "nudity", label: "Nudity or sexual content", icon: ImageOff },
  { key: "hate", label: "Hate or harassment", icon: MessageCircleWarning },
  { key: "violence", label: "Violence or dangerous content", icon: Ban },
  { key: "impersonation", label: "Impersonation", icon: UserX },
];

function PostMenu({ post = {}, type = "post" }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");

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
          <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-[22px] border border-[#EEE4DA] bg-[var(--imc-surface-2)] p-1.5 shadow-xl">
            <MenuItem icon={Copy} label="Copy link" onClick={copyLink} />
            <MenuItem
              icon={EyeOff}
              label="Not interested"
              onClick={handleNotInterested}
            />
            <MenuItem
              icon={Flag}
              label="Report post"
              red
              onClick={() => {
                setError("");
                setReportOpen(true);
              }}
            />
          </div>
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