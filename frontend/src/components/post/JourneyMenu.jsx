import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

import { reportJourney } from "../../api/journeyApi";

const reportOptions = [
  { key: "spam", label: "Spam or fake", icon: ShieldAlert },
  { key: "nudity", label: "Nudity or sexual content", icon: ImageOff },
  { key: "hate", label: "Hate or harassment", icon: MessageCircleWarning },
  { key: "violence", label: "Violence or dangerous content", icon: Ban },
  { key: "impersonation", label: "Impersonation", icon: UserX },
];

function JourneyMenu({ journeyId }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
          <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-1.5 shadow-xl">
            <MenuItem icon={Copy} label="Copy link" onClick={copyLink} />
            <MenuItem
              icon={Flag}
              label="Report journey"
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
