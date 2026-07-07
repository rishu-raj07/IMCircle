function OpportunityTabs({ activeTab = "Recommended", onChange }) {
  const tabs = ["Recommended", "Recent", "Saved"];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const active = activeTab === tab;

        return (
          <button
            key={tab}
            onClick={() => onChange?.(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-black transition ${
              active
                ? "bg-[#4338CA] text-white"
                : "border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

export default OpportunityTabs;