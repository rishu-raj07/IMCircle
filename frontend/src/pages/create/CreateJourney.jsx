import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  X,
  Flame,
  Trophy,
  CalendarDays,
  ImagePlus,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  createJourney,
  createJourneyMilestone,
  getMyJourneys,
  updateJourneyCover,
} from "../../api/journeyApi";
import { trackEvent } from "../../utils/analyticsTracker";

const dayOptions = [7, 14, 21, 30, 50, 75, 100, 180, 365];
const MAX_ABOUT = 100;
const MAX_UPDATE = 500;

function CreateJourney() {
  const navigate = useNavigate();
  const coverRef = useRef(null);
  const calendarRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [journeyTitle, setJourneyTitle] = useState("");
  const [about, setAbout] = useState("");
  const [update, setUpdate] = useState("");
  const [milestone, setMilestone] = useState("");
  const [targetDays, setTargetDays] = useState(100);
  const [calendarDate, setCalendarDate] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [activeJourneyCount, setActiveJourneyCount] = useState(0);

  const todayDay = 1;
  const progress = Math.min(Math.round((todayDay / targetDays) * 100), 100);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + targetDays - 1);

  const deadlineText = deadline.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const minimumCalendarDate = toDateInputValue(new Date());
  const maximumCalendarDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 364);
    return toDateInputValue(date);
  })();

  const handleCalendarDate = (value) => {
    if (!value) {
      setCalendarDate("");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(`${value}T00:00:00`);
    const days = Math.max(1, Math.round((selected.getTime() - today.getTime()) / 86400000) + 1);

    if (days > 365) {
      setError("A new journey can be a maximum of 365 days. You can extend it after completing it.");
      return;
    }

    setError("");
    setCalendarDate(value);
    setTargetDays(days);
  };

  const openCalendar = () => {
    const input = calendarRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  const selectedCalendarLabel = calendarDate
    ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Select date";

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

  const removeProgressImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
  };

  const closeLiveCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraStarting(false);
  };

  const startCameraStream = async (facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Live camera capture is not supported on this device.");
      return;
    }

    try {
      setError("");
      setCameraStarting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;
      setCameraFacingMode(facingMode);
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraStarting(false);
      }
    } catch (cameraError) {
      setError("Camera permission is required. Gallery uploads are not accepted for journey proof.");
      setCameraStarting(false);
    }
  };

  const openLiveCamera = () => startCameraStream(cameraFacingMode);

  const switchLiveCamera = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    startCameraStream(nextMode);
  };

  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
      setCameraStarting(false);
    }
  }, [cameraOpen]);

  useEffect(() => {
    let mounted = true;
    getMyJourneys()
      .then((res) => {
        const raw = res?.journeys || res?.data?.journeys || res?.data?.items || res?.items || res?.data || res || [];
        const list = Array.isArray(raw) ? raw : [];
        const count = list.filter(
          (journey) => journey?.status !== "completed" && journey?.status !== "uncompleted" && journey?.isActive !== false
        ).length;
        if (mounted) setActiveJourneyCount(count);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const captureLivePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not capture the photo. Please try again.");
        return;
      }

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      const file = new File([blob], `journey-live-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      setError("");
      closeLiveCamera();
    }, "image/jpeg", 0.9);
  };

  const removeCoverImage = () => {
    setCoverFile(null);
    setCoverPreview("");
    if (coverRef.current) coverRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (activeJourneyCount >= 3) {
      setError("You can have a maximum of 3 active journeys. Complete or close one before starting another.");
      return;
    }

    if (targetDays < 1 || targetDays > 365) {
      setError("Choose a journey length between 1 and 365 days.");
      return;
    }

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
    <div className="min-h-screen bg-[var(--imc-bg)] text-[var(--imc-text)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-bg)] pb-[max(28px,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-4 pb-3 pt-[14px] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--imc-surface)] text-[var(--imc-text)] active:scale-95"
            style={{ border: "1px solid var(--imc-border)" }}
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] font-black tracking-tight text-[var(--imc-text)]">Start Journey</h1>
            <p className="text-[10.5px] font-semibold text-[var(--imc-text-muted)]">Turn daily progress into a story</p>
          </div>

          <button
            type="button"
            disabled={loading || activeJourneyCount >= 3}
            onClick={handleSubmit}
            className="flex h-10 min-w-[76px] items-center justify-center rounded-full px-4 text-[12px] font-black text-white shadow-[0_6px_16px_rgba(67,56,202,0.35)] active:scale-95 disabled:opacity-50 disabled:shadow-none"
            style={{ background: "linear-gradient(135deg, var(--imc-indigo), var(--imc-indigo-dark))" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Start"}
          </button>
        </div>
      </header>

      <main className="px-4 py-5">
        {activeJourneyCount >= 3 && (
          <div className="mb-4 rounded-[18px] border px-4 py-3" style={{ background: "var(--imc-action-soft)", borderColor: "var(--imc-action-border)" }}>
            <p className="text-[12px] font-black text-[var(--imc-text)]">Three active journeys already</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[var(--imc-text-muted)]">Complete or close one journey before starting another.</p>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[12.5px] font-bold text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <div
            className="relative h-44 overflow-hidden rounded-[28px]"
            style={
              coverPreview
                ? { background: "var(--imc-surface)" }
                : {
                    background:
                      "linear-gradient(135deg, var(--imc-action-soft), var(--imc-marigold-soft))",
                    boxShadow: "0 8px 24px rgba(18,20,28,0.06)",
                  }
            }
          >
            {coverPreview ? (
              <>
                <img
                  src={coverPreview}
                  alt="Journey cover"
                  className="h-full w-full object-cover"
                />
                {/* Bottom scrim so the Change/Remove controls stay legible
                    over any photo, the same way a story/reel editor treats
                    its own cover picker. */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)" }}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div
                    className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]"
                    style={{ boxShadow: "0 6px 16px rgba(18,20,28,0.10)" }}
                  >
                    <Flame size={24} />
                  </div>
                  <p className="mt-3 text-[13px] font-black text-[var(--imc-text)]">
                    Add a journey cover
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-[var(--imc-text-muted)]">
                    Make it recognizable in the feed
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-black text-white backdrop-blur-md active:scale-95"
              style={{ background: "rgba(18,20,28,0.55)" }}
            >
              <ImagePlus size={14} />
              {coverPreview ? "Change" : "Add cover"}
            </button>

            {coverPreview && (
              <button
                type="button"
                onClick={removeCoverImage}
                className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md active:scale-95"
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

          <div className="mt-4 rounded-[24px] bg-[var(--imc-surface)] p-4" style={{ boxShadow: "0 6px 20px rgba(18,20,28,0.05)" }}>
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--imc-indigo-soft)] p-3">
              <div className="min-w-0">
                <p className="text-[12.5px] font-black text-[var(--imc-text)]">
                  Day {todayDay} of {targetDays}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--imc-text-muted)]">
                  Deadline: {deadlineText}
                </p>
              </div>

              {/* Progress ring instead of a flat bar + separate icon box —
                  reads at a glance like a fitness-app stat, not a form
                  field. */}
              <div className="relative grid h-12 w-12 shrink-0 place-items-center">
                <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--imc-border)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--imc-indigo)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(progress / 100) * 97.4}, 97.4`}
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-[var(--imc-indigo-text)]">{progress}%</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-black text-[var(--imc-text)]">
                Journey name
              </label>
              <input
                value={journeyTitle}
                onChange={(e) => setJourneyTitle(e.target.value)}
                placeholder="e.g. 100 Days of Fitness"
                className="h-12 w-full rounded-[14px] bg-[var(--imc-surface-2)] px-3.5 text-[14px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-black text-[var(--imc-text)]">
                About this journey
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
                maxLength={MAX_ABOUT}
                placeholder="What do you want to achieve?"
                className="min-h-[88px] w-full resize-none rounded-[14px] bg-[var(--imc-surface-2)] p-3.5 text-[13px] font-semibold leading-5 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <p className="text-right text-[10px] font-bold text-[var(--imc-text-faint)]">
                {about.length}/{MAX_ABOUT}
              </p>
            </div>

            <div className="mt-5 border-t border-[var(--imc-border)] pt-4">
              <div className="mb-2.5 flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--imc-indigo-text)]" />
                <p className="text-[12.5px] font-black text-[var(--imc-text)]">
                  How long is your journey?
                </p>
              </div>

              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {dayOptions.map((days) => {
                  const active = targetDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setTargetDays(days);
                        setCalendarDate("");
                      }}
                      className="flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95"
                      style={
                        active
                          ? {
                              background: "linear-gradient(135deg, var(--imc-indigo), var(--imc-indigo-dark))",
                              color: "#fff",
                              boxShadow: "0 4px 12px rgba(67,56,202,0.28)",
                            }
                          : { background: "var(--imc-surface-2)", color: "var(--imc-text-muted)" }
                      }
                    >
                      {active && <Check size={12} />}
                      {days} Days
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-3 flex items-center gap-3 rounded-[15px] bg-[var(--imc-surface-2)] px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[var(--imc-indigo-soft)] text-[var(--imc-indigo-text)]">
                  <CalendarDays size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] font-black text-[var(--imc-text)]">Choose an end date</span>
                  <span className="block text-[8.5px] font-semibold text-[var(--imc-text-muted)]">Perfect for exams, launches, or fixed goals</span>
                </span>
                <button
                  type="button"
                  onClick={openCalendar}
                  className="shrink-0 rounded-full bg-[var(--imc-surface)] px-3 py-2 text-[9.5px] font-black text-[var(--imc-indigo-text)] active:scale-95"
                  style={{ boxShadow: "0 2px 6px rgba(18,20,28,0.08)" }}
                >
                  {selectedCalendarLabel}
                </button>
                <input
                  ref={calendarRef}
                  type="date"
                  value={calendarDate}
                  min={minimumCalendarDate}
                  max={maximumCalendarDate}
                  onChange={(event) => handleCalendarDate(event.target.value)}
                  aria-label="Journey end date"
                  tabIndex={-1}
                  className="pointer-events-none absolute h-px w-px opacity-0"
                />
              </div>

              {calendarDate && (
                <p className="mt-2 text-[9.5px] font-bold text-[var(--imc-indigo-text)]">
                  Calendar plan selected: {targetDays} days, ending {deadlineText}
                </p>
              )}

              {targetDays === 365 && (
                <div className="mt-3 rounded-[15px] bg-[rgba(236,154,30,0.12)] px-3.5 py-3 text-[10.5px] font-bold leading-4 text-[#8A5700]">
                  Great—you’re going big! Complete this 365-day journey first, and then you can update or extend your journey.
                </div>
              )}
            </div>

          </div>

          <div className="mt-4 rounded-[24px] bg-[var(--imc-surface)] p-4" style={{ boxShadow: "0 6px 20px rgba(18,20,28,0.05)" }}>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-indigo-soft)] text-[var(--imc-indigo-text)]">
                  <Flame size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-[var(--imc-text)]">Share Day 1</p>
                  <p className="text-[10px] font-semibold text-[var(--imc-text-muted)]">Your first real progress entry</p>
                </div>
              </div>

              <textarea
                value={update}
                onChange={(e) => setUpdate(e.target.value.slice(0, MAX_UPDATE))}
                maxLength={MAX_UPDATE}
                placeholder="What progress did you make today?"
                className="min-h-[130px] w-full resize-none rounded-[16px] bg-[var(--imc-surface-2)] p-3.5 text-[14px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
              <p className="text-right text-[10px] font-bold text-[var(--imc-text-faint)]">
                {update.length}/{MAX_UPDATE}
              </p>

              {imagePreview ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl" style={{ boxShadow: "0 4px 14px rgba(18,20,28,0.08)" }}>
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
                  onClick={openLiveCamera}
                  disabled={cameraStarting}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[15px] px-4 py-3.5 text-[12px] font-black text-white shadow-[0_6px_16px_rgba(67,56,202,0.3)] active:scale-[0.98] disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, var(--imc-indigo), var(--imc-indigo-dark))" }}
                >
                  {cameraStarting ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                  {cameraStarting ? "Opening camera..." : "Capture Live Progress Photo"}
                </button>
              )}

            <div className="mt-4 border-t border-[var(--imc-border)] pt-4">
              <div className="relative">
                <Trophy size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--imc-marigold-text)]" />
                <input
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  placeholder="Milestone (optional) — first client, 5km run..."
                  className="w-full rounded-full bg-[var(--imc-surface-2)] py-2.5 pl-10 pr-3.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-[var(--imc-text-muted)]">
          Journey updates use live camera capture to make progress more real.
        </p>
      </main>

      {cameraOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80">
          <div className="w-full max-w-[430px] overflow-hidden rounded-t-[28px] bg-[#11131A] pb-[max(20px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <div>
                <h2 className="text-[14px] font-black">Live progress camera</h2>
                <p className="text-[9.5px] font-semibold text-white/60">Take a photo now—gallery uploads are disabled</p>
              </div>
              <button type="button" onClick={closeLiveCamera} aria-label="Close camera" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 active:scale-95">
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-[3/4] max-h-[68vh] w-full overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              <button
                type="button"
                onClick={switchLiveCamera}
                disabled={cameraStarting}
                aria-label={`Switch to ${cameraFacingMode === "environment" ? "front" : "back"} camera`}
                className="absolute right-3 top-3 flex h-11 items-center gap-2 rounded-full bg-black/55 px-3 text-[10px] font-black text-white backdrop-blur-md active:scale-95 disabled:opacity-60"
              >
                {cameraStarting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {cameraFacingMode === "environment" ? "Front" : "Back"}
              </button>
            </div>

            <div className="flex items-center justify-center px-5 py-5">
              <button
                type="button"
                onClick={captureLivePhoto}
                aria-label="Capture live photo"
                className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-[#4338CA] text-white shadow-[0_0_0_4px_rgba(255,255,255,0.18)] active:scale-95"
              >
                <Camera size={25} />
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default CreateJourney;
