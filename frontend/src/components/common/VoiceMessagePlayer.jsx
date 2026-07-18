import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";

// A tiny deterministic PRNG seeded from a string — used so each voice
// message gets its own fixed-looking waveform (rather than a flat bar or a
// waveform that reshuffles every re-render), without actually decoding and
// analyzing the audio's real amplitude data. This matches how most chat
// apps fake a "waveform" for a quick visual read of the clip, not a real
// scientific rendering of it.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return function next() {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
}

function buildWaveform(seed, bars = 30) {
  const rand = seededRandom(String(seed || "voice-message"));
  return Array.from({ length: bars }, () => 0.28 + rand() * 0.72);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// WhatsApp-style voice note bubble: play/pause button, a fake waveform with
// a scrub dot that tracks real playback progress, elapsed/total duration,
// and the sender's avatar with a small mic badge. Shared between Chat.jsx
// (DM) and CircleCommunity.jsx (community chat) so both look identical.
export default function VoiceMessagePlayer({
  url,
  seedKey,
  isSent = false,
  avatarUrl = "",
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useRef(buildWaveform(seedKey || url)).current;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", () => setPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const seekTo = (event) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const track = event.currentTarget;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const activeBarCount = Math.round(progress * bars.length);

  const iconColor = isSent ? "#ffffff" : "var(--imc-indigo-text)";
  const trackColor = isSent ? "rgba(255,255,255,0.35)" : "var(--imc-border)";
  const trackActiveColor = isSent ? "#ffffff" : "var(--imc-indigo-text)";
  const timeColor = isSent ? "rgba(255,255,255,0.85)" : "var(--imc-text-faint)";

  return (
    <div
      className="mt-1.5 flex min-w-[230px] max-w-[260px] items-center gap-2.5 rounded-[18px] px-3 py-2.5"
      style={{ background: isSent ? "rgba(255,255,255,0.14)" : "var(--imc-surface-2)" }}
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95"
        style={{ background: isSent ? "rgba(255,255,255,0.22)" : "var(--imc-surface)", color: iconColor }}
      >
        {playing ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" style={{ marginLeft: 1 }} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          onClick={seekTo}
          className="relative flex h-6 cursor-pointer items-center gap-[2.5px]"
        >
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-[2.5px] shrink-0 rounded-full"
              style={{
                height: `${Math.max(height * 100, 20)}%`,
                background: index < activeBarCount ? trackActiveColor : trackColor,
              }}
            />
          ))}
          {duration > 0 && (
            <span
              className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 rounded-full shadow-sm"
              style={{
                left: `${progress * 100}%`,
                background: trackActiveColor,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
        <div className="mt-1 text-[10px] font-bold" style={{ color: timeColor }}>
          {formatDuration(playing || currentTime > 0 ? currentTime : duration)}
        </div>
      </div>

      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <span
          className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full text-white"
          style={{
            background: "#25D366",
            border: `2px solid ${isSent ? "rgba(255,255,255,0.14)" : "var(--imc-surface-2)"}`,
          }}
        >
          <Mic size={9} />
        </span>
      </div>
    </div>
  );
}
