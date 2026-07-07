import { Search } from "lucide-react";

function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface)] px-4 shadow-sm ring-1 ring-[rgba(18,20,28,0.08)]">
      <Search size={18} className="text-[var(--imc-text-muted)]" />

      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
      />
    </div>
  );
}

export default SearchBar;
