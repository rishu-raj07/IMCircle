import { Inbox } from "lucide-react";

function EmptyState({ title = "Nothing here yet", text = "Content will appear here soon." }) {
  return (
    <div className="rounded-[28px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        <Inbox size={26} />
      </div>

      <h3 className="mt-4 font-serif text-[17px] font-semibold text-[var(--imc-text)]">{title}</h3>
      <p className="mt-1 text-[12px] font-semibold text-[var(--imc-text-muted)]">{text}</p>
    </div>
  );
}

export default EmptyState;
