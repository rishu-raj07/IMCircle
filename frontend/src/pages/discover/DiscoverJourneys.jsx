import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, RefreshCcw, Sparkles } from "lucide-react";

import JourneyReelSlide from "./JourneyReelSlide";
import { getJourneyDiscoverFeed } from "../../api/journeyApi";

// Full-screen, snap-scrolling "reels" style discovery feed — journeys only,
// ranked by the viewer's chosen interest (see backend's
// getJourneyDiscoverFeed / INTEREST_KEYWORDS) instead of a flat
// reverse-chronological list of every public milestone.
function DiscoverJourneys() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personalized, setPersonalized] = useState(false);
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getJourneyDiscoverFeed();

        setMilestones(Array.isArray(res?.milestones) ? res.milestones : []);
        setPersonalized(Boolean(res?.personalized));
        setPrimaryInterest(res?.primaryInterest || "");
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to load discover feed"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#000" }}>
      <header
        className="fixed inset-x-0 top-0 z-30 mx-auto flex w-full max-w-[430px] items-center justify-between px-4 py-3"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full active:scale-95"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>

        <div className="flex items-center gap-1.5">
          <Compass size={15} color="#fff" />
          <h1 className="text-[14px] font-black text-white">
            Discover Journeys
          </h1>
        </div>

        <div className="h-9 w-9" />
      </header>

      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <RefreshCcw className="mx-auto animate-spin" color="rgba(255,255,255,0.6)" />
            <p className="mt-3 text-[13px] font-bold text-white/60">
              Loading journeys...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex h-screen items-center justify-center px-8 text-center">
          <p className="text-[13px] font-bold text-white/70">{error}</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex h-screen flex-col items-center justify-center gap-2 px-8 text-center">
          <Compass size={30} color="rgba(255,255,255,0.4)" />
          <p className="text-[14px] font-black text-white">
            No journeys to discover yet
          </p>
          <p className="text-[12px] font-semibold text-white/50">
            Check back once more people start sharing their journeys.
          </p>
        </div>
      ) : (
        <div
          className="no-scrollbar mx-auto w-full max-w-[430px] snap-y snap-mandatory overflow-y-scroll"
          style={{ height: "100dvh" }}
        >
          {milestones.map((milestone) => (
            <div key={milestone._id} className="snap-start" style={{ height: "100dvh" }}>
              <JourneyReelSlide milestone={milestone} />
            </div>
          ))}

          {/* End-of-feed card — once the viewer has scrolled through every
              suggested journey (interest-matched ones ranked first, the rest
              of the public feed after), close the loop instead of just
              running out of slides, and nudge them to start their own. */}
          <div className="snap-start" style={{ height: "100dvh" }}>
            <EndOfFeedSlide
              primaryInterest={primaryInterest}
              onCreateJourney={() => navigate("/create-journey")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EndOfFeedSlide({ primaryInterest, onCreateJourney }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: "#000" }}
    >
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{ background: "rgba(236,154,30,0.16)" }}
      >
        <Sparkles size={26} color="#EC9A1E" />
      </div>

      <div>
        <p className="text-[17px] font-black text-white">That's it for now</p>
        <p className="mt-1.5 text-[13px] font-semibold leading-5 text-white/55">
          {primaryInterest
            ? `You've seen today's ${primaryInterest} journeys and more from the community.`
            : "You've made it through today's journeys from the community."}{" "}
          Check back later for new updates.
        </p>
      </div>

      <button
        type="button"
        onClick={onCreateJourney}
        className="mt-2 rounded-full px-5 py-3 text-[13px] font-black active:scale-95"
        style={{ background: "#EC9A1E", color: "#12141C" }}
      >
        Create your journey to discover other people as well
      </button>
    </div>
  );
}

export default DiscoverJourneys;
