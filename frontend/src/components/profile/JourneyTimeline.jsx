import { Rocket, CalendarCheck, Flame } from "lucide-react";

function JourneyTimeline() {
  const journeys = [
    {
      day: "32",
      title: "Fitness Transformation",
      update: "Completed workout and maintained diet discipline.",
      status: "Active",
    },
    {
      day: "12",
      title: "Learning UI Design",
      update: "Practiced mobile app cards and layout spacing.",
      status: "Active",
    },
    {
      day: "7",
      title: "Building IMCircle",
      update: "Completed profile and journey feature UI.",
      status: "Active",
    },
  ];

  return (
    <section className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
            <Rocket size={18} />
          </div>

          <div>
            <h2 className="text-[14px] font-black text-[var(--imc-text)]">
              Journey Timeline
            </h2>
            <p className="text-[10px] font-bold text-[var(--imc-text-muted)]">
              Real daily progress
            </p>
          </div>
        </div>

        <button className="text-[11px] font-black text-[var(--imc-indigo-text)]">
          View All
        </button>
      </div>

      <div className="space-y-2">
        {journeys.map((item) => (
          <div
            key={`${item.title}-${item.day}`}
            className="rounded-2xl bg-[var(--imc-surface-2)] p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]">
                <CalendarCheck size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[12px] font-black text-[var(--imc-text)]">
                    Day {item.day} of {item.title}
                  </h3>

                  <span className="flex items-center gap-1 rounded-full bg-[var(--imc-surface)] px-2 py-1 text-[8.5px] font-black text-[#059669]">
                    <Flame size={10} />
                    {item.status}
                  </span>
                </div>

                <p className="mt-1 text-[10.5px] font-semibold leading-4 text-[var(--imc-text-muted)]">
                  {item.update}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default JourneyTimeline;