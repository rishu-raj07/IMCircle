import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  X,
  Heart,
  Send,
  MoreVertical,
  Share2,
  Trash2,
  MessageCircle,
  Eye,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  likeLearning,
  unlikeLearning,
  getMyLearnings,
  getUserLearnings,
  getSingleLearning,
  getLearningActivity,
  deleteLearning,
  viewLearning,
  repostLearning,
  shareLearning,
} from "../../api/learningApi";
import { getSessionUser } from "../../utils/sessionUser";
import ImageLoader from "../../components/common/ImageLoader";
import LearningReaderCard from "../../components/learning/LearningReaderCard";
import LearningActionBar from "../../components/learning/LearningActionBar";
import { getOptimizedImageUrl } from "../../utils/mediaOptimization";
import { trackEvent } from "../../utils/analyticsTracker";
import { useSEO } from "../../hooks/useSEO";
import { getGenderAvatarIcon } from "../../utils/avatar";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const MAX_THOUGHT_LENGTH = 200;
const LIKED_LEARNING_IDS_KEY = "liked_learning_ids";
const MONGO_ID_RE = /^[a-f\d]{24}$/i;

function getImageUrl(media) {
  if (!media) return "";
  const url = media?.url || media?.secure_url || media?.path || media;
  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
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

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function isMongoId(value) {
  return MONGO_ID_RE.test(String(value || ""));
}

function getAuthor(learning) {
  return (
    learning?.author ||
    learning?.user ||
    learning?.createdBy ||
    learning?.creator ||
    {}
  );
}

function getAuthorName(learning) {
  const author = getAuthor(learning);
  return author?.fullName || author?.name || author?.username || "IMCircle";
}

function getAuthorAvatar(learning) {
  const author = getAuthor(learning);
  return getPersonAvatar(author);
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

function getLearningMedia(learning) {
  const list =
    learning?.media ||
    learning?.images ||
    learning?.files ||
    learning?.attachments ||
    [];

  return Array.isArray(list) ? list : [];
}

function isLikedByMe(learning, me) {
  if (learning?.likedByMe || learning?.isLikedByMe) return true;

  const myId = getId(me);
  if (!myId) return false;

  const likes = learning?.likes || learning?.likedBy || [];
  if (!Array.isArray(likes)) return false;

  return likes.some((item) => String(getId(item)) === String(myId));
}

function getCount(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getStoredLikedLearningIds() {
  try {
    const value = JSON.parse(
      localStorage.getItem(LIKED_LEARNING_IDS_KEY) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setStoredLearningLiked(id, liked) {
  if (!id) return;

  const current = getStoredLikedLearningIds();
  const next = liked
    ? [...new Set([...current, id])]
    : current.filter((item) => String(item) !== String(id));

  localStorage.setItem(LIKED_LEARNING_IDS_KEY, JSON.stringify(next));
}

function getLearningList(response) {
  const list =
    response?.learnings ||
    response?.data?.learnings ||
    response?.data ||
    response;

  return Array.isArray(list) ? list : [];
}

function sortLearningListWithFirst(list, first) {
  if (!first?._id) return list;

  return [
    first,
    ...list.filter((item) => String(item?._id) !== String(first._id)),
  ].slice(0, 10);
}

function getTimeAgoLabel(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));

  if (sec < 5) return "Just now";
  if (sec < 60) return `${sec} sec`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? "hr" : "hrs"}`;

  const day = Math.floor(hr / 24);
  return `${day}${day === 1 ? " day" : " days"}`;
}

function getPersonAvatar(person) {
  return (
    person?.avatar ||
    person?.photo ||
    person?.profileImage ||
    person?.profilePicture ||
    person?.picture ||
    ""
  );
}

function getPersonName(person) {
  return person?.fullName || person?.name || person?.username || "User";
}

function getPersonHeadline(person) {
  return (
    person?.headline || person?.tagline || person?.role || "Growing on IMCircle"
  );
}

function getPersonProfilePath(person) {
  if (person?.username) return `/profile/${person.username}`;
  return `/profile/user/${person?._id || person?.id}`;
}

function ActivityThought({ text }) {
  const [expanded, setExpanded] = useState(false);
  const cleanText = String(text || "").trim();
  const shouldClamp = cleanText.length > 50;
  const visibleText =
    shouldClamp && !expanded ? `${cleanText.slice(0, 50)}...` : cleanText;

  return (
    <div className="mt-2 rounded-2xl bg-[var(--imc-surface-2)] px-3 py-2.5">
      <p className="whitespace-pre-wrap break-words text-[12.5px] font-bold leading-[1.5] text-[var(--imc-text)]">
        {visibleText}
      </p>

      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-[11px] font-black text-[var(--imc-indigo-text)]"
        >
          {expanded ? "View less" : "View more"}
        </button>
      ) : null}
    </div>
  );
}

export default function LearningView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  useSEO({
    title: "Learning",
    description: "Learn in public on IMCircle — bite-sized learning updates from builders.",
    path: `/learning/${id}`,
    type: "article",
  });

  const videoRef = useRef(null);
  const advancingRef = useRef(false);

  const [me] = useState(getSessionUser);
  const [ownedLearningIds, setOwnedLearningIds] = useState([]);
  const [learningList, setLearningList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const [thoughtText, setThoughtText] = useState("");
  const [sendingThought, setSendingThought] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityTab, setActivityTab] = useState("likes");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityViewers, setActivityViewers] = useState([]);
  const [activityThoughts, setActivityThoughts] = useState([]);
  const sheetTouchStartY = useRef(null);

  const learning = learningList[currentIndex] || null;
  const storyAuthorIds = Array.isArray(location.state?.storyAuthorIds)
    ? location.state.storyAuthorIds.map((item) => String(item)).filter(Boolean)
    : [];

  const media = useMemo(() => getLearningMedia(learning), [learning]);
  const activeMedia = media[0];
  const activeType = activeMedia ? getMediaType(activeMedia) : "text";
  const activeUrl = getImageUrl(activeMedia);

  const author = getAuthor(learning);
  const authorId = getId(author);
  const learningId = getId(learning);
  const isOwner =
    (authorId && getId(me) && String(authorId) === String(getId(me))) ||
    ownedLearningIds.some((item) => String(item) === String(learningId));

  useEffect(() => {
    let mounted = true;

    const loadLearning = async () => {
      const stateLearning = location.state?.learning;
      const canPrimeFromState = id !== "me" && stateLearning?._id;

      try {
        setLoading(!canPrimeFromState);

        if (canPrimeFromState) {
          setLearningList([stateLearning]);
          setCurrentIndex(0);
        }

        if (id === "me") {
          const res = await getMyLearnings();
          const list = getLearningList(res);
          const firstLearning = Array.isArray(list) ? list[0] : null;

          if (mounted) {
            setOwnedLearningIds(
              Array.isArray(list)
                ? list.map((item) => getId(item)).filter(Boolean)
                : []
            );
          }

          if (mounted) {
            if (firstLearning?._id) {
              navigate(`/learning-view/${firstLearning._id}`, {
                replace: true,
                state: {
                  learning: firstLearning,
                },
              });
            } else {
              navigate("/create-learning", { replace: true });
            }
          }

          return;
        }

        const myLearningRes = await getMyLearnings();
        const myLearningList = getLearningList(myLearningRes);

        if (mounted) {
          setOwnedLearningIds(
            Array.isArray(myLearningList)
              ? myLearningList.map((item) => getId(item)).filter(Boolean)
              : []
          );
        }

        const ownedMatch = myLearningList.find(
          (item) => String(getId(item)) === String(id)
        );

        if (stateLearning || ownedMatch) {
          let first = ownedMatch || stateLearning;

          try {
            if (
              !ownedMatch &&
              stateLearning?._id &&
              isMongoId(stateLearning._id) &&
              !stateLearning?.createdAt
            ) {
              const singleRes = await getSingleLearning(stateLearning._id);
              first =
                singleRes?.learning ||
                singleRes?.data?.learning ||
                singleRes?.data ||
                stateLearning;
            }

            const authorLearningRes = getId(getAuthor(first))
              ? await getUserLearnings(getId(getAuthor(first)))
              : { learnings: [] };
            const authorLearningList = getLearningList(authorLearningRes);

            const merged = sortLearningListWithFirst(authorLearningList, first);

            if (mounted) {
              setLearningList(merged.length ? merged : [first]);
              setCurrentIndex(0);
            }
          } catch {
            if (mounted) {
              setLearningList([first]);
              setCurrentIndex(0);
            }
          }

          return;
        }

        if (!id || id === ":id" || !isMongoId(id)) {
          if (mounted) setLearningList([]);
          return;
        }

        const res = await getSingleLearning(id);
        const found = res?.learning || res?.data?.learning || res?.data || null;
        const authorLearningRes =
          found && getId(getAuthor(found))
            ? await getUserLearnings(getId(getAuthor(found)))
            : { learnings: [] };
        const authorLearningList = getLearningList(authorLearningRes);
        const merged = found
          ? sortLearningListWithFirst(authorLearningList, found)
          : [];

        if (mounted) {
          setLearningList(merged.length ? merged : found ? [found] : []);
          setCurrentIndex(0);
        }
      } catch {
        if (mounted) setLearningList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLearning();

    return () => {
      mounted = false;
    };
  }, [id, location.state]);

  useEffect(() => {
    const nextLearning = learningList[currentIndex + 1];
    const nextMedia = getLearningMedia(nextLearning)[0];
    const nextUrl = getImageUrl(nextMedia);

    if (!nextUrl || getMediaType(nextMedia) !== "image") return;

    const image = new Image();
    image.decoding = "async";
    image.src = getOptimizedImageUrl(nextUrl, { width: 900 });
  }, [currentIndex, learningList]);

  useEffect(() => {
    if (!learning) return;

    const storedLiked = getStoredLikedLearningIds().some(
      (item) => String(item) === String(getId(learning))
    );

    setLiked(isLikedByMe(learning, me) || storedLiked);
    setLikesCount(
      getCount(
        learning?.likesCount ||
          learning?.totalLikes ||
          (Array.isArray(learning?.likes) ? learning.likes.length : 0)
      )
    );

    setThoughtText("");
    setActionMenuOpen(false);
    setConfirmDelete(false);
    setActivityOpen(false);
    setActivityTab("likes");
    setActivityViewers([]);
    setActivityThoughts([]);
  }, [learning, me]);

  useEffect(() => {
    if (!learning?._id) return;

    const loadViewData = async () => {
      try {
        await viewLearning(learning._id);
      } catch {
        // silent
      }
    };

    loadViewData();
  }, [learning?._id, isOwner]);

  useEffect(() => {
    setProgress(0);
    if (!learning) return;

    let frameId;
    let startedAt = Date.now();
    let currentProgress = 0;
    const duration = activeType === "video" ? 12000 : 6500;

    const tick = () => {
      if (!paused) {
        const elapsed = Date.now() - startedAt;
        currentProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          handleNext();
          return;
        }
      } else {
        startedAt = Date.now() - (currentProgress / 100) * duration;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, activeType, learning?._id, paused]);

  const handleVideoTime = () => {
    const video = videoRef.current;
    if (!video) return;

    const maxDuration = Math.min(video.duration || 60, 60);
    const percent = Math.min((video.currentTime / maxDuration) * 100, 100);
    setProgress(percent);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < learningList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    if (advancingRef.current) return;
    advancingRef.current = true;

    try {
      const currentAuthorId = String(getId(getAuthor(learning)));
      const currentQueueIndex = storyAuthorIds.indexOf(currentAuthorId);
      const nextAuthorIds =
        currentQueueIndex >= 0
          ? storyAuthorIds.slice(currentQueueIndex + 1)
          : [];

      for (const nextAuthorId of nextAuthorIds) {
        const res = await getUserLearnings(nextAuthorId);
        const list = getLearningList(res);
        const first = list[0];

        if (first?._id) {
          navigate(`/learning-view/${first._id}`, {
            replace: true,
            state: {
              learning: first,
              storyAuthorIds,
            },
          });
          return;
        }
      }

      navigate("/home");
    } finally {
      advancingRef.current = false;
    }
  };

  const handleLike = async () => {
    if (!learning?._id || liking) return;

    setLiking(true);

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    if (nextLiked) {
      trackEvent("like", { entityType: "learning", entityId: learning._id }).catch(() => {});
    }

    try {
      const res = nextLiked
        ? await likeLearning(learning._id)
        : await unlikeLearning(learning._id);

      const serverLiked =
        typeof res?.likedByMe === "boolean"
          ? res.likedByMe
          : typeof res?.isLikedByMe === "boolean"
          ? res.isLikedByMe
          : nextLiked;
      const serverLikes =
        typeof res?.likesCount === "number" ? res.likesCount : likesCount;

      setStoredLearningLiked(learning._id, serverLiked);
      setLiked(serverLiked);
      setLikesCount(serverLikes);
      setLearningList((items) =>
        items.map((item) =>
          String(item?._id) === String(learning._id)
            ? {
                ...item,
                likedByMe: serverLiked,
                isLikedByMe: serverLiked,
                likesCount: serverLikes,
                likes: serverLiked
                  ? [
                      ...new Map(
                        [
                          ...(Array.isArray(item?.likes) ? item.likes : []),
                          me,
                        ]
                          .filter(Boolean)
                          .map((likeUser) => [String(getId(likeUser)), likeUser])
                      ).values(),
                    ]
                  : Array.isArray(item?.likes)
                  ? item.likes.filter(
                      (likeUser) =>
                        String(getId(likeUser)) !== String(getId(me))
                    )
                  : [],
              }
            : item
        )
      );
    } catch {
      setLiked(!nextLiked);
      setStoredLearningLiked(learning._id, !nextLiked);
      setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  const handleSendThought = async () => {
    const text = thoughtText.trim();

    if (!text || !learning?._id || sendingThought || isOwner) {
      return;
    }

    try {
      setSendingThought(true);

      await repostLearning(learning._id, text.slice(0, MAX_THOUGHT_LENGTH));

      trackEvent("repost", { entityType: "learning", entityId: learning._id, metadata: { withThought: true } }).catch(() => {});

      setThoughtText("");
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setSendingThought(false);
    }
  };

  const handleShare = async () => {
    if (!learning?._id) return;

    const url = `${window.location.origin}/learning-view/${learning._id}`;
    const title = getLearningText(learning);

    trackEvent("share", { entityType: "learning", entityId: learning._id }).catch(() => {});

    try {
      await shareLearning(learning._id);

      if (navigator.share) {
        await navigator.share({ title, text: title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // silent
    } finally {
      setActionMenuOpen(false);
    }
  };

  const openActivitySheet = async (tab = "likes") => {
    if (!learning?._id) return;

    setActivityTab(tab);
    setActivityOpen(true);
    setPaused(true);
    setActivityLoading(true);

    try {
      const res = await getLearningActivity(learning._id);
      const viewers = res?.likes || res?.data?.likes || [];
      const thoughts = res?.thoughts || res?.data?.thoughts || [];

      setActivityViewers(Array.isArray(viewers) ? viewers : []);
      setActivityThoughts(Array.isArray(thoughts) ? thoughts : []);
    } catch {
      setActivityViewers([]);
      setActivityThoughts([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const closeActivitySheet = () => {
    setActivityOpen(false);
    setPaused(false);
  };

  const handleSheetTouchStart = (e) => {
    sheetTouchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchEnd = (e) => {
    if (sheetTouchStartY.current == null) return;

    const endY = e.changedTouches[0]?.clientY ?? sheetTouchStartY.current;
    const deltaY = endY - sheetTouchStartY.current;
    sheetTouchStartY.current = null;

    if (deltaY > 70) closeActivitySheet();
  };

  const handleDelete = async () => {
    if (!learning?._id || deleting) return;

    try {
      setDeleting(true);
      await deleteLearning(learning._id);

      trackEvent("learning_deleted", {
        entityType: "learning",
        entityId: learning._id,
      }).catch(() => {});

      const nextList = learningList.filter(
        (item) => String(item?._id) !== String(learning._id)
      );

      if (nextList.length === 0) {
        navigate("/home");
        return;
      }

      setLearningList(nextList);
      setCurrentIndex((prev) => Math.min(prev, nextList.length - 1));
      setConfirmDelete(false);
      setActionMenuOpen(false);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const renderMainContent = () => {
    if (activeMedia && activeType === "video") {
      return (
        <video
          ref={videoRef}
          src={activeUrl}
          autoPlay
          playsInline
          controls={false}
          preload="metadata"
          onTimeUpdate={handleVideoTime}
          className="h-full w-full object-cover"
        />
      );
    }

    if (activeMedia && activeType === "image") {
      return (
        <ImageLoader
          src={activeUrl}
          alt="Learning"
          eager
          width={900}
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <div className="flex h-full w-full flex-col justify-center bg-gradient-to-br from-[var(--imc-surface)] via-[var(--imc-surface)] to-[var(--imc-surface-2)] px-6 py-6">
        <span className="w-fit rounded-full bg-[var(--imc-surface-2)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.8px] text-[var(--imc-indigo-text)]">
          {getLearningTopic(learning)}
        </span>

        <p className="mt-3 line-clamp-4 text-[19px] font-black leading-[1.2] text-[var(--imc-text)]">
          {learning?.content || getLearningText(learning)}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-learning-bg)]">
        <div className="grid min-h-screen w-full max-w-[430px] place-items-center text-[var(--imc-text)]">
          <p className="text-[14px] font-black">Loading learning...</p>
        </div>
      </div>
    );
  }

  if (!learning) {
    return (
      <div className="flex min-h-screen justify-center bg-[var(--imc-learning-bg)]">
        <div className="flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center px-6 text-center text-[var(--imc-text)]">
          <p className="text-[18px] font-black">No learning found</p>

          <button
            type="button"
            onClick={() => navigate("/create-learning")}
            className="mt-4 rounded-full bg-[#4338CA] px-5 py-2 text-[13px] font-black text-white"
          >
            Create Learning
          </button>

          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mt-3 rounded-full bg-[var(--imc-surface-2)] px-5 py-2 text-[13px] font-black text-[var(--imc-text)]"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const authorAvatar = getAuthorAvatar(learning);
  const authorName = getAuthorName(learning);

  const actionBarItems = isOwner
    ? [
        {
          key: "views",
          icon: Eye,
          count: activityViewers.length || undefined,
          label: "Views",
          onClick: () => openActivitySheet("likes"),
          ariaLabel: "View activity",
        },
        {
          key: "share",
          icon: Share2,
          label: "Share",
          onClick: handleShare,
          ariaLabel: "Share learning",
        },
      ]
    : [
        {
          key: "like",
          icon: Heart,
          count: likesCount,
          active: liked,
          filled: liked,
          activeClass: "bg-red-50 text-red-600",
          iconClassName: liked ? "text-red-600" : "",
          onClick: handleLike,
          disabled: liking,
          ariaLabel: liked ? "Unlike learning" : "Like learning",
        },
        {
          key: "share",
          icon: Share2,
          label: "Share",
          onClick: handleShare,
          ariaLabel: "Share learning",
        },
      ];

  return (
    <div className="min-h-screen bg-[var(--imc-learning-bg)]">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[var(--imc-learning-bg)] pb-10">
        {/* Sticky progress + header — normal document flow, never overlaps
            the hero image or the title beneath it. */}
        <div
          className="sticky top-0 z-30 px-4 pb-3 pt-3 backdrop-blur-xl"
          style={{ background: "color-mix(in srgb, var(--imc-learning-bg) 90%, transparent)" }}
        >
          <div className="flex gap-1.5">
            {learningList.map((item, index) => (
              <div
                key={item?._id || index}
                className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--imc-border)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--imc-marigold)]"
                  style={{
                    width:
                      index < currentIndex
                        ? "100%"
                        : index === currentIndex
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
              aria-label="Back to home"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="imc-ring grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full p-[2px]">
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[var(--imc-surface)]">
                  <img
                    src={authorAvatar || getGenderAvatarIcon(author)}
                    alt={authorName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-black text-[var(--imc-text)]">
                  {authorName}
                </p>
                <p className="truncate text-[11px] font-bold text-[var(--imc-text-muted)]">
                  {getPersonHeadline(author)} · {getTimeAgoLabel(learning?.createdAt) || "now"}
                </p>
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setActionMenuOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)] active:scale-95"
                aria-label="Learning actions"
              >
                <MoreVertical size={19} />
              </button>

              {actionMenuOpen ? (
                <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] text-[var(--imc-text)] shadow-xl">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-12 w-full items-center gap-3 px-4 text-left text-[13px] font-black"
                  >
                    <Share2 size={16} />
                    Share
                  </button>

                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        setConfirmDelete(true);
                      }}
                      className="flex h-12 w-full items-center gap-3 border-t border-[var(--imc-border)] px-4 text-left text-[13px] font-black text-red-600"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/home")}
                      className="flex h-12 w-full items-center gap-3 border-t border-[var(--imc-border)] px-4 text-left text-[13px] font-black"
                    >
                      <X size={16} />
                      Close
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Hero — tall 4:5 frame (roomier than a strict 16:9 so the card
            doesn't feel cramped), always fully visible (object-cover never
            crops to blank), rounded, gradient only at the very bottom edge
            so a topic chip stays legible without ever sitting on bright
            image content directly. */}
        <div className="px-4 pt-1">
          <div
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-[var(--imc-surface-2)] shadow-[0_10px_30px_rgba(18,20,28,0.10)]"
          >
            {renderMainContent()}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

            <span className="absolute bottom-3 left-3 rounded-full bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.8px] text-white backdrop-blur">
              {getLearningTopic(learning)}
            </span>

            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-0 top-0 h-full w-[22%]"
              aria-label="Previous learning"
            />
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0 top-0 h-full w-[22%]"
              aria-label="Next learning"
            />
          </div>
        </div>

        {/* Floating glass reading card */}
        <div className="px-4">
          <LearningReaderCard
            title={learning?.title && learning?.content ? learning.title : ""}
            text={getLearningText(learning)}
            tags={learning?.tags}
          />
        </div>

        {/* Compact premium action row */}
        <div className="mt-4 px-4">
          <LearningActionBar items={actionBarItems} />
        </div>

        {/* Quick "thought" reply — preserves the existing repost-with-caption
            feature for viewers, just no longer stamped over the photo. */}
        {!isOwner ? (
          <div className="mt-3 px-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-1 shadow-sm">
              <input
                value={thoughtText}
                onChange={(e) =>
                  setThoughtText(e.target.value.slice(0, MAX_THOUGHT_LENGTH))
                }
                maxLength={MAX_THOUGHT_LENGTH}
                placeholder="Share your thought..."
                className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendThought();
                }}
              />
              <button
                type="button"
                disabled={!thoughtText.trim() || sendingThought}
                onClick={handleSendThought}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#4338CA] text-white disabled:opacity-50"
                aria-label="Send thought"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {activityOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            onClick={closeActivitySheet}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative z-10 mx-auto flex max-h-[75vh] w-full max-w-[430px] flex-col rounded-t-[30px] bg-[var(--imc-surface)] pb-6 pt-3 shadow-2xl">
            <div
              onTouchStart={handleSheetTouchStart}
              onTouchEnd={handleSheetTouchEnd}
              className="shrink-0"
            >
              <button
                type="button"
                onClick={closeActivitySheet}
                aria-label="Close activity"
                className="mx-auto block h-1.5 w-12 rounded-full bg-[var(--imc-border)]"
              />

              <div className="mt-3 flex items-center justify-between px-5">
                <p className="text-[15px] font-black text-[var(--imc-text)]">
                  Learning activity
                </p>

                <button
                  type="button"
                  onClick={closeActivitySheet}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--imc-surface-2)]"
                >
                  <X size={16} className="text-[var(--imc-text)]" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 px-5">
                <button
                  type="button"
                  onClick={() => setActivityTab("likes")}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-black transition-colors"
                  style={
                    activityTab === "likes"
                      ? {
                          background: "var(--imc-surface-2)",
                          color: "var(--imc-text)",
                        }
                      : { color: "var(--imc-text-muted)" }
                  }
                >
                  <Eye
                    size={16}
                    className={
                      activityTab === "likes" ? "text-[var(--imc-indigo-text)]" : ""
                    }
                  />
                  Viewers {activityViewers.length}
                </button>

                <button
                  type="button"
                  onClick={() => setActivityTab("thoughts")}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-black transition-colors"
                  style={
                    activityTab === "thoughts"
                      ? {
                          background: "var(--imc-surface-2)",
                          color: "var(--imc-text)",
                        }
                      : { color: "var(--imc-text-muted)" }
                  }
                >
                  <MessageCircle size={16} />
                  Thoughts {activityThoughts.length}
                </button>
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto px-5">
              {activityLoading ? (
                <div className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-8 text-center">
                  <p className="text-[13px] font-black text-[var(--imc-text-muted)]">
                    Loading activity...
                  </p>
                </div>
              ) : (activityTab === "likes" ? activityViewers : activityThoughts)
                  .length === 0 ? (
                <div className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-10 text-center">
                  <p className="text-[15px] font-black text-[var(--imc-text)]">
                    No {activityTab === "likes" ? "viewers" : "thoughts"} yet
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                    Activity from people will show here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {(activityTab === "likes" ? activityViewers : activityThoughts).map(
                    (person, index) => {
                      const avatar = getPersonAvatar(person);

                      return (
                        <div
                          key={person?._id || person?.id || index}
                          className="rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-3.5 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              navigate(getPersonProfilePath(person))
                            }
                            className="flex w-full items-center gap-3 text-left active:scale-[0.99]"
                          >
                            <div className="relative h-11 w-11 shrink-0 rounded-full ring-2 ring-[var(--imc-surface)]">
                              <img
                                src={avatar || getGenderAvatarIcon(person)}
                                alt={getPersonName(person)}
                                referrerPolicy="no-referrer"
                                className="h-full w-full rounded-full object-cover"
                              />

                              {activityTab === "likes" && person?.liked ? (
                                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--imc-surface)] bg-[var(--imc-surface)]">
                                  <Heart
                                    size={11}
                                    className="fill-red-500 text-red-500"
                                  />
                                </span>
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-black text-[var(--imc-text)]">
                                {getPersonName(person)}
                              </p>
                              <p className="truncate text-[11.5px] font-bold text-[var(--imc-text-muted)]">
                                {getPersonHeadline(person)}
                              </p>
                            </div>

                            <p className="shrink-0 text-[10.5px] font-black text-[var(--imc-text-faint)]">
                              {getTimeAgoLabel(
                                activityTab === "likes"
                                  ? person?.viewedAt
                                  : person?.thoughtAt
                              )}
                            </p>
                          </button>

                          {activityTab === "thoughts" ? (
                            <ActivityThought
                              text={person?.thought || person?.text || ""}
                            />
                          ) : null}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-[var(--imc-surface)] p-5 text-center shadow-2xl">
            <h3 className="text-[16px] font-black text-[var(--imc-text)]">
              Delete this learning?
            </h3>
            <p className="mt-2 text-[13px] font-bold leading-5 text-[var(--imc-text-muted)]">
              This can't be undone. Everyone who can currently see it will lose
              access right away.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-11 flex-1 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text)] disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 flex-1 rounded-2xl bg-red-600 text-[13px] font-black text-white disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
