import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  deleteLearning,
  getLearningActivity,
  getMyLearnings,
  getSingleLearning,
} from "../../api/learningApi";
import { trackEvent } from "../../utils/analyticsTracker";

const THOUGHT_PREVIEW_LENGTH = 50;

function getActivityList(payload, key) {
  const list = payload?.[key] || payload?.data?.[key] || [];
  return Array.isArray(list) ? list : [];
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
}

function normalizeLearningList(payload) {
  const list =
    payload?.learnings ||
    payload?.data?.learnings ||
    payload?.data?.items ||
    payload?.items ||
    payload?.data ||
    [];

  return Array.isArray(list) ? list : [];
}

function sortByCreatedAt(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return aTime - bTime;
  });
}

function getProfilePath(user) {
  if (user?.username) return `/profile/${user.username}`;
  return `/profile/user/${user?._id || user?.id}`;
}

function getAvatar(user) {
  return (
    user?.avatar ||
    user?.photo ||
    user?.profileImage ||
    user?.profilePicture ||
    user?.picture ||
    ""
  );
}

function getUserName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getUserHeadline(user) {
  return user?.headline || user?.tagline || user?.role || "Growing on IMCircle";
}

function getLearningText(learning) {
  return (
    learning?.title ||
    learning?.caption ||
    learning?.content ||
    learning?.text ||
    "Learning of the day"
  );
}

function getLearningTopic(learning) {
  return learning?.topic || learning?.type || "learning";
}

const UPLOADS_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function getImageUrl(media) {
  if (!media) return "";
  const url = media?.url || media?.secure_url || media?.path || media;
  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${UPLOADS_BASE_URL}${url}`;
  return url;
}

function getMediaType(media) {
  const type = media?.type || media?.resource_type || "";
  const url = getImageUrl(media).toLowerCase();

  if (type.includes("video")) return "video";
  if (url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".webm")) {
    return "video";
  }

  return "image";
}

function getLearningMedia(learning) {
  const list =
    learning?.media ||
    learning?.images ||
    learning?.files ||
    learning?.attachments ||
    [];

  return Array.isArray(list) ? list : [];
}

function getTimeAgo(value) {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function getUploadedTime(value) {
  if (!value) return "Upload time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upload time unavailable";

  return `Uploaded ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} at ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function PersonAvatar({ person, badge }) {
  const avatar = getAvatar(person);

  return (
    <div
      className="relative h-12 w-12 shrink-0 rounded-2xl"
      style={{ background: "var(--imc-surface-2)" }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={getUserName(person)}
          className="h-full w-full rounded-2xl object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center rounded-2xl text-[15px] font-black"
          style={{ background: "#12141C", color: "#EC9A1E" }}
        >
          {getUserName(person).charAt(0).toUpperCase()}
        </div>
      )}

      {badge ? (
        <div
          className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 shadow-sm"
          style={{ background: "var(--imc-surface)", borderColor: "var(--imc-surface)" }}
        >
          {badge}
        </div>
      ) : null}
    </div>
  );
}

function ExpandableThought({ text }) {
  const [expanded, setExpanded] = useState(false);
  const cleanText = String(text || "").trim();
  const shouldClamp = cleanText.length > THOUGHT_PREVIEW_LENGTH;
  const visibleText =
    shouldClamp && !expanded
      ? `${cleanText.slice(0, THOUGHT_PREVIEW_LENGTH)}...`
      : cleanText;

  return (
    <div className="mt-3 rounded-2xl px-3 py-3" style={{ background: "var(--imc-surface-2)" }}>
      <p
        className="whitespace-pre-wrap break-words text-[13px] font-bold leading-[1.5]"
        style={{ color: "var(--imc-text)" }}
      >
        {visibleText}
      </p>

      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-[12px] font-black"
          style={{ color: "var(--imc-indigo-text)" }}
        >
          {expanded ? "View less" : "View more"}
        </button>
      ) : null}
    </div>
  );
}

