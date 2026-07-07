import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Info,
  LogOut,
  MessageSquareWarning,
  Moon,
  Share2,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import Modal from "../../components/common/Modal";
import { useTheme } from "../../store/themeStore.jsx";
import { getSessionUser } from "../../utils/sessionUser";
import { logoutUser } from "../../store/authStore";
import { logoutApi } from "../../api/authApi";
import { reportProblem } from "../../api/supportApi";
import { deleteMyAccount } from "../../api/profileApi";

const APP_VERSION = "1.0.0";

function Settings() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const user = getSessionUser();
  const email = user?.email || user?.username || "";

  const handleShare = async () => {
    const shareData = {
      title: "IMCircle",
      text: "Come share your journey with me on IMCircle.",
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      alert("Link copied to clipboard");
    } catch {
      // clipboard unavailable — nothing more we can do silently
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logoutApi();
    } catch {
      // best-effort — still clear local session even if the API call fails
    } finally {
      logoutUser();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Settings
            </h1>
          </div>
        </div>

        <div className="px-5 py-3">
          <SettingItem
            icon={<User size={19} />}
            title="My Account"
            onClick={() => navigate("/account")}
          />

          <ThemeItem isDark={isDark} onToggle={toggleTheme} />

          <SettingItem
            icon={<MessageSquareWarning size={19} />}
            title="Report a problem"
            onClick={() => setReportOpen(true)}
          />

          <SettingItem
            icon={<ShieldOff size={19} />}
            title="Blocked Accounts"
            onClick={() => navigate("/blocked-accounts")}
          />

          <SettingItem
            icon={<BookOpen size={19} />}
            title="FAQs"
            onClick={() => navigate("/faq")}
          />

          <SettingItem
            icon={<ShieldCheck size={19} />}
            title="Privacy Policy"
            onClick={() => navigate("/privacy-policy")}
          />

          <SettingItem
            icon={<FileText size={19} />}
            title="Terms of Service"
            onClick={() => navigate("/terms")}
          />

          <SettingItem
            icon={<Info size={19} />}
            title="About IMCircle"
            onClick={() => navigate("/about")}
          />

          <SettingItem
            icon={<Share2 size={19} />}
            title="Share App"
            onClick={handleShare}
          />

          <SettingItem
            icon={<LogOut size={19} />}
            title={loggingOut ? "Logging out…" : "Logout"}
            danger
            onClick={handleLogout}
            hideChevron
          />

          <SettingItem
            icon={<Trash2 size={19} />}
            title="Delete Account"
            danger
            onClick={() => setDeleteOpen(true)}
            hideChevron
          />

          <div className="mt-6 text-center">
            {email && (
              <p className="text-[11px] font-semibold text-[var(--imc-text-faint)]">
                Signed in using {email}
              </p>
            )}
            <p className="mt-1 text-[10px] font-bold text-[var(--imc-text-faint)]">
              Version {APP_VERSION}
            </p>
          </div>
        </div>

        <BottomNav />
      </div>

      <ReportProblemModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function SettingItem({ icon, title, onClick, danger, hideChevron }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[var(--imc-border)] py-4 text-left active:opacity-70"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          danger ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
        }`}
      >
        {icon}
      </div>

      <span
        className={`flex-1 text-[14px] font-black ${
          danger ? "text-[#D92D20]" : "text-[var(--imc-text)]"
        }`}
      >
        {title}
      </span>

      {!hideChevron && (
        <ChevronRight size={18} className="shrink-0 text-[var(--imc-text-faint)]" />
      )}
    </button>
  );
}

function ThemeItem({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-b border-[var(--imc-border)] py-4 text-left active:opacity-70"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        <Moon size={19} />
      </div>

      <span className="flex-1 text-[14px] font-black text-[var(--imc-text)]">
        App Theme
      </span>

      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: isDark ? "#4338CA" : "#E3E1F7" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-[var(--imc-surface)] shadow-sm transition-transform"
          style={{ transform: isDark ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

function ReportProblemModal({ open, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMessage("");
      setSent(false);
      setError("");
    }, 200);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError("");

    try {
      await reportProblem(trimmed);
      setSent(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't send your report. Try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Report a problem">
      {sent ? (
        <div className="py-4 text-center">
          <p className="text-[14px] font-black text-[var(--imc-text)]">
            Thanks — we've got it
          </p>
          <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">
            Your report was sent. We'll look into it and follow up if we need more details.
          </p>

          <button
            onClick={handleClose}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.99]"
          >
            Done
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[12px] font-semibold text-[var(--imc-text-muted)]">
            Tell us what went wrong. We'll get an email with your report.
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the problem you ran into…"
            rows={5}
            className="w-full resize-none rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
          />

          {error && (
            <p className="mt-2 text-[11px] font-semibold text-red-500">{error}</p>
          )}

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#4338CA] text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function DeleteAccountModal({ open, onClose }) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    if (deleting) return;
    onClose();
    setTimeout(() => {
      setConfirmText("");
      setError("");
    }, 200);
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE" || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await deleteMyAccount();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't delete your account. Try again."
      );
      setDeleting(false);
      return;
    }

    try {
      await logoutApi();
    } catch {
      // best-effort — account is already deleted server-side either way
    }

    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Delete Account">
      <p className="text-[12px] font-semibold text-[var(--imc-text-muted)]">
        This permanently deletes your IMCircle account and hides your posts,
        journeys, and profile. This can't be undone.
      </p>

      <p className="mt-4 text-[12px] font-black text-[var(--imc-text)]">
        Type DELETE to confirm
      </p>

      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        maxLength={10}
        className="mt-2 w-full rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
      />

      {error && (
        <p className="mt-2 text-[11px] font-semibold text-red-500">{error}</p>
      )}

      <button
        onClick={handleDelete}
        disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#D92D20] text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Permanently Delete My Account"}
      </button>
    </Modal>
  );
}

export default Settings;
