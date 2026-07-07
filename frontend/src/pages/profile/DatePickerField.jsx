import { CalendarDays } from "lucide-react";

function formatDateForInput(date) {
  if (!date) return "";

  try {
    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

function formatDisplay(date) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export default function DatePickerField({
  label,
  value,
  onChange,
  maxDate,
  minDate,
  required = false,
}) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <div className="relative">
        <CalendarDays
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-indigo-text)]"
        />

        <input
          type="date"
          value={formatDateForInput(value)}
          min={minDate ? formatDateForInput(minDate) : undefined}
          max={maxDate ? formatDateForInput(maxDate) : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-[58px] w-full rounded-[20px] border border-[rgba(18,20,28,0.14)] bg-[var(--imc-surface)] pl-12 pr-4 text-[16px] font-black text-[var(--imc-text)] outline-none focus:border-[#4338CA]"
        />
      </div>

      {value && (
        <p className="mt-2 text-[12px] font-bold text-[var(--imc-text-muted)]">
          Selected: {formatDisplay(value)}
        </p>
      )}
    </div>
  );
}