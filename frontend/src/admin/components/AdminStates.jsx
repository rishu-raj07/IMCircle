import { AlertCircle, Inbox, RefreshCcw } from "lucide-react";

// Shared loading / empty / error primitives used across every admin page,
// plus the small building blocks (MetricCard, AdminButton) the pages share.
// Pulled out of Dashboard.jsx into their own file so pages don't import UI
// atoms from one another's page modules.

export function AdminLoading({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-[24px] bg-[#EAECF0]"
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function AdminEmpty({ title, text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#D0D5DD] bg-white p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#F2F4F7] text-[#98A2B3]">
        <Inbox size={22} />
      </div>
      <p className="mt-3 text-[16px] font-black text-[#12141C]">{title}</p>
      <p className="mt-1 text-[13px] font-bold text-[#667085]">{text}</p>
    </div>
  );
}

export function AdminError({ title = "Something went wrong", text, onRetry }) {
  return (
    <div className="rounded-[28px] border border-[#FEE4E2] bg-[#FEF3F2] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#D92D20]">
        <AlertCircle size={22} />
      </div>
      <p className="mt-3 text-[16px] font-black text-[#912018]">{title}</p>
      {text && <p className="mt-1 text-[13px] font-bold text-[#B42318]">{text}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#12141C] px-4 py-2.5 text-[12px] font-black text-white active:scale-95"
        >
          <RefreshCcw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}

export function MetricCard({ label, value, hint }) {
  // Numbers get comma-formatted; anything already formatted as a string
  // (e.g. "3m", "42%") is shown as-is instead of being forced through
  // Number(...) — which would otherwise turn "3m" into "0".
  const display = typeof value === "number" ? value.toLocaleString() : value ?? "0";

  return (
    <div className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">{label}</p>
      <p className="mt-2 text-[28px] font-black text-[#12141C]">{display}</p>
      {hint && <p className="mt-1 text-[11px] font-bold text-[#98A2B3]">{hint}</p>}
    </div>
  );
}

export function AdminButton({ children, onClick, danger = false, disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-2 text-[12px] font-black active:scale-95 disabled:opacity-50 ${
        danger ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[#12141C] text-white"
      }`}
    >
      {children}
    </button>
  );
}
