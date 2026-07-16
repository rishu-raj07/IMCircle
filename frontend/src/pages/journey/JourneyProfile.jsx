import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Flame,
  RefreshCcw,
  Trophy,
  Users,
  Pencil,
  Check,
  UserPlus,
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Eye,
  Save,
  X,
  Send,
  Flag,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import CommentSheet from "../../components/common/CommentSheet";
import RepostSheet from "../../components/common/RepostSheet";
import ViewInfoSheet from "../../components/common/ViewInfoSheet";

import {
  getSingleJourney,
  updateJourney,
  updateJourneyCover,
  followJourney,
  unfollowJourney,
  likeMilestone,
  unlikeMilestone,
  repostMilestone,
  shareMilestone,
  saveMilestone,
  unsaveMilestone,
  commentMilestone,
  getMilestoneComments,
} from "../../api/journeyApi";
// Following the journey (updates feed) is a different action from
// following the creator's account, so this uses a separate API/button
// from followJourney/unfollowJourney above.
import { followUserById, unfollowUserById } from "../../api/userApi";
import { useSEO } from "../../hooks/useSEO";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getJourneyCoverIcon } from "../../utils/media";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const dayOptions = [7, 14, 21, 30, 50, 75, 100, 180, 365];

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getImageUrl(image) {
  if (!image) return "";
  const url =
    typeof image === "string"
      ? image
      : image?.url || image?.secure_url || image?.path || "";
  return normalizeImageUrl(url);
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatCount(num = 0) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "Builder";
}

function getAvatar(user) {
  if (!user) return "";

  const avatar =
    user?.avatar?.url ||
    user?.avatar?.secure_url ||
    user?.profilePicture?.url ||
    user?.profilePicture?.secure_url ||
    user?.profileImage?.url ||
    user?.profileImage?.secure_url ||
    user?.image?.url ||
    user?.image?.secure_url ||
    user?.photo?.url ||
    user?.photo?.secure_url ||
    user?.picture ||
    user?.photoURL ||
    user?.googlePicture ||
    (typeof user?.avatar === "string" ? user.avatar : "") ||
    (typeof user?.profilePicture === "string" ? user.profilePicture : "") ||
    (typeof user?.profileImage === "string" ? user.profileImage : "") ||
    (typeof user?.image === "string" ? user.image : "") ||
    (typeof user?.photo === "string" ? user.photo : "");

  return normalizeImageUrl(avatar);
}

