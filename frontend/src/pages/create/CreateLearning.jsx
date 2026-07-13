import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Hash, Image, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { createLearning } from "../../api/learningApi";
import { trackEvent } from "../../utils/analyticsTracker";

const MAX_LESSON_LENGTH = 3000;

function CreateLearning() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [headline, setHeadline] = useState("");
  const [lesson, setLesson] = useState("");
  const [tag, setTag] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanTags = useMemo(() => {
    return tag
      .split(/[,\s]+/)
      .map((item) => item.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 5);
  }, [tag]);

  const topic = cleanTags[0] || "Learning";

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!lesson.trim()) {
      alert("Please write what you learned today.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", headline.trim());
      formData.append("content", lesson.trim());
      formData.append("topic", topic);
      formData.append("type", "learning");
      formData.append("tags", JSON.stringify(cleanTags));

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const created = await createLearning(formData);

      trackEvent("learning_created", {
        entityType: "learning",
        entityId: created?.learning?._id || created?._id,
        metadata: { topic, hasImage: Boolean(imageFile) },
      }).catch(() => {});

      navigate("/learning-view/me");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to publish learning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)]">
      <main className="relative min-h-screen w-full max-w-[430px] overflow-hidden bg-[var(--imc-bg)] text-[var(--imc-text)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(67,56,202,0.10), transparent 34%), linear-gradient(180deg, var(--imc-marigold-tint) 0%, var(--imc-bg) 28%)",
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)] shadow-sm active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex h-11 items-center gap-2 rounded-full bg-[var(--imc-indigo)] px-4 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(67,56,202,0.24)] disabled:opacity-60 active:scale-95"
              aria-label="Publish learning"
            >
              <Send size={16} /> Publish
            </button>
          </div>

          <section className="mt-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--imc-marigold-tint)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--imc-marigold-dark)]">
              Daily learning
            </div>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
              placeholder="Give your learning a headline"
              className="w-full bg-transparent text-[28px] font-black leading-[1.1] text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />
            <p className="mt-2 text-[12px] font-semibold text-[var(--imc-text-muted)]">Share one useful idea your circle can apply today.</p>
          </section>

          {/*
            The image block and textarea below each carry their own
            min-height floor (250px / 150px). On short viewports — most
            commonly once the on-screen keyboard opens — the space actually
            available here can drop below that combined floor. With
            overflow-hidden that used to clip the bottom of whatever the
            person was typing, effectively hiding it behind the image.
            overflow-y-auto lets this card scroll internally instead, so
            the image stays visible and long text just scrolls into view
            rather than collapsing/overlapping.
          */}
          <section className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-[26px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-[0_16px_42px_rgba(18,20,28,0.07)]">
            {imagePreview ? (
              <div className="relative min-h-[210px] overflow-hidden bg-[var(--imc-surface-2)]">
                <img
                  src={imagePreview}
                  alt="Learning preview"
                  className="h-auto max-h-[360px] w-full object-contain"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white"
                  aria-label="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="m-4 flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[rgba(67,56,202,0.28)] bg-[rgba(67,56,202,0.04)] text-[var(--imc-indigo-text)] active:scale-[0.99]"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(67,56,202,0.10)]">
                  <Image size={24} />
                </span>
                <span className="text-[13px] font-black">Add a supporting image</span>
                <span className="text-[10px] font-semibold text-[var(--imc-text-muted)]">Tap to choose from your device</span>
              </button>
            )}

            <textarea
              value={lesson}
              onChange={(e) =>
                setLesson(e.target.value.slice(0, MAX_LESSON_LENGTH))
              }
              placeholder="What did you learn today?"
              className="min-h-[190px] flex-1 resize-none border-t border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-5 text-[18px] font-semibold leading-7 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </section>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 text-[var(--imc-indigo-text)] shadow-sm">
              <Hash size={17} className="shrink-0" />
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value.slice(0, 80))}
                placeholder="hashtag"
                className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
              />
            </label>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm"
              aria-label="Add image"
            >
              <Image size={21} />
            </button>
          </div>

          {cleanTags.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {cleanTags.map((item) => (
                <span
                  key={item}
                  className="shrink-0 rounded-full bg-[var(--imc-indigo-tint)] px-3 py-1.5 text-[11px] font-black text-[var(--imc-indigo-text)]"
                >
                  #{item}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--imc-indigo)] text-[14px] font-black text-white shadow-[0_12px_28px_rgba(67,56,202,0.24)] disabled:opacity-60 active:scale-[0.99]"
            >
              <Send size={18} /> {loading ? "Publishing..." : "Publish learning"}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />
        </div>
      </main>
    </div>
  );
}

export default CreateLearning;
