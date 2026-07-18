import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";

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
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [error, setError] = useState("");
  // Header (back button + title) only makes sense sitting over the very
  // first slide — once the viewer has scrolled past it, it just sits on top
  // of whatever photo/video is playing, like every other reels UI. Hide it
  // the moment the feed scrolls away from the top instead of leaving it
  // pinned for the whole session.
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleFeedScroll = (e) => {
    setHasScrolled(e.target.scrollTop > 20);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getJourneyDiscoverFeed();

        setMilestones(Array.isArray(res?.milestones) ? res.milestones : []);
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
    <div className="min-h-screen" style={{ background: "var(--imc-bg)" }}>
      <header
        className={`fixed inset-x-0 top-0 z-30 mx-auto flex w-full max-w-[430px] items-center justify-between px-4 pb-3 transition-opacity duration-200 ${
          hasScrolled ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          // This header is `position: fixed`, so it sits at the literal
          // viewport top regardless of body's safe-area padding — needs its
          // own inset here, same pattern as FullScreenReel's close button.
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
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
        <ReelSkeleton />
      ) : error ? (
        <div className="flex h-screen items-center justify-center px-8 text-center">
          <p className="text-[13px] font-bold" style={{ color: "var(--imc-text-muted)" }}>{error}</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex h-screen flex-col items-center justify-center gap-2 px-8 text-center">
          <Compass size={30} style={{ color: "var(--imc-text-faint)" }} />
          <p className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
            No journeys to discover yet
          </p>
          <p className="text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
            Check back once more people start sharing their journeys.
          </p>
        </div>
      ) : (
        <div
          onScroll={handleFeedScroll}
          className="no-scrollbar mx-auto w-full max-w-[430px] snap-y snap-mandatory overflow-y-scroll"
          style={{ height: "100dvh" }}
        >
          {milestones.map((milestone) => (
            <div
              key={milestone._id}
              className="snap-start"
              // scrollSnapStop forces the browser to land on THIS slide
              // before continuing, even on a fast flick — without it, quick
              // momentum scrolls can sail past one snap point straight into
              // the next, which read as "scrolling 2 at once".
              style={{ height: "100dvh", scrollSnapStop: "always" }}
            >
              <JourneyReelSlide milestone={milestone} />
            </div>
          ))}

          {/* End-of-feed card — once the viewer has scrolled through every
              suggested journey (interest-matched ones ranked first, the rest
              of the public feed after), close the loop instead of just
              running out of slides, and nudge them to start their own. */}
          <div className="snap-start" style={{ height: "100dvh", scrollSnapStop: "always" }}>
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

// Mirrors JourneyReelSlide's own layout (full-bleed media + a bottom info
// block with an avatar/name row, a title row, a caption line, and a
// progress row) instead of a generic spinner, so the very first thing a
// visitor sees already looks like "the reel feed", not a blank loading
// state that gets replaced by something with a completely different shape
// once data arrives.
function ReelSkeleton() {
  return (
    <div className="relative h-screen w-full max-w-[430px] overflow-hidden" style={{ background: "#1a1c22" }}>
      <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(160deg, #23262f 0%, #1a1c22 55%, #15161b 100%)" }} />

      <div className="absolute inset-x-3 animate-pulse" style={{ bottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
          <div className="h-3 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
          <div className="ml-auto h-8 w-16 shrink-0 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>

        <div className="mt-3 pl-11">
          <div className="h-3 w-36 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
        </div>

        <div className="mt-3 h-3 w-4/5 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
        <div className="mt-2 h-3 w-2/3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />

        <div className="mt-4 flex items-center justify-between">
          <div className="h-2.5 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
          <div className="h-2.5 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
      </div>
    </div>
  );
}

function EndOfFeedSlide({ primaryInterest, onCreateJourney }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: "var(--imc-bg)" }}
    >
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{ background: "rgba(236,154,30,0.16)" }}
      >
        <Sparkles size={26} color="#EC9A1E" />
      </div>

      <div>
        <p className="text-[17px] font-black" style={{ color: "var(--imc-text)" }}>That's it for now</p>
        <p className="mt-1.5 text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
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