function JourneyProfile() {
  const navigate = useNavigate();
  const { journeyId, id } = useParams();
  const finalJourneyId = journeyId || id;

  const coverInputRef = useRef(null);

  const [journey, setJourney] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userFollowLoading, setUserFollowLoading] = useState(false);
  const [viewerImage, setViewerImage] = useState("");

  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [editDays, setEditDays] = useState(100);
  const [savingAbout, setSavingAbout] = useState(false);
  const [editingFinalNote, setEditingFinalNote] = useState(false);
  const [finalNote, setFinalNote] = useState("");
  const [savingFinalNote, setSavingFinalNote] = useState(false);

  useSEO({
    title: journey?.title ? `${journey.title} — Journey` : "Journey",
    description: journey?.about || "Follow this growth journey on IMCircle.",
    path: `/journey/${finalJourneyId}`,
    image: journey?.coverImage,
    type: "article",
  });

  const loadJourney = async () => {
    try {
      setLoading(true);
      const res = await getSingleJourney(finalJourneyId);
      const j = res?.journey || null;

      setJourney(j);
      setMilestones(Array.isArray(res?.milestones) ? res.milestones : []);
      setAboutText(j?.description || "");
      setFinalNote(j?.finalNote || "");
      setEditDays(j?.targetDays || j?.totalDays || 100);
    } catch (error) {
      // In dev, React 18 StrictMode fires this effect twice; the axios
      // de-dup logic aborts the first in-flight request, which surfaces
      // here as a benign ERR_CANCELED with no real response — not an
      // actual failure, so don't alert or navigate away for it.
      if (error?.code === "ERR_CANCELED") return;
      alert(error?.response?.data?.message || "Failed to load journey");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (finalJourneyId) loadJourney();
  }, [finalJourneyId]);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort(
      (a, b) => Number(a.day || 0) - Number(b.day || 0)
    );
  }, [milestones]);

  const firstImage = useMemo(() => {
    const first = sortedMilestones.find((item) => item.images?.length);
    return getImageUrl(first?.images?.[0]);
  }, [sortedMilestones]);

  const currentDay = journey?.currentDay || 1;
  const targetDays = journey?.targetDays || journey?.totalDays || 100;
  const isMissed = journey?.status === "uncompleted";
  const progressDay = isMissed
    ? Math.max(Number(journey?.updatesCount || 0), 0)
    : Math.min(Number(currentDay), Number(targetDays));
  const progress = journey?.status === "completed"
    ? 100
    : Math.min(Math.round((progressDay / targetDays) * 100), 100);

  const coverImage = normalizeImageUrl(journey?.coverImage);
  const heroImage = coverImage || firstImage;
  const creator = journey?.creator || {};
  const avatar = getAvatar(creator);
  const totals = journey?.totals || {};

  const refreshJourneySilently = async () => {
    try {
      const res = await getSingleJourney(finalJourneyId);
      setJourney(res?.journey || null);
      setMilestones(Array.isArray(res?.milestones) ? res.milestones : []);
    } catch {
      // silent
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !journey?._id) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    try {
      setCoverUploading(true);

      const formData = new FormData();
      formData.append("cover", file);

      const res = await updateJourneyCover(journey._id, formData);

      setJourney((prev) => ({
        ...prev,
        coverImage:
          res?.coverImage || res?.journey?.coverImage || prev.coverImage,
      }));
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update cover");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleSaveAbout = async () => {
    if (!journey?._id) return;

    try {
      setSavingAbout(true);

      await updateJourney(journey._id, {
        description: aboutText.trim(),
        targetDays: editDays,
        totalDays: editDays,
      });

      setEditingAbout(false);
      await loadJourney();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update journey");
    } finally {
      setSavingAbout(false);
    }
  };

  const handleSaveFinalNote = async () => {
    const note = finalNote.trim();
    if (!journey?._id || !note) return;

    try {
      setSavingFinalNote(true);
      const res = await updateJourney(journey._id, { finalNote: note });
      setJourney((prev) => ({
        ...prev,
        finalNote: res?.journey?.finalNote || note,
        finalNoteAt: res?.journey?.finalNoteAt || new Date().toISOString(),
      }));
      setEditingFinalNote(false);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to save final note");
    } finally {
      setSavingFinalNote(false);
    }
  };

  const handleFollow = async () => {
    if (!journey?._id || journey.isOwner) return;

    try {
      setFollowLoading(true);

      if (journey.followedByMe) {
        const res = await unfollowJourney(journey._id);
        setJourney((prev) => ({
          ...prev,
          followedByMe: false,
          followersCount:
            res?.followersCount ?? Math.max((prev.followersCount || 1) - 1, 0),
        }));
      } else {
        const res = await followJourney(journey._id);
        setJourney((prev) => ({
          ...prev,
          followedByMe: true,
          followersCount: res?.followersCount ?? (prev.followersCount || 0) + 1,
        }));
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowUser = async () => {
    const creatorId = journey?.creator?._id;
    if (!creatorId || journey.isOwner || userFollowLoading) return;

    const wasFollowing = Boolean(journey.creatorFollowedByMe);

    setUserFollowLoading(true);
    setJourney((prev) => ({ ...prev, creatorFollowedByMe: !wasFollowing }));

    try {
      if (wasFollowing) {
        await unfollowUserById(creatorId);
      } else {
        await followUserById(creatorId);
      }
    } catch (error) {
      setJourney((prev) => ({ ...prev, creatorFollowedByMe: wasFollowing }));
      alert(error?.response?.data?.message || "Failed to update follow");
    } finally {
      setUserFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--imc-bg)" }}
      >
        <div className="text-center">
          <RefreshCcw className="mx-auto animate-spin" style={{ color: "var(--imc-text-faint)" }} />
          <p className="mt-3 text-[13px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
            Loading journey...
          </p>
        </div>
      </div>
    );
  }

  if (!journey) return null;

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--imc-bg)" }}>
      <div className="mx-auto min-h-screen w-full max-w-[430px]">
      <header
        className="sticky top-0 z-30 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl"
        style={{ borderBottom: "1px solid var(--imc-border)", background: "color-mix(in srgb, var(--imc-bg) 94%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full active:scale-95"
            style={{ background: "var(--imc-surface)", color: "var(--imc-text)", border: "1px solid var(--imc-border)" }}
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-black" style={{ color: "var(--imc-text)" }}>Journey</h1>
            <p className="truncate text-[10px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>{journey.title}</p>
          </div>

          {journey.isOwner && journey.status === "active" && journey.isActive !== false && !journey.todayUpdateDone ? (
            <button
              onClick={() => navigate(`/journey/${journey._id}/update`)}
              className="rounded-full px-4 py-2 text-[12px] font-black active:scale-95"
              style={{ background: "var(--imc-surface-strong)", color: "var(--imc-on-surface-strong)" }}
            >
              Update
            </button>
          ) : (
            <div className="h-9 w-[68px]" />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[430px]">
        <section className="mx-4 mt-4 overflow-hidden rounded-[24px]" style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)" }}>
          <div className="relative h-44 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--imc-indigo-tint), var(--imc-surface))" }}>
            {heroImage ? (
              <button type="button" onClick={() => setViewerImage(heroImage)} aria-label="View journey cover" className="block h-full w-full">
                <img
                  src={heroImage}
                  alt={journey.title}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="imc-lattice flex h-full items-center justify-center">
                <div className="text-center">
                  <img src={getJourneyCoverIcon()} alt="" className="mx-auto h-11 w-11 rounded-full object-cover" />
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--imc-indigo)" }}>
                    ImCircle Journey
                  </p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

            {journey.isOwner && (
              <>
                <button
                  type="button"
                  disabled={coverUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-[11px] font-black text-white active:scale-95"
                >
                  <Pencil size={13} />
                  {coverUploading ? "Updating..." : "Edit Cover"}
                </button>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleCoverChange}
                />
              </>
            )}

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-[24px] font-black leading-8 text-white">
                  {journey.title}
                </h2>

                <p className="mt-1 text-[12px] font-bold text-white/85">
                  Started {formatDate(journey.createdAt)}
                </p>
              </div>

              {/* Follows the journey itself (its update feed) — distinct
                  from the "Follow" button next to the creator's name below,
                  which follows their account. */}
              {!journey.isOwner && (
                <button
                  type="button"
                  disabled={followLoading}
                  onClick={handleFollow}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black active:scale-95 disabled:opacity-60"
                  style={
                    journey.followedByMe
                      ? { background: "rgba(255,255,255,0.18)", color: "#fff" }
                      : { background: "var(--imc-indigo)", color: "#fff" }
                  }
                >
                  {journey.followedByMe ? (
                    <Check size={12} />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  {journey.followedByMe ? "Following Journey" : "Follow Journey"}
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="imc-ring relative h-11 w-11 shrink-0 rounded-full p-[2px]">
                  <div
                    className="grid h-full w-full place-items-center overflow-hidden rounded-full p-[2px]"
                    style={{ background: "var(--imc-surface)" }}
                  >
                    <div
                      className="grid h-full w-full place-items-center overflow-hidden rounded-full text-[13px] font-black"
                      style={{ background: "var(--imc-surface-strong)", color: "var(--imc-marigold)" }}
                    >
                      {avatar && !avatarBroken ? (
                        <img
                          src={avatar}
                          alt={getName(creator)}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarBroken(true)}
                        />
                      ) : (
                        <img
                          src={getGenderAvatarIcon(creator)}
                          alt={getName(creator)}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black" style={{ color: "var(--imc-text)" }}>
                    {getName(creator)}
                  </p>
                  <p className="truncate text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
                    Journey creator
                  </p>
                </div>

                {/* Follows the CREATOR's account — distinct from the
                    "Follow Journey" button below, which only follows this
                    journey's updates. */}
                {!journey.isOwner && (
                  <button
                    type="button"
                    disabled={userFollowLoading}
                    onClick={handleFollowUser}
                    className="ml-1 flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black active:scale-95 disabled:opacity-60"
                    style={
                      journey.creatorFollowedByMe
                        ? { background: "var(--imc-surface-2)", color: "var(--imc-text)" }
                        : { background: "#12141C", color: "#fff" }
                    }
                  >
                    {journey.creatorFollowedByMe ? (
                      <Check size={11} />
                    ) : (
                      <UserPlus size={11} />
                    )}
                    {journey.creatorFollowedByMe ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              <ProgressRing progress={progress} day={currentDay} size={46} thickness={4} />
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black"
                style={{ background: "var(--imc-marigold-tint)", color: "var(--imc-marigold-dark)" }}
              >
                <Flame size={11} />
                Day {currentDay} streak
              </div>
              {isMissed && (
                <div className="flex items-center gap-1.5 rounded-full bg-[#FEF3F2] px-2.5 py-1 text-[9px] font-black text-[#D92D20]">
                  <Flag size={11} />
                  Missed this journey
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              <StatBox icon={Heart} value={totals.likes || 0} label="Likes" />
              <StatBox
                icon={MessageCircle}
                value={totals.comments || 0}
                label="Comments"
              />
              <StatBox
                icon={Repeat2}
                value={totals.reposts || 0}
                label="Reposts"
              />
              <StatBox
                icon={Bookmark}
                value={totals.saves || 0}
                label="Saves"
              />
              <StatBox icon={Eye} value={totals.views || 0} label="Views" />
            </div>

            {isMissed && (
              <div className="mt-3 overflow-hidden rounded-[22px] border border-[rgba(67,56,202,0.18)] bg-[var(--imc-indigo-soft)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-black text-[var(--imc-indigo-text)]">
                      <Flag size={14} /> Journey closed as missed
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                      {journey.uncompletedReason || "A required daily update was missed."}
                    </p>
                  </div>
                  {journey.isOwner && !editingFinalNote && (
                    <button
                      type="button"
                      onClick={() => setEditingFinalNote(true)}
                      className="shrink-0 rounded-full bg-[var(--imc-indigo)] px-3 py-1.5 text-[10px] font-black text-white active:scale-95"
                    >
                      {journey.finalNote ? "Edit note" : "Add final note"}
                    </button>
                  )}
                </div>

                {editingFinalNote ? (
                  <div className="mt-3">
                    <textarea
                      value={finalNote}
                      onChange={(event) => setFinalNote(event.target.value.slice(0, 1000))}
                      maxLength={1000}
                      autoFocus
                      placeholder="Share honestly what happened, what you learned, and what you will do differently next time."
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-[rgba(67,56,202,0.24)] bg-[var(--imc-surface)] p-3 text-[13px] font-semibold leading-5 text-[var(--imc-text)] outline-none focus:border-[var(--imc-indigo)]"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-[var(--imc-text-muted)]">{finalNote.length}/1000</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingFinalNote(false); setFinalNote(journey.finalNote || ""); }} className="rounded-full px-3 py-2 text-[11px] font-black text-[var(--imc-indigo-text)]">
                          Cancel
                        </button>
                        <button type="button" onClick={handleSaveFinalNote} disabled={savingFinalNote || !finalNote.trim()} className="rounded-full bg-[var(--imc-indigo)] px-4 py-2 text-[11px] font-black text-white disabled:opacity-50">
                          {savingFinalNote ? "Saving..." : "Publish final note"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : journey.finalNote ? (
                  <div className="mt-3 border-t border-[rgba(67,56,202,0.18)] pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--imc-indigo-text)]">Creator's final note</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] font-semibold leading-6 text-[var(--imc-text)]">{journey.finalNote}</p>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-[rgba(67,56,202,0.18)] pt-3 text-[11px] font-semibold text-[var(--imc-text-muted)]">
                    No final reflection has been added yet.
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--imc-surface-2)" }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black" style={{ color: "var(--imc-text)" }}>
                  About this journey
                </p>

                {journey.isOwner && (
                  <button
                    type="button"
                    onClick={() => setEditingAbout(true)}
                    className="flex items-center gap-1 text-[11px] font-black"
                    style={{ color: "var(--imc-indigo-text)" }}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                )}
              </div>

              {editingAbout ? (
                <div>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value.slice(0, 100))}
                    maxLength={100}
                    className="min-h-[100px] w-full resize-none rounded-2xl p-3 text-[13px] font-semibold leading-5 outline-none"
                    style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)", color: "var(--imc-text)" }}
                    placeholder="Write about your journey..."
                  />
                  <p className="mt-1 text-right text-[10px] font-bold" style={{ color: "var(--imc-text-faint)" }}>
                    {aboutText.length}/100
                  </p>

                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-black" style={{ color: "var(--imc-text)" }}>
                      Journey days
                    </p>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dayOptions.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setEditDays(days)}
                          className="shrink-0 rounded-full px-3 py-2 text-[11px] font-black"
                          style={
                            editDays === days
                              ? { background: "var(--imc-surface-strong)", color: "var(--imc-on-surface-strong)" }
                              : { background: "var(--imc-surface)", color: "var(--imc-text-muted)" }
                          }
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAbout}
                      disabled={savingAbout}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-black"
                      style={{ background: "var(--imc-surface-strong)", color: "var(--imc-on-surface-strong)" }}
                    >
                      <Save size={14} />
                      {savingAbout ? "Saving..." : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAbout(false);
                        setAboutText(journey.description || "");
                        setEditDays(targetDays);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-black"
                      style={{ background: "var(--imc-surface)", color: "var(--imc-text)", border: "1px solid var(--imc-border)" }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-semibold leading-6" style={{ color: "var(--imc-text)" }}>
                  {journey.description || "No about section added yet."}
                </p>
              )}
            </div>

            {Array.isArray(journey.dayEditHistory) &&
              journey.dayEditHistory.length > 0 && (
                <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--imc-marigold-tint)" }}>
                  <p className="text-[11px] font-black" style={{ color: "var(--imc-marigold-dark)" }}>
                    Journey edits
                  </p>

                  <div className="mt-2 space-y-1.5">
                    {journey.dayEditHistory
                      .slice()
                      .reverse()
                      .map((edit, index) => (
                        <p
                          key={index}
                          className="text-[11px] font-bold"
                          style={{ color: "var(--imc-marigold-dark)" }}
                        >
                          Target updated: {edit.oldDays} days → {edit.newDays}{" "}
                          days
                          {edit.editedAt ? ` • ${formatDate(edit.editedAt)}` : ""}
                        </p>
                      ))}
                  </div>
                </div>
              )}

            <div className="mt-3 grid grid-cols-3 gap-2">
              <InfoBox
                icon={Users}
                label="Followers"
                value={formatCount(journey.followersCount || 0)}
              />
              <InfoBox
                icon={Flame}
                label="Updates"
                value={formatCount(journey.updatesCount || 0)}
              />
              <InfoBox
                icon={CalendarDays}
                label="Deadline"
                value={
                  journey.deadline
                    ? formatDate(journey.deadline)
                    : `${targetDays} Days`
                }
              />
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl p-3" style={{ background: "var(--imc-surface-strong)" }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-black" style={{ color: "var(--imc-marigold)" }}>
                  <Flame size={13} style={{ color: "var(--imc-marigold)" }} />
                  Day {progressDay} of {targetDays}
                </p>
                <p className="text-[11px] font-black" style={{ color: "var(--imc-marigold)" }}>
                  {progress}%
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.16)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--imc-marigold), var(--imc-indigo))" }}
                />
              </div>

              {isMissed ? (
                <p className="mt-2 text-[11px] font-bold text-[#FDA29B]">
                  This journey is closed. Progress updates are no longer available.
                </p>
              ) : journey.todayUpdateDone && journey.isOwner ? (
                <p className="mt-2 text-[11px] font-bold" style={{ color: "var(--imc-success)" }}>
                  Today's journey update is already completed.
                </p>
              ) : (
                <p className="mt-2 text-[11px] font-bold text-white/55">
                  {targetDays - currentDay > 0
                    ? `${targetDays - currentDay} days to go — keep the streak alive.`
                    : "Final stretch — you're almost there."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-5">
          <div className="mb-3">
            <h3 className="text-[17px] font-black" style={{ color: "var(--imc-text)" }}>
              Progress Timeline
            </h3>
            <p className="text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
              Each day compares your first proof with current progress.
            </p>
          </div>

          {sortedMilestones.length === 0 ? (
            <div className="rounded-3xl p-6 text-center" style={{ border: "1px dashed var(--imc-border)" }}>
              <Camera className="mx-auto" style={{ color: "var(--imc-text-faint)" }} size={28} />
              <h4 className="mt-3 text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                No updates yet
              </h4>
              <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                Start with a live progress photo.
              </p>
            </div>
          ) : (
            <div className="relative space-y-5 pl-1">
              <div
                className="pointer-events-none absolute bottom-2 left-[23px] top-2 w-[2px]"
                style={{ background: "var(--imc-border)" }}
              />

              {sortedMilestones.map((item, index) => {
                const isLatest = index === sortedMilestones.length - 1;
                return (
                  <div key={item._id} className="relative flex gap-3">
                    <div
                      className="relative z-10 mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-black"
                      style={{
                        background: isLatest ? "var(--imc-marigold)" : "var(--imc-surface-strong)",
                        color: isLatest ? "#12141c" : "var(--imc-on-surface-strong)",
                        boxShadow: "0 0 0 3px var(--imc-bg)",
                      }}
                    >
                      {item.day}
                    </div>

                    <div className="min-w-0 flex-1">
                      <TimelineItem
                        milestone={item}
                        firstImage={firstImage}
                        onChanged={refreshJourneySilently}
                        onImageOpen={setViewerImage}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {viewerImage && <ImageViewer src={viewerImage} onClose={() => setViewerImage("")} />}

      <BottomNav />
      </div>
    </div>
  );
}

function ProgressRing({ progress, day, size = 56, thickness = 5 }) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--imc-marigold) ${pct * 3.6}deg, var(--imc-border) 0deg)`,
      }}
    >
      <div
        className="grid place-items-center rounded-full text-center"
        style={{
          width: size - thickness * 2,
          height: size - thickness * 2,
          background: "var(--imc-surface)",
        }}
      >
        <div>
          <p className="text-[7px] font-black leading-none" style={{ color: "var(--imc-text-faint)" }}>
            DAY
          </p>
          <p className="text-[15px] font-black leading-4" style={{ color: "var(--imc-text)" }}>
            {day}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl p-2 text-center" style={{ background: "var(--imc-surface-2)" }}>
      <Icon size={15} className="mx-auto" style={{ color: "var(--imc-text-muted)" }} />
      <p className="mt-1 text-[12px] font-black" style={{ color: "var(--imc-text)" }}>
        {formatCount(value || 0)}
      </p>
      <p className="text-[8px] font-bold" style={{ color: "var(--imc-text-muted)" }}>{label}</p>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "var(--imc-surface-2)" }}>
      <Icon size={16} style={{ color: "var(--imc-indigo-text)" }} />
      <p className="mt-2 text-[14px] font-black" style={{ color: "var(--imc-text)" }}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold" style={{ color: "var(--imc-text-muted)" }}>{label}</p>
    </div>
  );
}

function TimelineItem({ milestone, firstImage, onChanged, onImageOpen }) {
  const currentImage = getImageUrl(milestone.images?.[0]);
  const showComparison =
    firstImage &&
    currentImage &&
    firstImage !== currentImage &&
    milestone.day > 1;

  const milestoneId = milestone?._id;

  const [likes, setLikes] = useState(milestone.likesCount || 0);
  const [comments, setComments] = useState(milestone.commentsCount || 0);
  const [reposts, setReposts] = useState(milestone.repostsCount || 0);
  const [saves, setSaves] = useState(milestone.savesCount || 0);
  const [views] = useState(milestone.impressionsCount || 0);

  const [liked, setLiked] = useState(Boolean(milestone.likedByMe));
  const [reposted, setReposted] = useState(Boolean(milestone.repostedByMe));
  const [saved, setSaved] = useState(Boolean(milestone.savedByMe));

  const [showComments, setShowComments] = useState(false);
  const [showRepost, setShowRepost] = useState(false);
  const [showViews, setShowViews] = useState(false);

  const handleLike = async () => {
    if (!milestoneId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(nextLiked ? prev + 1 : prev - 1, 0));

    try {
      if (nextLiked) await likeMilestone(milestoneId);
      else await unlikeMilestone(milestoneId);
      onChanged?.();
    } catch {
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(nextLiked ? prev - 1 : prev + 1, 0));
    }
  };

  const handleSave = async () => {
    if (!milestoneId) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(nextSaved ? prev + 1 : prev - 1, 0));

    try {
      if (nextSaved) await saveMilestone(milestoneId);
      else await unsaveMilestone(milestoneId);
      onChanged?.();
    } catch {
      setSaved(!nextSaved);
      setSaves((prev) => Math.max(nextSaved ? prev - 1 : prev + 1, 0));
    }
  };

  const handleRepost = async (caption = "") => {
    if (!milestoneId) return;

    const nextReposted = !reposted;
    setReposted(nextReposted);
    setReposts((prev) => Math.max(nextReposted ? prev + 1 : prev - 1, 0));

    try {
      const data = await repostMilestone(
        milestoneId,
        nextReposted ? caption : ""
      );

      if (typeof data.repostedByMe === "boolean") {
        setReposted(data.repostedByMe);
      }

      if (typeof data.repostsCount === "number") {
        setReposts(data.repostsCount);
      }

      setShowRepost(false);
      onChanged?.();
    } catch {
      setReposted(!nextReposted);
      setReposts((prev) => Math.max(nextReposted ? prev - 1 : prev + 1, 0));
    }
  };

  const handleShare = async () => {
    if (!milestoneId) return;

    try {
      await shareMilestone(milestoneId);

      if (navigator.share) {
        await navigator.share({
          title: milestone.title,
          text: milestone.description,
          url: window.location.href,
        });
      }

      onChanged?.();
    } catch {
      // silent
    }
  };

  return (
    <>
      <article
        className="overflow-hidden rounded-3xl p-3"
        style={{ border: "1px solid var(--imc-border)", background: "var(--imc-surface)", boxShadow: "0 10px 26px rgba(15,23,42,0.06)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold" style={{ color: "var(--imc-text-muted)" }}>
              {formatDate(milestone.createdAt)}
            </p>
          </div>

          <span
            className="rounded-full px-3 py-1.5 text-[10px] font-black"
            style={{ background: "var(--imc-indigo-tint)", color: "var(--imc-indigo-text)" }}
          >
            {milestone.captureSource === "camera" ? "Live proof" : "Proof"}
          </span>
        </div>

        {showComparison ? (
          <div className="grid grid-cols-2 gap-2">
            <ProgressImage label="Day 1" src={firstImage} onOpen={onImageOpen} />
            <ProgressImage label={`Day ${milestone.day}`} src={currentImage} onOpen={onImageOpen} />
            {milestone.achievement && (
              <div
                className="col-span-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black"
                style={{ background: "var(--imc-marigold-tint)", color: "var(--imc-marigold-dark)" }}
              >
                <Trophy size={13} />
                <span className="truncate">{milestone.achievement}</span>
              </div>
            )}
          </div>
        ) : currentImage ? (
          <ProgressImage
            label={`Day ${milestone.day}`}
            src={currentImage}
            achievement={milestone.achievement}
            onOpen={onImageOpen}
          />
        ) : (
          milestone.achievement && (
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black"
              style={{ background: "var(--imc-marigold-tint)", color: "var(--imc-marigold-dark)" }}
            >
              <Trophy size={13} />
              <span className="truncate">{milestone.achievement}</span>
            </div>
          )
        )}

        <div className="mt-3">
          <h4 className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>
            {milestone.title}
          </h4>

          {milestone.description && (
            <p className="mt-1 text-[13px] font-semibold leading-5" style={{ color: "var(--imc-text)" }}>
              {milestone.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--imc-border)" }}>
            <ActionButton
              icon={Heart}
              count={likes}
              active={liked}
              onClick={handleLike}
            />

            <ActionButton
              icon={MessageCircle}
              count={comments}
              onClick={() => setShowComments(true)}
            />

            <ActionButton
              icon={Repeat2}
              count={reposts}
              active={reposted}
              onClick={() => {
                if (reposted) handleRepost("");
                else setShowRepost(true);
              }}
            />

            <ActionButton
              icon={Bookmark}
              count={saves}
              active={saved}
              onClick={handleSave}
            />

            <ActionButton
              icon={Eye}
              count={views}
              onClick={() => setShowViews(true)}
            />

            <button
              type="button"
              onClick={handleShare}
              className="rounded-full p-1.5 active:scale-95"
              style={{ color: "var(--imc-text-muted)" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </article>

      <CommentSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        title="Journey replies"
        subtitle={`${formatCount(comments)} ${
          comments === 1 ? "reply" : "replies"
        }`}
        inputPlaceholder="Write a reply..."
        emptyTitle="No replies yet"
        emptySubtitle="Start the journey conversation."
        loadComments={() => getMilestoneComments(milestoneId)}
        addComment={(text) => commentMilestone(milestoneId, text)}
        onCommentAdded={() => {
          setComments((prev) => prev + 1);
          onChanged?.();
        }}
      />

      <RepostSheet
        open={showRepost}
        onClose={() => setShowRepost(false)}
        title="Repost Journey"
        previewTitle={milestone.title}
        previewText={milestone.description}
        onRepost={() => handleRepost("")}
        onRepostWithThought={(thought) => handleRepost(thought)}
      />

      <ViewInfoSheet
        open={showViews}
        onClose={() => setShowViews(false)}
        title="Journey Impressions"
      />
    </>
  );
}

function ActionButton({ icon: Icon, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-bold active:scale-95"
      style={{ color: active ? "var(--imc-indigo-text)" : "var(--imc-text-muted)" }}
    >
      <Icon size={15} fill={active ? "currentColor" : "none"} />
      <span>{formatCount(count || 0)}</span>
    </button>
  );
}

function ProgressImage({ src, label, achievement, onOpen }) {
  if (!src) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: "var(--imc-surface-2)" }}>
      <button type="button" onClick={() => onOpen?.(src)} aria-label={`View ${label} image`} className="block w-full active:opacity-90">
        <img src={src} alt={label} className="h-40 w-full object-cover" />
      </button>

      <div
        className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black text-white"
        style={{ background: "rgba(18,20,28,0.65)", backdropFilter: "blur(6px)" }}
      >
        {label}
      </div>

      {achievement && (
        <div
          className="absolute bottom-2 left-2 right-2 inline-flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black"
          style={{ background: "rgba(18,20,28,0.65)", color: "var(--imc-marigold)", backdropFilter: "blur(6px)", width: "fit-content" }}
        >
          <Trophy size={13} />
          <span className="truncate">{achievement}</span>
        </div>
      )}
    </div>
  );
}

function ImageViewer({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3" role="dialog" aria-modal="true" aria-label="Journey image viewer" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close image" className="absolute right-4 top-[max(16px,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md active:scale-95">
        <X size={21} />
      </button>
      <img src={src} alt="Journey full view" onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

export default JourneyProfile;
