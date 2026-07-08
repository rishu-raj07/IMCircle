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
    <div className="flex min-h-screen justify-center bg-[#08090C]">
      <main className="relative min-h-screen w-full max-w-[430px] overflow-hidden bg-[var(--imc-bg)] text-[var(--imc-text)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--imc-marigold) 40%, var(--imc-surface)) 0%, color-mix(in srgb, var(--imc-marigold) 26%, var(--imc-bg)) 48%, var(--imc-bg) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/55 to-transparent" />

        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/25 text-white backdrop-blur active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#4338CA] text-white shadow-[0_12px_28px_rgba(67,56,202,0.28)] disabled:opacity-60 active:scale-95"
              aria-label="Publish learning"
            >
              <Send size={19} />
            </button>
          </div>

          <section className="mt-7">
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
              placeholder="Headline"
              className="w-full bg-transparent text-[34px] font-black leading-[1.05] text-white outline-none placeholder:text-white/80"
            />
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
          <section className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-[28px] bg-white/18 shadow-[0_18px_52px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            {imagePreview ? (
              <div className="relative h-[54%] min-h-[250px] overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Learning preview"
                  className="h-full w-full object-cover"
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
                className="flex h-[54%] min-h-[250px] flex-col items-center justify-center gap-3 text-white/85 active:scale-[0.99]"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-black/24">
                  <Image size={24} />
                </span>
                <span className="text-[13px] font-black">Add image</span>
              </button>
            )}

            <textarea
              value={lesson}
              onChange={(e) =>
                setLesson(e.target.value.slice(0, MAX_LESSON_LENGTH))
              }
              placeholder="What did you learn today?"
              className="min-h-[150px] flex-1 resize-none bg-white/92 px-5 py-5 text-[24px] font-black leading-[1.12] text-[#12141C] outline-none placeholder:text-[#12141C]/45"
            />
          </section>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-black/24 px-4 text-white backdrop-blur">
              <Hash size={17} className="shrink-0" />
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value.slice(0, 80))}
                placeholder="hashtag"
                className="min-w-0 flex-1 bg-transparent text-[14px] font-black text-white outline-none placeholder:text-white/70"
              />
            </label>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-12 w-12 place-items-center rounded-full bg-black/24 text-white backdrop-blur"
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
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#12141C]"
                >
                  #{item}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-white text-[14px] font-black text-[#12141C] disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? "Publishing..." : "Your learning"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#4338CA] text-white disabled:opacity-60"
              aria-label="Publish learning"
            >
              <Send size={20} />
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
