function Input({ icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-[13px] font-black text-[var(--imc-text)]">
          {label}
        </label>
      )}

      <div className="flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4 ring-1 ring-transparent focus-within:ring-[#4338CA]/30">
        {icon && <span className="text-[var(--imc-indigo-text)]">{icon}</span>}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
        />
      </div>
    </div>
  );
}

export default Input;
