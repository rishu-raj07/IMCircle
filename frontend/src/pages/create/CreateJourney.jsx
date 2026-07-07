import { useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  X,
  Flame,
  Trophy,
  Lock,
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import {
  createJourney,
  createJourneyMilestone,
  updateJourneyCover,
} from "../../api/journeyApi";
import { trackEvent } from "../../utils/analyticsTracker";

const dayOptions = [7, 14, 21, 30, 50, 75, 100, 180, 365];
const MAX_ABOUT = 100;
const MAX_UPDATE = 500;

function CreateJourney() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const coverRef = useRef(null);

  const [journeyTitle, setJourneyTitle] = useState("");
  const [about, setAbout] = useState("");
  const [update, setUpdate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [targetDays, setTargetDays] = useState(100);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const todayDay = 1;
  const progress = Math.min(Math.round((todayDay / targetDays) * 100), 100);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + targetDays - 1);

  const deadlineText = deadline.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the cover.");
      return;
    }

    setError("");
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    if (coverRef.current) coverRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please capture an image file.");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeProgressImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeCoverImage = () => {
    setCoverFile(null);
    setCoverPreview("");
    if (coverRef.current) coverRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!journeyTitle.trim()) {
      setError("Add your journey name.");
      return;
    }

    if (!about.trim()) {
      setError("Add an about section for this journey.");
      return;
    }

    if (!update.trim()) {
      setError("Write today's progress.");
      return;
    }

    if (!imageFile) {
      setError("Capture a live progress photo to publish your journey.");
      return;
    }

    setError("");

    try {
      setLoading(true);

      const journeyRes = await createJourney({
        title: journeyTitle.trim(),
        description: about.trim(),
        targetDays,
        totalDays: targetDays,
        deadline: deadline.toISOString(),
        isPublic: true,
      });

      const journeyId = journeyRes?.journey?._id;

      if (!journeyId) {
        throw new Error("Journey was created but ID was not returned.");
      }

      trackEvent("journey_created", {
        entityType: "journey",
        entityId: journeyId,
        metadata: { targetDays },
      }).catch(() => {});

      if (coverFile) {
        const coverFormData = new FormData();
        coverFormData.append("cover", coverFile);
        await updateJourneyCover(journeyId, coverFormData).catch(() => {
          // Cover is a nice-to-have — don't block publishing the journey
          // itself if this single upload fails.
        });
      }

      const formData = new FormData();
      formData.append("title", milestone.trim() || "Today's Progress");
      formData.append("description", update.trim());
      formData.append("type", milestone.trim() ? "win" : "update");
      formData.append("captureSource", "camera");
      formData.append("capturedAt", new Date().toISOString());

      if (milestone.trim()) {
        formData.append("achievement", milestone.trim());
      }

      formData.append("image", imageFile);

      const milestoneRes = await createJourneyMilestone(journeyId, formData);

      trackEvent("journey_milestone_created", {
        entityType: "journey_milestone",
        entityId: milestoneRes?.milestone?._id,
        metadata: { journeyId, day: 1 },
      }).catch(() => {});

      navigate(`/journey/${journeyId}`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to publish journey"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] pb-24 text-[var(--imc-text)]">
      <div className="sticky top-0 z-20 border-b border-[var(--imc-border)] bg-[var(--imc-surface)]/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-[17px] font-black text-[var(--imc-text)]">
            Start Journey
          </h1>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="text-[13px] font-black text-[var(--imc-marigold-dark)] disabled:opacity-50"
          >
            {loading ? "Posting" : "Post"}
          </button>
        </div>
      </div>

      <main className="px-4 pt-4">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[12.5px] font-bold text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-sm">
          <div className="relative h-32 overflow-hidden rounded-t-[30px] bg-[var(--imc-surface-2)]">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Journey cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Flame className="mx-auto text-[var(--imc-indigo-text)]" size={26} />
                  <p className="mt-1.5 text-[10.5px] font-black uppercase tracking-[0.18em] text-[var(--imc-indigo-text)]">
                    ImCircle Journey
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-2 text-[11px] font-black text-white active:scale-95"
            >
              <ImagePlus size={14} />
              {coverPreview ? "Change" : "Cover"}
            </button>

            {coverPreview && (
              <button
                type="button"
                onClick={removeCoverImage}
                className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white active:scale-95"
                aria-label="Remove cover"
              >
                <X size={15} />
              </button>
            )}

            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleCoverChange}
            />
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--imc-surface-2)] p-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[var(--imc-text)]">
                  Day {todayDay} of {targetDays} &middot; {progress}%
                </p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--imc-text-muted)]">
                  Deadline: {deadlineText}
                </p>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--imc-border)]">
                  <div
                    className="h-full rounded-full bg-[#4338CA]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]">
                <Flame size={20} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-2.5 py-1.5 text-[10.5px] font-black text-[var(--imc-text)]">
                <Lock size={12} />
                Auto day count
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-2.5 py-1.5 text-[10.5px] font-black text-[var(--imc-text)]">
                <Camera size={12} />
                Live capture
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-2.5 py-1.5 text-[10.5px] font-black text-[var(--imc-text)]">
                <CheckCircle2 size={12} />
                Streak proof
              </span>
            </div>

            <div className="mt-4 border-t border-[var(--imc-border)] pt-4">
              <input
                value={journeyTitle}
                onChange={(e) => setJourneyTitle(e.target.value)}
                placeholder="Name your journey"
                className="w-full bg-transparent text-[18px] font-black text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
                Example: 100 Days Fitness, Learning Coding, Building Grera
              </p>
            </div>

            <div className="mt-4 border-t border-[var(--imc-border)] pt-4">
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
                maxLength={MAX_ABOUT}
                placeholder="What is this journey about?"
                className="min-h-[70px] w-full resize-none bg-transparent text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <p className="text-right text-[10px] font-bold text-[var(--imc-text-faint)]">
                {about.length}/{MAX_ABOUT}
              </p>
            </div>

            <div className="mt-2 border-t border-[var(--imc-border)] pt-4">
              <div className="mb-2.5 flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--imc-indigo-text)]" />
                <p className="text-[12.5px] font-black text-[var(--imc-text)]">
                  How long is your journey?
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {dayOptions.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTargetDays(days)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95 ${
                      targetDays === days
                        ? "bg-[#4338CA] text-white"
                        : "bg-[var(--imc-surface-2)] text-[var(--imc-text-muted)]"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--imc-border)] pt-4">
              <p className="mb-2 text-[12.5px] font-black text-[var(--imc-text)]">
                What progress did you make today?
              </p>

              <textarea
                value={update}
                onChange={(e) => setUpdate(e.target.value.slice(0, MAX_UPDATE))}
                maxLength={MAX_UPDATE}
                placeholder="Share day 1 of your journey..."
                className="min-h-[100px] w-full resize-none bg-transparent text-[15px] font-semibold leading-7 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <p className="text-right text-[10px] font-bold text-[var(--imc-text-faint)]">
                {update.length}/{MAX_UPDATE}
              </p>

              {imagePreview ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-[var(--imc-border)]">
                  <img
                    src={imagePreview}
                    alt="Journey progress"
                    className="max-h-[300px] w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeProgressImage}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface-2)] px-4 py-3.5 text-[12.5px] font-black text-[var(--imc-text)] active:scale-[0.98]"
                >
                  <Camera size={17} />
                  Capture Live Progress Photo
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleImageChange}
              />
            </div>

            <div className="mt-4 border-t border-[var(--imc-border)] pt-4">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-black text-[var(--imc-text)]">
                <Trophy size={15} />
                Milestone (optional)
              </div>

              <input
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="First client, 5km run, Day 10 completed"
                className="w-full rounded-2xl bg-[var(--imc-surface-2)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          Journey updates use live camera capture to make progress more real.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

export default CreateJourney;
