import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Info,
  LogOut,
  MessageSquareWarning,
  Monitor,
  Moon,
  Share2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Sun,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SocialLogin } from "@capgo/capacitor-social-login";
import BottomNav from "../../components/navigation/BottomNav";
import Modal from "../../components/common/Modal";
import { useTheme } from "../../store/themeStore.jsx";
import { getSessionUser } from "../../utils/sessionUser";
import { logoutUser } from "../../store/authStore";
import { logoutApi } from "../../api/authApi";
import { unregisterPushToken } from "../../utils/pushNotifications";
import { reportProblem } from "../../api/supportApi";
import { GOOGLE_WEB_CLIENT_ID, IS_ANDROID, IS_IOS } from "../../config/platform.js";
import { shareApp } from "../../utils/shareLink";

const IS_NATIVE = IS_ANDROID || IS_IOS;

const APP_VERSION = "1.0.0";

function Settings() {
  const navigate = useNavigate();
  const { preference, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const user = getSessionUser();
  const email = user?.email || user?.username || "";

  // "Share IMCircle" is an app-level share (inviting someone to the app
  // itself) — always the Play Store link, regardless of platform. This is
  // deliberately separate from content shares (post/profile/journey), which
  // still use their own URLs via utils/shareLink.js — never overwritten by
  // this. The actual Capacitor-first / navigator.share / clipboard fallback
  // chain now lives in shareApp() (utils/shareLink.js) so this and the
  // top-right Profile share button can't drift out of sync again — the
  // Profile button previously skipped the Capacitor plugin entirely and
  // only ever fell through to a clipboard copy on native.
  const handleShare = () => shareApp();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // Must run before logoutApi() invalidates this session's auth
      // cookies — the push-token removal request needs to still be
      // authenticated as this user.
      await unregisterPushToken();
    } catch {
      // best-effort
    }

    // App-side logout only ever cleared this app's own session — it never
    // told Google's native Credential Manager (Android) / Sign-In SDK (iOS)
    // that the user signed out. That's harmless for password/OTP accounts,
    // but for anyone who signed in with Google, the picker was never shown
    // again afterward: Credential Manager just silently re-selected the
    // same Google account on the next login attempt, which looked
    // indistinguishable from "logout doesn't work." Calling initialize()
    // again here is safe/cheap even if this device already initialized it
    // this session (GoogleAuthButton.jsx's own promise doesn't survive an
    // app restart, so this can't assume that already happened).
    if (IS_NATIVE && GOOGLE_WEB_CLIENT_ID) {
      try {
        await SocialLogin.initialize({
          google: { webClientId: GOOGLE_WEB_CLIENT_ID },
        });
        await SocialLogin.logout({ provider: "google" });
      } catch {
        // best-effort — most users never signed in with Google at all, so
        // this rejecting (nothing to sign out of) is the common case, not
        // an error worth surfacing.
      }
    }

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

          <ThemeItem preference={preference} onChange={setTheme} />

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
            icon={<ShieldCheck size={19} />}
            title="Community Guidelines"
            onClick={() => navigate("/community-guidelines")}
          />

          <SettingItem
            icon={<Shield size={19} />}
            title="Child Safety Standards"
            onClick={() => navigate("/child-safety")}
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
            onClick={() => setLogoutOpen(true)}
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
      <Modal open={logoutOpen} onClose={() => !loggingOut && setLogoutOpen(false)} title="Log out?">
        <p className="text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          You can sign back in at any time. Your profile and activity will stay unchanged.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setLogoutOpen(false)}
            disabled={loggingOut}
            className="h-11 flex-1 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[12px] font-black text-[var(--imc-text)] active:scale-[0.99] disabled:opacity-50"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-11 flex-1 rounded-2xl bg-[var(--imc-surface-2)] text-[12px] font-black text-[var(--imc-text)] active:scale-[0.99] disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </Modal>
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

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function ThemeItem({ preference, onChange }) {
  return (
    <div className="border-b border-[var(--imc-border)] py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
          <Moon size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-black text-[var(--imc-text)]">App Theme</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[var(--imc-text-muted)]">
            System follows your device automatically
          </p>
        </div>
      </div>

      <div className="ml-[52px] mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="App theme">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(value)}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-black transition active:scale-[0.98]"
              style={{
                background: active ? "var(--imc-action-soft)" : "var(--imc-surface)",
                borderColor: active ? "var(--imc-action-border)" : "var(--imc-border)",
                color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
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

export default Settings;
