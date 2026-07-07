import { useState } from "react";
import { Medal } from "lucide-react";

import { RANK_BADGE_META } from "../../utils/badges";

function RankBadge({ tier, rank, size = 20 }) {
  const [open, setOpen] = useState(false);
  const meta = RANK_BADGE_META[tier];

  if (!meta) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={meta.fullLabel}
        className="relative grid shrink-0 place-items-center rounded-full active:scale-90"
        style={{
          width: size + 10,
          height: size + 10,
          background: meta.gradient,
          boxShadow: `0 2px 8px ${meta.ring}66`,
        }}
      >
        <Medal size={size * 0.62} color="#fff" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 px-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface)] p-5 pb-7"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

            <div className="flex items-center gap-3">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
                style={{ background: meta.gradient }}
              >
                <Medal size={26} color="#fff" strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <h3 className="text-[17px] font-black text-[var(--imc-text)]">
                  {meta.fullLabel}
                </h3>
                <p className="mt-1 text-[12.5px] font-bold leading-5 text-[var(--imc-text-muted)]">
                  {meta.tooltip(rank)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 h-12 w-full rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default RankBadge;
