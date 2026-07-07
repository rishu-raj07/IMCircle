import { useRef, useState } from "react";
import {
  ArrowLeft,
  Image,
  Mic,
  Square,
  Send,
  X,
  Loader2,
  Globe2,
  Trophy,
  CircleHelp,
  MessageCircleQuestion,
  Lightbulb,
  Megaphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";
import { createPost } from "../../api/postApi";
import { currentUser } from "../../store/authStore";
import { trackEvent } from "../../utils/analyticsTracker";

const MAX_TEXT = 1500;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_FILES = 1;
const POST_PURPOSES = [
  {
    id: "general",
    label: "General",
    icon: Lightbulb,
    hint: "Share an update",
  },
  {
    id: "achievement",
    label: "Achievement",
    icon: Trophy,
    hint: "Celebrate a win",
  },
  {
    id: "question",
    label: "Question",
    icon: CircleHelp,
    hint: "Ask the community",
  },
  {
    id: "query",
    label: "General Query",
    icon: MessageCircleQuestion,
    hint: "Need help or clarity",
  },
  {
    id: "opportunity",
    label: "Opportunity",
    icon: Megaphone,
    hint: "Call for people",
  },
];

function CreatePost() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);

  const user = currentUser() || {};

  const [post, setPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [purpose, setPurpose] = useState("general");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const userName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    "IMCircle Builder";

  const rawUserImage =
    user?.avatar?.url ||
    user?.avatar ||
    user?.profileImage?.url ||
    user?.profileImage ||
    user?.profilePicture?.url ||
    user?.profilePicture ||
    user?.photo?.url ||
    user?.photo ||
    user?.picture?.url ||
    user?.picture ||
    user?.image?.url ||
    user?.image ||
    "";

  const uploadsBaseUrl = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");

  const userImage =
    typeof rawUserImage === "string" && rawUserImage.startsWith("/uploads")
      ? `${uploadsBaseUrl}${rawUserImage}`
      : rawUserImage;

  const userInitial = userName.charAt(0).toUpperCase();

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    const validFiles = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert("Only JPG, PNG or WEBP images are allowed.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is larger than 20MB.`);
        continue;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: file.type,
        kind: "image",
      });
    }

    setMediaFiles((prev) => {
      const currentImages = prev.filter((item) => item.kind === "image").length;
      const availableSlots = MAX_IMAGE_FILES - currentImages;

      if (availableSlots <= 0) {
        alert("You can add 1 image and 1 recorded voice note.");
        return prev;
      }

      if (validFiles.length > availableSlots) {
        alert("You can add 1 image and 1 recorded voice note.");
      }

      return [...prev, ...validFiles.slice(0, availableSlots)];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => {
      const removed = prev[index];

      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const startVoiceRecording = async () => {
    if (recording) return;

    if (mediaFiles.some((item) => item.kind === "audio")) {
      alert("Remove the current voice note before recording another one.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        if (!blob.size) return;

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: mimeType,
        });

        setMediaFiles((prev) => [
          ...prev.filter((item) => item.kind !== "audio"),
          {
            file,
            preview: URL.createObjectURL(blob),
            type: mimeType,
            kind: "audio",
          },
        ]);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      const timer = window.setInterval(() => {
        if (!recordingStartedAtRef.current) return;
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        );
      }, 500);

      recorder.timerId = timer;
    } catch (error) {
      alert("Microphone permission is needed to record voice.");
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (recorder.timerId) window.clearInterval(recorder.timerId);
    recorder.stop();
    setRecording(false);
    recordingStartedAtRef.current = null;
  };

  const handleSubmit = async () => {
    const cleanPost = post.trim();

    if (!cleanPost && mediaFiles.length === 0) {
      alert("Write something or add media.");
      return;
    }

    if (cleanPost.length > MAX_TEXT) {
      alert("Post cannot be more than 1500 characters.");
      return;
    }

    if (cleanPost && cleanPost.length < 10) {
      alert("Post must be at least 10 characters.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("content", cleanPost);
      formData.append("visibility", "public");
      formData.append("purpose", purpose);

      mediaFiles.forEach((item) => {
        formData.append("media", item.file);
      });

      const created = await createPost(formData);

      trackEvent("post_created", {
        entityType: "post",
        entityId: created?.post?._id || created?._id,
        metadata: { mediaCount: mediaFiles.length, purpose },
      }).catch(() => {});

      mediaFiles.forEach((item) => {
        if (item?.preview) URL.revokeObjectURL(item.preview);
      });

      navigate("/home");
    } catch (error) {
      alert(error?.response?.data?.message || "Post failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)] pb-24">
      <div className="sticky top-0 z-20 border-b border-[var(--imc-border)] bg-[var(--imc-surface)]/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-[17px] font-black text-[var(--imc-text)]">
            Create Post
          </h1>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-[13px] font-black text-[var(--imc-marigold-dark)] disabled:opacity-50"
          >
            {loading ? "Posting" : "Post"}
          </button>
        </div>
      </div>

      <main className="px-4 pt-4">
        <div className="rounded-[30px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-[#12141C]">
              {userImage && !avatarBroken ? (
                <img
                  src={userImage}
                  alt={userName}
                  onError={() => setAvatarBroken(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[13px] font-black text-[#EC9A1E]">
                  {userInitial}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-black text-[var(--imc-text)]">
                {userName}
              </h2>

              <button
                type="button"
                onClick={() => setVisibilityOpen(true)}
                className="mt-1 flex items-center gap-1 rounded-full bg-[var(--imc-surface-2)] px-2.5 py-1 text-[12px] font-black text-[var(--imc-text-muted)] active:scale-95"
              >
                <Globe2 size={13} />
                Public
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-[12px] font-black uppercase tracking-[0.5px] text-[var(--imc-text-muted)]">
              What is this post for?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {POST_PURPOSES.map((item) => {
                const Icon = item.icon;
                const active = purpose === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPurpose(item.id)}
                    className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left active:scale-[0.98]"
                    style={{
                      background: active ? "#12141C" : "var(--imc-surface-2)",
                      color: active ? "#ffffff" : "var(--imc-text)",
                    }}
                  >
                    <Icon size={17} />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-black">
                        {item.label}
                      </span>
                      <span
                        className="block truncate text-[10px] font-bold"
                        style={{
                          color: active
                            ? "rgba(255,255,255,0.7)"
                            : "var(--imc-text-muted)",
                        }}
                      >
                        {item.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={post}
            onChange={(e) => setPost(e.target.value.slice(0, MAX_TEXT))}
            placeholder="What's on your mind?"
            className="min-h-[120px] w-full resize-none bg-transparent text-[15px] font-semibold leading-6 text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
          />

          <p className="mt-1 text-right text-[11px] font-bold text-[var(--imc-text-faint)]">
            {post.length}/{MAX_TEXT}
          </p>

          {mediaFiles
            .filter((item) => item.kind === "image")
            .map((item) => (
              <div
                key={item.preview}
                className="relative mt-3 overflow-hidden rounded-2xl"
              >
                <img
                  src={item.preview}
                  alt="Attachment"
                  className="max-h-[320px] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(mediaFiles.indexOf(item))}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

          {mediaFiles
            .filter((item) => item.kind === "audio")
            .map((item) => (
              <div
                key={item.preview}
                className="mt-3 flex items-center gap-2 rounded-full bg-[var(--imc-surface-2)] px-3 py-2"
              >
                <Mic size={16} className="text-[var(--imc-text-muted)]" />
                <audio src={item.preview} controls className="h-8 flex-1" />
                <button
                  type="button"
                  onClick={() => removeMedia(mediaFiles.indexOf(item))}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(18,20,28,0.06)]"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

          <div className="mt-4 flex items-center gap-3 border-t border-[var(--imc-border)] pt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-11 w-11 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
              aria-label="Add image"
            >
              <Image size={19} />
            </button>

            {recording ? (
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-[13px] font-black text-white active:scale-95"
              >
                <Square size={16} />
                {Math.floor(recordingSeconds / 60)}:
                {String(recordingSeconds % 60).padStart(2, "0")}
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="grid h-11 w-11 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
                aria-label="Record voice note"
              >
                <Mic size={19} />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleMediaChange}
          />
        </div>
      </main>

      <BottomNav />

      {visibilityOpen ? (
        <div
          onClick={() => setVisibilityOpen(false)}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-[28px] bg-[var(--imc-surface)] p-5 pb-7"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />

            <h3 className="text-[15px] font-black text-[var(--imc-text)]">
              Who can see this post?
            </h3>

            <button
              type="button"
              onClick={() => setVisibilityOpen(false)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] p-3 text-left"
            >
              <Globe2 size={18} className="text-[var(--imc-text)]" />
              <span className="text-[13px] font-black text-[var(--imc-text)]">
                Public — anyone on IMCircle
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CreatePost;