export default function LearningViewMeType() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [learning, setLearning] = useState(null);
  const [likes, setLikes] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [activeTab, setActiveTab] = useState(
    location.state?.initialTab === "thoughts" ? "thoughts" : "likes"
  );
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [myLearnings, setMyLearnings] = useState([]);

  const media = getLearningMedia(learning);
  const activeMedia = media[0];
  const activeType = activeMedia ? getMediaType(activeMedia) : "text";
  const activeUrl = getImageUrl(activeMedia);

  // Active learnings only. The backend deletes learnings after 24 hours, so
  // old items should not remain available in the activity carousel.
  useEffect(() => {
    let mounted = true;

    const loadMyLearnings = async () => {
      try {
        const res = await getMyLearnings();
        if (mounted) setMyLearnings(sortByCreatedAt(normalizeLearningList(res)));
      } catch {
        if (mounted) setMyLearnings([]);
      }
    };

    loadMyLearnings();

    return () => {
      mounted = false;
    };
  }, []);

  const currentIndex = myLearnings.findIndex(
    (item) => String(getId(item)) === String(id)
  );
  const hasMultiple = myLearnings.length > 1;

  const goToLearning = (targetId) => {
    if (!targetId || String(targetId) === String(id)) return;
    navigate(`/learning-view/${targetId}/activity`, { replace: true });
  };

  const handlePrevLearning = () => {
    if (currentIndex > 0) goToLearning(getId(myLearnings[currentIndex - 1]));
  };

  const handleNextLearning = () => {
    if (currentIndex >= 0 && currentIndex < myLearnings.length - 1) {
      goToLearning(getId(myLearnings[currentIndex + 1]));
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadActivity = async () => {
      try {
        setLoading(true);
        const [learningRes, activityRes] = await Promise.all([
          getSingleLearning(id),
          getLearningActivity(id),
        ]);

        if (!mounted) return;

        setLearning(
          learningRes?.learning ||
            learningRes?.data?.learning ||
            learningRes?.data ||
            null
        );
        setLikes(getActivityList(activityRes, "likes"));
        setThoughts(getActivityList(activityRes, "thoughts"));
      } catch {
        if (mounted) {
          setLearning(null);
          setLikes([]);
          setThoughts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadActivity();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;

    try {
      setDeleting(true);
      await deleteLearning(id);

      trackEvent("learning_deleted", { entityType: "learning", entityId: id }).catch(() => {});

      navigate("/home");
    } catch {
      setDeleting(false);
    }
  };

  const activeItems = activeTab === "likes" ? likes : thoughts;

  return (
    <div className="flex min-h-screen justify-center bg-[#08090C]">
      <div
        className="relative min-h-screen w-full max-w-[430px] overflow-hidden"
        style={{
          color: "var(--imc-text)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--imc-marigold) 38%, var(--imc-surface)) 0%, color-mix(in srgb, var(--imc-marigold) 18%, var(--imc-bg)) 42%, var(--imc-bg) 100%)",
        }}
      >
        <div
          className="sticky top-0 z-20 px-4 pb-4 pt-4 backdrop-blur-xl"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.18)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/25 text-white active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 flex-1 text-center text-white">
              <p className="truncate text-[14px] font-black">Learning activity</p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-white/75">
                {hasMultiple && currentIndex >= 0
                  ? `Learning ${currentIndex + 1} of ${myLearnings.length}`
                  : learning
                  ? getLearningText(learning)
                  : "Your learning"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/25 text-white active:scale-95"
              aria-label="Delete learning"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {hasMultiple ? (
            <div className="mt-4 flex items-center gap-1.5">
              {myLearnings.map((item, index) => (
                <span
                  key={getId(item) || index}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{
                    background:
                      index === currentIndex
                        ? "var(--imc-indigo-text)"
                        : "var(--imc-border)",
                  }}
                />
              ))}
            </div>
          ) : null}

          {learning ? (
            <div className="relative mt-4">
              {hasMultiple && currentIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevLearning}
                  aria-label="Previous learning"
                  className="absolute -left-2 top-[105px] z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full shadow-md active:scale-90"
                  style={{ background: "var(--imc-surface)", color: "var(--imc-text)" }}
                >
                  <ChevronLeft size={18} />
                </button>
              ) : null}

              {hasMultiple && currentIndex >= 0 && currentIndex < myLearnings.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextLearning}
                  aria-label="Next learning"
                  className="absolute -right-2 top-[105px] z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full shadow-md active:scale-90"
                  style={{ background: "var(--imc-surface)", color: "var(--imc-text)" }}
                >
                  <ChevronRight size={18} />
                </button>
              ) : null}

              <div
                className="overflow-hidden rounded-[28px]"
                style={{ border: "1px solid var(--imc-border)", boxShadow: "0 16px 40px rgba(15,23,42,0.06)" }}
              >
                {activeMedia ? (
                  <div
                    className="flex h-[210px] items-center justify-center"
                    style={{ background: "var(--imc-surface-2)" }}
                  >
                    {activeType === "video" ? (
                      <video
                        src={activeUrl}
                        controls
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <img
                        src={activeUrl}
                        alt="Learning"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                ) : null}

                <div
                  className="p-4"
                  style={{
                    background:
                      "linear-gradient(160deg, var(--imc-surface) 0%, var(--imc-surface-2) 100%)",
                  }}
                >
                  <div className="flex items-center justify-center">
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.8px]"
                      style={{ background: "rgba(67,56,202,0.12)", color: "var(--imc-indigo-text)" }}
                    >
                      {getLearningTopic(learning)}
                    </span>
                  </div>

                  {learning?.title ? (
                    <p
                      className="mt-4 text-center text-[13px] font-black uppercase tracking-[1.1px]"
                      style={{ color: "var(--imc-text-muted)" }}
                    >
                      {learning.title}
                    </p>
                  ) : null}

                  <div
                    className="mx-auto mt-3 flex max-w-full items-center justify-center gap-2 rounded-2xl px-3 py-2"
                    style={{
                      border: "1px solid var(--imc-border)",
                      background: "var(--imc-surface)",
                      color: "var(--imc-text-muted)",
                    }}
                  >
                    <Clock3 size={14} className="shrink-0" />
                    <p className="truncate text-[11.5px] font-black">
                      {getUploadedTime(learning?.createdAt)}
                    </p>
                  </div>

                  <div className="flex min-h-[132px] items-center justify-center px-2 py-4">
                    <p
                      className="text-center text-[28px] font-black leading-[1.1]"
                      style={{ color: "var(--imc-text)" }}
                    >
                      {learning?.content || getLearningText(learning)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="mt-4 grid grid-cols-2 gap-2 rounded-2xl p-1"
            style={{ background: "var(--imc-surface-2)" }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("likes")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-black transition-colors"
              style={
                activeTab === "likes"
                  ? { background: "var(--imc-surface)", color: "var(--imc-text)", boxShadow: "0 1px 2px rgba(15,23,42,0.06)" }
                  : { color: "var(--imc-text-muted)" }
              }
            >
              <Heart
                size={16}
                className={activeTab === "likes" ? "fill-red-500 text-red-500" : ""}
              />
              Viewers {likes.length}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("thoughts")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-black transition-colors"
              style={
                activeTab === "thoughts"
                  ? { background: "var(--imc-surface)", color: "var(--imc-text)", boxShadow: "0 1px 2px rgba(15,23,42,0.06)" }
                  : { color: "var(--imc-text-muted)" }
              }
            >
              <MessageCircle size={16} />
              Thoughts {thoughts.length}
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          {loading ? (
            <div
              className="rounded-3xl px-4 py-8 text-center"
              style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)" }}
            >
              <p className="text-[13px] font-black" style={{ color: "var(--imc-text-muted)" }}>
                Loading activity...
              </p>
            </div>
          ) : activeItems.length === 0 ? (
            <div
              className="rounded-3xl px-4 py-10 text-center"
              style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)" }}
            >
              <p className="text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                No {activeTab === "likes" ? "viewers" : "thoughts"} yet
              </p>
              <p className="mt-1 text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                Activity from people will show here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map((person) => (
                <div
                  key={`${activeTab}-${person?._id}`}
                  className="rounded-3xl px-4 py-3 shadow-sm"
                  style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)" }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(getProfilePath(person))}
                    className="flex w-full items-center gap-3 text-left active:scale-[0.99]"
                  >
                    <PersonAvatar
                      person={person}
                      badge={
                        activeTab === "likes" && person?.liked ? (
                          <Heart size={12} className="fill-red-500 text-red-500" />
                        ) : activeTab === "thoughts" ? (
                          <MessageCircle size={12} style={{ color: "var(--imc-indigo-text)" }} />
                        ) : null
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
                        {getUserName(person)}
                      </p>
                      <p className="truncate text-[12px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                        {getUserHeadline(person)}
                      </p>
                    </div>

                    <p className="shrink-0 text-[11px] font-black" style={{ color: "var(--imc-text-faint)" }}>
                      {getTimeAgo(
                        activeTab === "likes" ? person?.viewedAt : person?.thoughtAt
                      )}
                    </p>
                  </button>

                  {activeTab === "thoughts" ? (
                    <ExpandableThought text={person?.thought} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-5">
          <div
            className="w-full max-w-[360px] rounded-3xl p-5 shadow-2xl"
            style={{ background: "var(--imc-surface)" }}
          >
            <p className="text-[17px] font-black" style={{ color: "var(--imc-text)" }}>
              Delete this learning?
            </p>
            <p className="mt-2 text-[13px] font-bold leading-[1.5]" style={{ color: "var(--imc-text-muted)" }}>
              This will remove it from your learning view. This action cannot be
              undone.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-11 rounded-2xl text-[13px] font-black"
                style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-2xl bg-red-600 text-[13px] font-black text-white disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
