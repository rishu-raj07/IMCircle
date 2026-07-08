// Compact, premium action row — replaces the old bulky grid-cols-5 button
// blocks. Config-driven (`items`) so both the owner and viewer variants in
// LearningView can share one component instead of duplicating markup.
//
// Each item: { key, icon: LucideIcon, label, count, active, activeClass, onClick, ariaLabel }
function LearningActionBar({ items = [] }) {
  return (
    <div className="flex items-center gap-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            aria-label={item.ariaLabel || item.label}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[12.5px] font-black transition-colors active:scale-[0.96] disabled:opacity-60 ${
              item.active
                ? item.activeClass ||
                  "bg-[var(--imc-indigo-tint)] text-[var(--imc-indigo-text)]"
                : "bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
            }`}
          >
            <Icon
              size={17}
              className={item.iconClassName}
              fill={item.filled ? "currentColor" : "none"}
            />
            {item.count != null ? <span>{item.count}</span> : null}
            {item.label && item.count == null ? <span>{item.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default LearningActionBar;
