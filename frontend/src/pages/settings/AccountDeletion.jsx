import { Link } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Trash2,
  Keyboard,
  ShieldCheck,
  Mail,
  ArrowLeft,
  CheckCircle2,
  User,
  FileText,
  BookOpen,
  Compass,
  MessageSquare,
  Heart,
  Users,
  UserPlus,
  Send,
  Image as ImageIcon,
} from "lucide-react";

import { useSEO } from "../../hooks/useSEO";

// Public, unauthenticated compliance page — required by Google Play for any
// app that supports account creation. Deliberately standalone (no
// MainLayout/BottomNav, no ProtectedRoute) so it works for a signed-out
// reviewer or a search-engine crawler. Mirrors the copy/steps already
// implemented in-app via Settings > Delete Account (see DeleteAccountModal
// in Settings.jsx) — this page must stay in sync with that flow if it ever
// changes, since Play reviewers compare the two.

const STEPS = [
  { label: "Step 1", action: "Open IMCircle", icon: Compass },
  { label: "Step 2", action: "Open Privacy Policy", icon: SettingsIcon },
  { label: "Step 3", action: "Tap Delete your account", icon: Trash2 },
  { label: "Step 4", action: "Type DELETE", icon: Keyboard },
  { label: "Step 5", action: "Confirm deletion", icon: ShieldCheck },
];

const DELETED_ITEMS = [
  { label: "Profile", icon: User },
  { label: "Posts", icon: FileText },
  { label: "Learning posts", icon: BookOpen },
  { label: "Journey posts", icon: Compass },
  { label: "Comments", icon: MessageSquare },
  { label: "Likes", icon: Heart },
  { label: "Followers", icon: Users },
  { label: "Following", icon: UserPlus },
  { label: "Messages", icon: Send },
  { label: "Uploaded media associated with the account", icon: ImageIcon },
];

function AccountDeletion() {
  useSEO({
    title: "Delete Your Account",
    description:
      "Learn how to delete your IMCircle account, what data is removed, and how to request restoration.",
    path: "/delete-account",
    type: "website",
  });

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] text-[var(--imc-text)]">
      {/* Top bar */}
      <header className="border-b border-[var(--imc-border)]">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="IMCircle" className="h-8 w-auto object-contain" />
            <span className="text-[15px] font-black tracking-tight">IMCircle</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full bg-[var(--imc-surface-2)] px-4 py-2 text-[12.5px] font-black text-[var(--imc-text)] active:scale-[0.97]"
          >
            <ArrowLeft size={14} />
            Back to IMCircle
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="imc-lattice pointer-events-none absolute inset-0 opacity-60" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--imc-marigold-tint)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.6px] text-[var(--imc-marigold-dark)]">
              Account Deletion
            </span>

            <h1 className="mx-auto mt-5 max-w-[520px] text-[30px] font-black leading-[1.15] tracking-tight sm:text-[38px]">
              Delete Your IMCircle Account
            </h1>

            <p className="mx-auto mt-4 max-w-[440px] text-[15px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              Your privacy matters. You can delete your IMCircle account and
              remove its content from public access at any time.
            </p>
          </div>
        </section>

        {/* How to delete */}
        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-tight">How to delete</h2>
          <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--imc-text-muted)]">
            Deletion happens inside the IMCircle app — here's exactly where to find it.
          </p>

          <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.label}
                  className={`flex items-center gap-4 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm ${
                    index === STEPS.length - 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--imc-surface-strong)] text-[15px] font-black text-[var(--imc-marigold-text)]">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10.5px] font-black uppercase tracking-[0.6px] text-[var(--imc-text-faint)]">
                      {step.label}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[14.5px] font-black text-[var(--imc-text)]">
                      <Icon size={16} className="shrink-0 text-[var(--imc-indigo-text)]" />
                      {step.action}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* What is deleted */}
        <section className="mt-14">
          <h2 className="text-[22px] font-black tracking-tight">What is deleted</h2>
          <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--imc-text-muted)]">
            Confirming deletion immediately removes the following from public access on IMCircle.
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {DELETED_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3"
                >
                  <Icon size={16} className="shrink-0 text-[var(--imc-text-muted)]" />
                  <span className="text-[13.5px] font-bold text-[var(--imc-text)]">
                    {item.label}
                  </span>
                  <CheckCircle2
                    size={16}
                    className="ml-auto shrink-0 text-[var(--imc-success)]"
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <div className="rounded-[24px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-6 text-center sm:p-7">
            <h2 className="text-[16px] font-black text-[var(--imc-text)]">
              Restore your account
            </h2>
            <p className="mt-2.5 text-[13.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              To request restoration after deletion, email us from the address linked to your account.
            </p>
            <a
              href="mailto:rishu@imcircle.com"
              className="mt-3 inline-flex items-center gap-2 text-[14px] font-black text-[var(--imc-indigo-text)]"
            >
              <Mail size={16} />
              rishu@imcircle.com
            </a>
          </div>
        </section>

        {/* Retention policy */}
        <section className="mt-14">
          <div className="rounded-[24px] border border-[var(--imc-action-border)] bg-[var(--imc-action-soft)] p-6 sm:p-7">
            <h2 className="text-[16px] font-black text-[var(--imc-marigold-text)]">
              Retention Policy
            </h2>
            <p className="mt-2.5 text-[13.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
              Some security logs or legally required records may be retained
              for up to 90 days before permanent deletion where required by
              law.
            </p>
            <p className="mt-3 text-[13.5px] font-black text-[var(--imc-text)]">
              No deleted content remains publicly visible.
            </p>
          </div>
        </section>

        {/* Need help */}
        <section className="mt-14 text-center">
          <h2 className="text-[22px] font-black tracking-tight">Need help?</h2>
          <a
            href="mailto:rishu@imcircle.com"
            className="mt-3 inline-flex items-center gap-2 text-[15px] font-black text-[var(--imc-indigo-text)]"
          >
            <Mail size={16} />
            rishu@imcircle.com
          </a>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/privacy-policy"
              className="rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-2.5 text-[13px] font-black text-[var(--imc-text)] active:scale-[0.97]"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-2.5 text-[13px] font-black text-[var(--imc-text)] active:scale-[0.97]"
            >
              Terms
            </Link>
            <Link
              to="/"
              className="rounded-full border border-[var(--imc-action-border)] bg-[var(--imc-action-soft)] px-5 py-2.5 text-[13px] font-black text-[var(--imc-indigo-text)] active:scale-[0.97]"
            >
              Back to IMCircle
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AccountDeletion;
