function ActivityCard({ icon, title, value, color = "purple" }) {
  const colors = {
    purple: "bg-[#ECEBF9] text-[var(--imc-indigo-text)]",
    green: "bg-[#ECFDF3] text-[#059669]",
    orange: "bg-[#FDF3E3] text-[#8A5A12]",
    blue: "bg-[#ECEBF9] text-[var(--imc-indigo-text)]",
    pink: "bg-[#FDF2F8] text-[var(--imc-indigo-text)]",
  };

  return (
    <div className="rounded-2xl border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-2 text-center shadow-sm">
      <div
        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ${colors[color]}`}
      >
        {icon}
      </div>

      <p className="mt-1 text-[8px] font-bold text-[var(--imc-text-muted)]">
        {title}
      </p>

      <h3 className="text-[12px] font-black text-[var(--imc-text)]">
        {value}
      </h3>
    </div>
  );
}

export default ActivityCard;