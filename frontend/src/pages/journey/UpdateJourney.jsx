import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Images,
  Send,
  X,
  Flame,
  Trophy,
  RefreshCcw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import {
  createJourneyMilestone,
  getSingleJourney,
} from "../../api/journeyApi";
import { trackEvent } from "../../utils/analyticsTracker";

function getCurrentDay(createdAt) {
  if (!createdAt) return 1;

  const start = new Date(createdAt);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return (
    Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

// A gallery photo is only accepted if its file metadata puts it on today's
// calendar date (device-local timezone) — the closest signal the plain
// browser File API exposes without an EXIF-parsing dependency. Most phone
// camera apps write `lastModified` at capture time, so a photo taken
// earlier today and picked from the gallery still passes; anything older
// is rejected so the "must be today's real update" spirit of the live
// camera capture is preserved even when picking from the gallery.
function isFromToday(file) {
  if (!file?.lastModified) return false;

  const modified = new Date(file.lastModified);
  const today = new Date();

  return (
    modified.getFullYear() === today.getFullYear() &&
    modified.getMonth() === today.getMonth() &&
    modified.getDate() === today.getDate()
  );
}

function UpdateJourney() {
  const navigate = useNavigate();
  const { journeyId } = useParams();
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  const [journey, setJourney] = useState(null);
  const [update, setUpdate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isVideoFile, setIsVideoFile] = useState(false);
  const [captureSource, setCaptureSource] = useState("camera");
  const [galleryError, setGalleryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const loadJourney = async () => {
    try {
      setLoading(true);
      const res = await getSingleJourney(journeyId);
      setJourney(res?.journey || null);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to load journey");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (journeyId) loadJourney();
  }, [journeyId]);

  const todayDay = getCurrentDay(journey?.createdAt);
  const targetDays = journey?.targetDays || journey?.totalDays || 100;
  const progress = Math.min(Math.round((todayDay / targetDays) * 100), 100);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Please capture an image or video file");
      return;
    }

    setGalleryError("");
    setCaptureSource("camera");
    setImageFile(file);
    setIsVideoFile(file.type.startsWith("video/"));
    setImagePreview(URL.createObjectURL(file));
  };

  // Gallery picker: images only (no video — a stale video can't be
  // date-checked the same way), and must be from today.
  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setGalleryError("Only photos can be added from your gallery.");
      if (galleryRef.current) galleryRef.current.value = "";
      return;
    }

    if (!isFromToday(file)) {
      setGalleryError(`Only a photo from today (${new Date().toLocaleDateString()}) can be added — pick one taken earlier today, or use the camera instead.`);
      if (galleryRef.current) galleryRef.current.value = "";
      return;
    }

    setGalleryError("");
    setCaptureSource("gallery");
    setImageFile(file);
    setIsVideoFile(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setIsVideoFile(false);
    setCaptureSource("camera");
    setGalleryError("");
    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!update.trim()) {
      alert("Write today’s progress.");
      return;
    }

    if (!imageFile) {
      alert("Capture a live progress photo or video.");
      return;
    }

    try {
      setPosting(true);

      const formData = new FormData();
      formData.append("title", milestone.trim() || `Day ${todayDay} Update`);
      formData.append("description", update.trim());
      formData.append("type", milestone.trim() ? "win" : "update");
      formData.append("captureSource", captureSource);
      formData.append("capturedAt", new Date().toISOString());

      if (milestone.trim()) {
        formData.append("achievement", milestone.trim());
      }

      formData.append("image", imageFile);

      const milestoneRes = await createJourneyMilestone(journeyId, formData);

      trackEvent("journey_milestone_created", {
        entityType: "journey_milestone",
        entityId: milestoneRes?.milestone?._id,
        metadata: { journeyId, day: todayDay },
      }).catch(() => {});

      navigate(`/journey/${journeyId}`);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error.message ||
          "Failed to publish update"
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--imc-surface)]">
        <div className="text-center">
          <RefreshCcw className="mx-auto animate-spin text-[var(--imc-text-faint)]" />
          <p className="mt-3 text-[13px] font-bold text-[var(--imc-text-muted)]">
            Loading journey...
          </p>
        </div>
      </div>
    );
  }

  if (!journey) return null;

  if (journey.status !== "active" || journey.isActive === false) {
    const missed = journey.status === "uncompleted";
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--imc-bg)] px-5">
        <div className="w-full max-w-[430px] rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-6 text-center shadow-[0_18px_50px_rgba(18,20,28,0.08)]">
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${missed ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[rgba(5,150,105,0.12)] text-[#059669]"}`}>
            {missed ? <X size={26} /> : <Trophy size={26} />}
          </div>
          <h1 className="mt-4 text-[20px] font-black text-[var(--imc-text)]">
            {missed ? "This journey was missed" : "This journey is complete"}
          </h1>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
            {missed
              ? journey.uncompletedReason || "A required daily update was missed, so new updates are closed."
              : "This journey has reached its target and no longer accepts daily updates."}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/journey/${journeyId}`)}
            className="mt-5 h-12 w-full rounded-2xl bg-[var(--imc-surface-strong)] text-[13px] font-black text-[var(--imc-on-surface-strong)] active:scale-[0.98]"
          >
            View journey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--imc-surface)] pb-28">
      <header className="sticky top-0 z-20 border-b border-[rgba(18,20,28,0.08)] bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-[16px] font-black text-[var(--imc-text)]">
            Update Journey
          </h1>

          <button
            type="button"
            disabled={posting}
            onClick={handleSubmit}
            className="rounded-full bg-[#12141C] px-4 py-2 text-[13px] font-black text-white disabled:opacity-60 active:scale-95"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4">
        <section className="py-4">
          <div className="rounded-[28px] border border-[var(--imc-border)] bg-gradient-to-br from-[#ECEBF9] via-white to-[#ECEBF9] p-4 shadow-[0_14px_35px_rgba(33,43,99,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--imc-indigo-text)]">
                  {journey.title}
                </p>

                <h2 className="mt-2 text-[24px] font-black leading-8 text-[var(--imc-text)]">
                  Day {todayDay}
                </h2>

                <p className="mt-2 text-[12px] font-bold leading-5 text-[var(--imc-text-muted)]">
                  Capture today’s real progress. One update is allowed per day.
                </p>
              </div>

              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm">
                <Flame size={24} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black text-[var(--imc-text)]">
                  Day {todayDay} of {targetDays}
                </p>
                <p className="text-[11px] font-black text-[var(--imc-indigo-text)]">
                  {progress}%
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4338CA] to-[#4338CA]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[rgba(18,20,28,0.08)] py-4">
          <textarea
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            placeholder="What progress did you make today?"
            className="min-h-[150px] w-full resize-none bg-transparent text-[18px] font-semibold leading-8 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
          />

          {imagePreview && (
            <div className="relative mt-4 overflow-hidden rounded-[24px] border border-[rgba(18,20,28,0.08)]">
              {isVideoFile ? (
                <video
                  src={imagePreview}
                  className="max-h-[360px] w-full object-cover"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={imagePreview}
                  alt="Journey progress"
                  className="max-h-[360px] w-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={removeImage}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </section>

        <section className="border-b border-[rgba(18,20,28,0.08)] py-4">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--imc-text)]">
            <Trophy size={16} />
            Milestone
          </div>

          <input
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            placeholder="Optional: 5km run, first client, completed module"
            className="w-full bg-transparent text-[14px] font-semibold text-slate-800 outline-none placeholder:text-[var(--imc-text-faint)]"
          />
        </section>

        {galleryError && (
          <p className="pt-3 text-[11.5px] font-bold leading-5 text-[#D92D20]">
            {galleryError}
          </p>
        )}

        <section className="flex items-center justify-between gap-2 py-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--imc-surface-2)] px-4 py-3 text-[13px] font-black text-[var(--imc-text)] active:scale-95"
          >
            <Camera size={17} />
            Capture Live
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            hidden
            onChange={handleImageChange}
          />

          {/* Gallery fallback — same-day photos only (see isFromToday), so
              this can't be used to backfill old photos as if they were
              today's real progress. Images only, no video, since a video's
              recording date can't be checked the same lightweight way. */}
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            aria-label="Upload today's photo from gallery"
            title="Upload today's photo from gallery"
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <Images size={18} />
          </button>

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleGalleryChange}
          />

          <button
            type="button"
            disabled={posting}
            onClick={handleSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#12141C] px-5 py-3 text-[13px] font-black text-white disabled:opacity-60 active:scale-95"
          >
            <Send size={16} />
            Publish
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

export default UpdateJourney;
