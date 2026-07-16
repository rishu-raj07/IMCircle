import { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getCurrentSpotlight } from "../../api/spotlightApi";

// Compact, self-contained banner that surfaces this week's Spotlight on
// Home without touching Home's own feed-loading logic or the bottom nav —
// it fetches independently and renders nothing if there's no published
// week yet, so it's a pure addition with zero risk to the existing feed.
function SpotlightTeaser() {
  const navigate = useNavigate();
  const [week, setWeek] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getCurrentSpotlight();
        if (!cancelled) setWeek(res?.week || null);
      } catch {
        if (!cancelled) setWeek(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!week) return null;

  const topWinner = (week.categories || []).find((category) => category.winner)?.winner;
  const winnerName = topWinner?.user?.fullName || topWinner?.user?.username;

  return (
    <button
      type="button"
      onClick={() => navigate("/spotlight")}
      className="mt-3 flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg, rgba(236,154,30,0.12), rgba(67,56,202,0.1))",
        border: "1px solid var(--imc-border)",
      }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
        style={{ background: "linear-gradient(135deg, #FFE7A0, #EC9A1E)" }}
      >
        <Sparkles size={18} color="#fff" strokeWidth={2.4} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-black" style={{ color: "var(--imc-text)" }}>
          This week's Spotlight
        </p>
        <p className="truncate text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
          {winnerName ? `${winnerName} and more are featured` : "See who's featured this week"}
        </p>
      </div>

      <ChevronRight size={17} style={{ color: "var(--imc-text-muted)" }} />
    </button>
  );
}

export default SpotlightTeaser;
