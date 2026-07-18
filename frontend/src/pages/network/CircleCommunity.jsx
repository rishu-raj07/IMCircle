import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageCircle,
  Mic,
  MoreVertical,
  Pencil,
  Reply,
  Search,
  Send,
  ShieldOff,
  ShieldPlus,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createCirclePost,
  deleteCirclePostMessage,
  editCirclePost,
  reactToCirclePost,
  getCircleById,
  getCircleMembers,
  getCirclePosts,
  joinCircle,
  makeCircleAdmin,
  removeCircleAdmin,
  removeCircleMember,
  restrictCircleMember,
  unrestrictCircleMember,
  inviteToCircle,
  getSentCircleInvites,
  deleteCircleCommunity,
  getCircleJoinRequests,
  acceptCircleJoinRequest,
  rejectCircleJoinRequest,
} from "../../api/circleApi";
import { getUserSuggestions, searchUsers } from "../../api/userApi";
import { getMyCircleList } from "../../api/connectionApi";
import api from "../../api/axios";
import { getGenderAvatarIcon } from "../../utils/avatar";
import { getCommunityCoverIcon } from "../../utils/media";
import {
  setStoredPermissionState,
  shouldAttemptPermission,
} from "../../utils/permissions";
import VoiceMessagePlayer from "../../components/common/VoiceMessagePlayer";
import RichText from "../../components/common/RichText";
import LinkPreviewCard from "../../components/common/LinkPreviewCard";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const INK = "var(--imc-text)";
const PAPER = "var(--imc-surface-2)";
const MARIGOLD = "#EC9A1E";
const GOLD_TINT = "#FDF3E3";
const MUTED = "var(--imc-text-muted)";
const LINE = "var(--imc-border)";

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
}

function getStoredUser() {
  const keys = ["user", "authUser", "currentUser", "bn_user"];

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);
      return parsed?.user || parsed?.data?.user || parsed?.data || parsed;
    } catch {
      // ignore
    }
  }

  return null;
}

function getImageUrl(image) {
  if (!image) return "";
  const url = image?.secure_url || image?.url || image?.path || image;
  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

// Same keyword groups used server-side to personalize Suggested-for-you
// circles, keyed by the exact User.primaryInterest enum values — lets us
// rank invite candidates whose interest matches what this community is
// actually about, instead of a flat suggestions list.
const INTEREST_KEYWORDS = {
  Startup: ["startup", "founder", "business", "entrepreneur", "launch", "build", "product", "venture", "hustle"],
  Career: ["career", "job", "interview", "resume", "promotion", "placement"],
  "AI & Tech": ["ai", "tech", "code", "coding", "developer", "software", "app", "engineer", "machine learning"],
  Marketing: ["marketing", "brand", "growth", "content", "social media", "ads", "sales"],
  Finance: ["finance", "money", "invest", "stock", "budget", "trading", "wealth"],
  Design: ["design", "ux", "ui", "creative", "art", "figma"],
  "Content & Creator": ["content", "creator", "youtube", "video", "vlog", "influencer", "reel"],
};

function detectCircleInterest(circleValue) {
  const haystack = [
    circleValue?.name,
    circleValue?.description,
    ...(Array.isArray(circleValue?.tags) ? circleValue.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return interest;
  }

  return "";
}

function getAuthorName(post) {
  return (
    post?.author?.fullName ||
    post?.author?.name ||
    post?.author?.username ||
    "Circle member"
  );
}

function normalizePosts(response) {
  const list =
    response?.posts ||
    response?.circlePosts ||
    response?.data?.posts ||
    response?.data?.circlePosts ||
    response?.data ||
    response;

  return Array.isArray(list) ? list : [];
}

function CircleCommunity() {
  const navigate = useNavigate();
  const { circleId } = useParams();

  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");
  const [people, setPeople] = useState([]);
  const [myConnections, setMyConnections] = useState([]);
  const [inviteQuery, setInviteQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [actionsMember, setActionsMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const [pendingImage, setPendingImage] = useState(null);
  const [pendingImagePreview, setPendingImagePreview] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCommunity, setDeletingCommunity] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [resolvingRequestId, setResolvingRequestId] = useState("");
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const initialScrollDoneRef = useRef("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const pendingReplyForVoiceRef = useRef(null);
  const postRefs = useRef({});
  const [recording, setRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState(null);

  // Tapping a quoted-reply preview (inside a bubble, or the "Replying to"
  // bar above the composer) jumps to and briefly highlights the original
  // message — same behavior as Chat.jsx's DM chat.
  const scrollToPost = (postId) => {
    if (!postId) return;
    const el = postRefs.current[postId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedPostId(postId);
    window.setTimeout(() => {
      setHighlightedPostId((prev) => (prev === postId ? null : prev));
    }, 1200);
  };

  const cover = getImageUrl(circle?.coverImage);
  const memberCount = circle?.membersCount || 0;
  const visibility = circle?.visibility || "public";
  const tags = Array.isArray(circle?.tags) ? circle.tags : [];
  const creator = circle?.creator || {};

  const loggedInUser = useMemo(() => getStoredUser(), []);
  const viewerId = getId(loggedInUser);

  const myMembership = useMemo(
    () => members.find((m) => getId(m?.user) === viewerId),
    [members, viewerId]
  );

  const myRole =
    myMembership?.role || (getId(creator) === viewerId ? "owner" : "");

  const canManageMembers = myRole === "owner" || myRole === "admin";
  const iAmRestricted = myMembership?.status === "restricted";

  // Defensively includes the creator even if a (legacy) circle's member
  // list somehow doesn't carry an explicit owner CircleMember document —
  // createCircle() always creates one today, but this guards the invite
  // list against ever suggesting the circle's own owner/admin as someone
  // to invite.
  const memberIds = useMemo(() => {
    const ids = new Set(members.map((member) => getId(member?.user)));
    const creatorId = getId(creator);
    if (creatorId) ids.add(creatorId);
    return ids;
  }, [members, creator]);

  const circleInterest = useMemo(() => detectCircleInterest(circle), [circle]);

  const matchesQuery = (person, q) => {
    const text = [
      person?._id,
      person?.id,
      person?.username,
      person?.fullName,
      person?.name,
      person?.headline,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  };

  const connectionIds = useMemo(
    () => new Set(myConnections.map((user) => String(getId(user)))),
    [myConnections]
  );

  // Only genuinely eligible candidates ever reach the invite list: not
  // yourself, not the circle's own creator/admins/members (memberIds
  // already covers all of those), and not someone with a pending invite
  // already out to them — showing a disabled "Invited" button for those
  // instead of hiding them was the old behavior; the ask is to exclude them
  // outright. Existing personal connections ("in my circle") are still
  // shown, just ranked first and labeled, since they're real invite
  // candidates for this circle even though they're already a 1:1 connection.
  const rankedPeople = useMemo(() => {
    const merged = [...myConnections, ...people];
    const seen = new Set();
    const candidates = [];

    for (const person of merged) {
      const id = String(getId(person));
      if (
        !id ||
        id === viewerId ||
        memberIds.has(id) ||
        invitedIds.includes(id) ||
        seen.has(id)
      )
        continue;
      seen.add(id);
      candidates.push(person);
    }

    return candidates.sort((a, b) => {
      const aConnection = connectionIds.has(String(getId(a))) ? 1 : 0;
      const bConnection = connectionIds.has(String(getId(b))) ? 1 : 0;
      if (aConnection !== bConnection) return bConnection - aConnection;

      const aMatch = circleInterest && a?.primaryInterest === circleInterest ? 1 : 0;
      const bMatch = circleInterest && b?.primaryInterest === circleInterest ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [myConnections, people, memberIds, invitedIds, viewerId, circleInterest, connectionIds]);

  const filteredPeople = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase();
    if (!q) return rankedPeople;
    return rankedPeople.filter((person) => matchesQuery(person, q));
  }, [inviteQuery, rankedPeople]);

  // Backend username/name search, debounced — lets someone find an exact
  // user (e.g. "rishuraj07") even when they weren't in the preloaded
  // connections/suggestions lists at all.
  useEffect(() => {
    const q = inviteQuery.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        setSearchResults(res?.users || res?.data?.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inviteQuery]);

  const displayedPeople = useMemo(() => {
    const q = inviteQuery.trim();
    if (q.length < 2) return rankedPeople;

    const merged = [...filteredPeople, ...searchResults];
    const seen = new Set();
    const result = [];

    for (const person of merged) {
      const id = String(getId(person));
      if (
        !id ||
        id === viewerId ||
        memberIds.has(id) ||
        invitedIds.includes(id) ||
        seen.has(id)
      )
        continue;
      seen.add(id);
      result.push(person);
    }

    return result;
  }, [inviteQuery, filteredPeople, searchResults, memberIds, invitedIds, viewerId, rankedPeople]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
    });
  }, [posts]);

  // Same StrictMode-double-invoke/abort-race guard used on the Network
  // page: an aborted, superseded call must never apply its (empty/rejected)
  // results, since that's exactly what could make an already-joined
  // admin/member briefly (or, on a slow network, not-so-briefly) look like
  // an eligible invite candidate — `memberIds` above is only as good as the
  // last `members` state that actually landed.
  const loadIdRef = useRef(0);

  const loadCircle = async () => {
    if (!circleId) return;

    const requestId = ++loadIdRef.current;
    const isCurrent = () => loadIdRef.current === requestId;

    try {
      setLoading(true);
      setError("");

      const [circleRes, postsRes, peopleRes, memberRes, sentInvitesRes, joinReqRes, connectionsRes] = await Promise.allSettled([
        getCircleById(circleId),
        getCirclePosts(circleId),
        getUserSuggestions(),
        getCircleMembers(circleId),
        getSentCircleInvites(circleId),
        // Best-effort: 403s for non-admins are expected and simply ignored.
        getCircleJoinRequests(circleId),
        getMyCircleList(),
      ]);

      if (!isCurrent()) return;

      if (circleRes.status === "fulfilled") {
        setCircle(
          circleRes.value?.circle ||
            circleRes.value?.data?.circle ||
            circleRes.value?.data ||
            circleRes.value
        );
      }

      if (postsRes.status === "fulfilled") {
        setPosts(normalizePosts(postsRes.value));
      }

      if (peopleRes.status === "fulfilled") {
        setPeople(
          peopleRes.value?.users ||
            peopleRes.value?.people ||
            peopleRes.value?.suggestions ||
            peopleRes.value?.data?.users ||
            []
        );
      }

      if (memberRes.status === "fulfilled") {
        const memberList =
          memberRes.value?.members ||
          memberRes.value?.data?.members ||
          [];

        setMembers(memberList);
      }

      if (connectionsRes.status === "fulfilled") {
        setMyConnections(
          connectionsRes.value?.circle ||
            connectionsRes.value?.data?.circle ||
            []
        );
      }

      if (sentInvitesRes.status === "fulfilled") {
        const ids =
          sentInvitesRes.value?.invitedUserIds ||
          sentInvitesRes.value?.data?.invitedUserIds ||
          [];

        setInvitedIds((prev) => [...new Set([...prev, ...ids.map(String)])]);
      }

      if (joinReqRes.status === "fulfilled") {
        setJoinRequests(joinReqRes.value?.requests || joinReqRes.value?.data?.requests || []);
      } else {
        setJoinRequests([]);
      }
    } catch (loadError) {
      if (!isCurrent()) return;
      setError(loadError?.response?.data?.message || "Circle could not be loaded.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  useEffect(() => {
    loadCircle();
  }, [circleId]);

  useEffect(() => {
    initialScrollDoneRef.current = "";
  }, [circleId]);

  // Same fix as the DM chat (Chat.jsx): open this community's message
  // thread already scrolled to the latest message instead of visibly
  // animating down to it after the page loads. Runs before paint so
  // there's no flash of the top of the thread first.
  useLayoutEffect(() => {
    if (loading) return;
    if (initialScrollDoneRef.current === circleId) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    initialScrollDoneRef.current = circleId;
  }, [loading, circleId, sortedPosts]);

  const handleJoin = async () => {
    if (!circleId || joining) return;

    try {
      setJoining(true);
      setError("");
      await joinCircle(circleId);
      setCircle((prev) => ({
        ...prev,
        membersCount: (prev?.membersCount || 0) + 1,
      }));
    } catch (joinError) {
      const messageText = joinError?.response?.data?.message || "";
      if (messageText.toLowerCase().includes("already joined")) {
        return;
      }
      setError(messageText || "Could not join this circle.");
    } finally {
      setJoining(false);
    }
  };

  const handlePickImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview("");
  };

  const handleSend = async () => {
    const content = message.trim();
    if (!content && !pendingImage) return;

    try {
      setPosting(true);
      setError("");

      const data = await createCirclePost(circleId, {
        content,
        imageFile: pendingImage,
        replyTo: getId(replyTarget),
      });

      const post = data?.post || data?.data?.post || data?.data || data;

      if (post && getId(post)) {
        setPosts((prev) => [...prev, post]);
      } else {
        await loadCircle();
      }

      setMessage("");
      clearPendingImage();
      setReplyTarget(null);
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    } catch (postError) {
      setError(postError?.response?.data?.message || "Could not send this message.");
    } finally {
      setPosting(false);
    }
  };

  // Voice messages for the community chat — same two-step flow as the DM
  // chat's mic button (Chat.jsx): upload the recorded clip to the existing
  // generic /upload/audio endpoint first, then create a circle post that
  // just references the resulting URL (see circleApi.js's createCirclePost).
  const sendVoiceMessage = async (file) => {
    if (!file) return;

    setSendingVoice(true);
    const replySnapshot = pendingReplyForVoiceRef.current;
    pendingReplyForVoiceRef.current = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/upload/audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const attachment = uploadRes.data?.file;
      if (!attachment?.url) return;

      const data = await createCirclePost(circleId, {
        audioUrl: attachment.url,
        audioPublicId: attachment.publicId,
        replyTo: getId(replySnapshot),
      });

      const post = data?.post || data?.data?.post || data?.data || data;

      if (post && getId(post)) {
        setPosts((prev) => [...prev, post]);
      } else {
        await loadCircle();
      }

      setReplyTarget(null);
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    } catch (voiceError) {
      setError(voiceError?.response?.data?.message || "Could not send this voice message.");
    } finally {
      setSendingVoice(false);
    }
  };

  const toggleRecording = async () => {
    if (iAmRestricted || sendingVoice) return;

    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    // Respect an already-known denial instead of calling getUserMedia again
    // on every tap — same guard Chat.jsx's mic button uses.
    const canAttempt = await shouldAttemptPermission("microphone");

    if (!canAttempt) {
      alert(
        "Microphone access is turned off for IMCircle. Enable it in your device settings to record voice notes."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStoredPermissionState("microphone", "granted");
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type,
        });

        sendVoiceMessage(file);
      };

      pendingReplyForVoiceRef.current = replyTarget;
      setReplyTarget(null);

      recorder.start();
      setRecording(true);
    } catch (recordError) {
      setStoredPermissionState("microphone", "denied");
      alert("Microphone permission is needed to record voice notes.");
    }
  };

  const handleReactToPost = async (post, emoji) => {
    const postId = getId(post);
    if (!postId) return;

    const isMine = (reaction) => getId(reaction?.user) === viewerId;

    setPosts((prev) =>
      prev.map((item) => {
        if (getId(item) !== postId) return item;

        const current = Array.isArray(item.reactions) ? item.reactions : [];
        const existing = current.find(isMine);

        let nextReactions;
        if (existing && existing.emoji === emoji) {
          nextReactions = current.filter((reaction) => !isMine(reaction));
        } else if (existing) {
          nextReactions = current.map((reaction) =>
            isMine(reaction) ? { ...reaction, emoji } : reaction
          );
        } else {
          nextReactions = [...current, { user: viewerId, emoji }];
        }

        return { ...item, reactions: nextReactions };
      })
    );

    try {
      await reactToCirclePost(postId, emoji);
    } catch {
      await loadCircle();
    }
  };

  const handleDeletePost = async (post) => {
    const postId = getId(post);
    if (!postId) return;

    const prevPosts = posts;
    setPosts((prev) => prev.filter((item) => getId(item) !== postId));

    try {
      await deleteCirclePostMessage(postId);
    } catch (deleteError) {
      setPosts(prevPosts);
      setError(deleteError?.response?.data?.message || "Could not delete this message.");
    }
  };

  const handleEditPost = async (postId, content) => {
    if (!postId) return;

    const prevPosts = posts;
    setPosts((prev) =>
      prev.map((item) =>
        getId(item) === postId
          ? { ...item, content, isEdited: true, editedAt: new Date().toISOString() }
          : item
      )
    );

    try {
      const res = await editCirclePost(postId, content);
      setPosts((prev) =>
        prev.map((item) => (getId(item) === postId ? { ...item, ...res.post } : item))
      );
    } catch (editError) {
      setPosts(prevPosts);
      setError(editError?.response?.data?.message || "Could not save your edit.");
    }
  };

  const handleMakeAdmin = async (member) => {
    const userId = getId(member?.user || member);
    if (!userId || !circleId) return;

    setActionsMember(null);
    setMembers((prev) =>
      prev.map((m) => (getId(m?.user) === userId ? { ...m, role: "admin" } : m))
    );

    try {
      await makeCircleAdmin(circleId, userId);
    } catch (actionError) {
      setError(actionError?.response?.data?.message || "Could not make this member an admin.");
      await loadCircle();
    }
  };

  const handleRemoveMember = async (member) => {
    const userId = getId(member?.user || member);
    if (!userId || !circleId) return;

    setActionsMember(null);
    const prevMembers = members;
    setMembers((prev) => prev.filter((m) => getId(m?.user) !== userId));
    setCircle((prev) => ({
      ...prev,
      membersCount: Math.max((prev?.membersCount || 1) - 1, 0),
    }));

    try {
      await removeCircleMember(circleId, userId);
    } catch (actionError) {
      setMembers(prevMembers);
      setCircle((prev) => ({
        ...prev,
        membersCount: (prev?.membersCount || 0) + 1,
      }));
      setError(actionError?.response?.data?.message || "Could not remove this member.");
    }
  };

  const handleToggleRestrict = async (member, restrict) => {
    const userId = getId(member?.user || member);
    if (!userId || !circleId) return;

    setActionsMember(null);
    setMembers((prev) =>
      prev.map((m) =>
        getId(m?.user) === userId
          ? { ...m, status: restrict ? "restricted" : "active" }
          : m
      )
    );

    try {
      if (restrict) await restrictCircleMember(circleId, userId);
      else await unrestrictCircleMember(circleId, userId);
    } catch (actionError) {
      setError(actionError?.response?.data?.message || "Could not update this member's access.");
      await loadCircle();
    }
  };

  const handleRemoveAdmin = async (member) => {
    const userId = getId(member?.user || member);
    if (!userId || !circleId) return;

    setActionsMember(null);
    setMembers((prev) =>
      prev.map((m) => (getId(m?.user) === userId ? { ...m, role: "member" } : m))
    );

    try {
      await removeCircleAdmin(circleId, userId);
    } catch (actionError) {
      setError(actionError?.response?.data?.message || "Could not remove admin access.");
      await loadCircle();
    }
  };

  const handleDeleteCommunity = async () => {
    if (!circleId || deletingCommunity) return;

    try {
      setDeletingCommunity(true);
      setError("");
      await deleteCircleCommunity(circleId);
      navigate("/network");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "Could not delete this community.");
      setShowDeleteConfirm(false);
    } finally {
      setDeletingCommunity(false);
    }
  };

  const handleAcceptJoinRequest = async (request) => {
    const requestId = getId(request);
    if (!requestId || !circleId || resolvingRequestId) return;

    setResolvingRequestId(requestId);
    const prevRequests = joinRequests;
    setJoinRequests((prev) => prev.filter((item) => getId(item) !== requestId));

    try {
      await acceptCircleJoinRequest(circleId, requestId);
      setCircle((prev) => ({
        ...prev,
        membersCount: (prev?.membersCount || 0) + 1,
      }));
      await loadCircle();
    } catch (actionError) {
      setJoinRequests(prevRequests);
      setError(actionError?.response?.data?.message || "Could not accept this request.");
    } finally {
      setResolvingRequestId("");
    }
  };

  const handleRejectJoinRequest = async (request) => {
    const requestId = getId(request);
    if (!requestId || !circleId || resolvingRequestId) return;

    setResolvingRequestId(requestId);
    const prevRequests = joinRequests;
    setJoinRequests((prev) => prev.filter((item) => getId(item) !== requestId));

    try {
      await rejectCircleJoinRequest(circleId, requestId);
    } catch (actionError) {
      setJoinRequests(prevRequests);
      setError(actionError?.response?.data?.message || "Could not reject this request.");
    } finally {
      setResolvingRequestId("");
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="grid h-full place-items-center">
          <Loader2 className="animate-spin" size={26} style={{ color: MARIGOLD }} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="z-20 shrink-0 border-b bg-white/92 px-4 py-3 backdrop-blur-xl" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: PAPER, color: INK }}
          >
            <ArrowLeft size={20} />
          </button>

          <button
            onClick={() => setShowDetails(true)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex min-w-0 items-center gap-2">
              <CircleAvatar circle={circle} size={34} />
              <div className="min-w-0">
                <h1 className="truncate text-[16px] font-black" style={{ color: INK }}>
                  {circle?.name || "Circle"}
                </h1>
                <p className="truncate text-[11px] font-bold" style={{ color: MUTED }}>
                  {circle?.description || `${memberCount} members · ${visibility}`}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowCommunityMenu(true)}
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{ background: PAPER, color: INK }}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto px-4 pb-32 pt-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {error && (
          <div className="mt-4 rounded-[18px] p-3 text-[12px] font-bold" style={{ background: "#FFF1F0", color: "#B42318" }}>
            {error}
          </div>
        )}

        <section className="mt-4">
          {sortedPosts.length === 0 ? (
            <div className="rounded-[24px] bg-[var(--imc-surface)] p-6 text-center" style={{ border: `1px solid ${LINE}` }}>
              <MessageCircle className="mx-auto" size={26} style={{ color: MARIGOLD }} />
              <p className="mt-3 text-[14px] font-black" style={{ color: INK }}>
                No messages yet
              </p>
              <p className="mt-1 text-[12px] font-semibold" style={{ color: MUTED }}>
                Start the first message for this community.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
              {sortedPosts.map((post) => (
                <PostBubble
                  key={getId(post) || `${post?.createdAt}-${post?.content}`}
                  post={post}
                  viewerId={viewerId}
                  canModerate={canManageMembers}
                  onReply={(target) => setReplyTarget(target)}
                  onReact={(target, emoji) => handleReactToPost(target, emoji)}
                  onDelete={(target) => handleDeletePost(target)}
                  onEdit={(postId, content) => handleEditPost(postId, content)}
                  onJumpToMessage={scrollToPost}
                  registerRef={(id, el) => {
                    if (id) postRefs.current[id] = el;
                  }}
                  highlighted={highlightedPostId === getId(post)}
                />
              ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        <div ref={bottomRef} />
      </main>

      <div
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t bg-white/95 px-3 py-3 backdrop-blur-xl"
        style={{ borderColor: LINE, paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {iAmRestricted ? (
          <div
            className="flex items-center gap-2 rounded-[18px] px-4 py-3 text-[12px] font-bold"
            style={{ background: "#FFF1F0", color: "#B42318" }}
          >
            <Ban size={16} />
            An admin has restricted you from messaging in this circle.
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {replyTarget && (
                <motion.div
                  key="reply-bar"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 overflow-hidden rounded-[14px] px-3 py-2"
                  style={{ background: PAPER }}
                >
                  <Reply size={14} style={{ color: MARIGOLD }} className="shrink-0" />
                  <button
                    type="button"
                    onClick={() => scrollToPost(getId(replyTarget))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[10px] font-black" style={{ color: INK }}>
                      Replying to {getUserName(replyTarget?.author)}
                    </p>
                    <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                      {replyTarget?.content ||
                        (replyTarget?.image?.url ? "Photo" : "") ||
                        (replyTarget?.audio?.url ? "🎤 Voice message" : "")}
                    </p>
                  </button>
                  <button
                    onClick={() => setReplyTarget(null)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                    style={{ color: MUTED }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {pendingImagePreview && (
                <motion.div
                  key="image-preview"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-[12px]">
                    <img src={pendingImagePreview} alt="Selected" className="h-full w-full object-cover" />
                    <button
                      onClick={clearPendingImage}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {recording && (
                <motion.div
                  key="recording-bar"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-center gap-2 overflow-hidden text-[11px] font-black"
                  style={{ color: "#D92D20" }}
                >
                  <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "#D92D20" }} />
                  Recording voice message
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickImage}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                style={{ background: PAPER, color: INK }}
              >
                <ImagePlus size={20} />
              </button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message this circle"
                rows={1}
                className="max-h-24 min-h-[44px] flex-1 resize-none rounded-[22px] px-4 py-3 text-[14px] font-semibold outline-none"
                style={{ background: PAPER, color: INK }}
              />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleRecording}
                disabled={sendingVoice}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                style={
                  recording
                    ? { background: "#D92D20", color: "#ffffff" }
                    : { background: PAPER, color: INK }
                }
              >
                {sendingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
              </button>

              <button
                // Without this, tapping Send steals focus from the textarea
                // and closes the on-screen keyboard after every message —
                // same fix as Chat.jsx's Send button.
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSend}
                disabled={posting || (!message.trim() && !pendingImage)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-50"
                style={{ background: MARIGOLD, color: "#ffffff" }}
              >
                {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </>
        )}
      </div>

      {showDetails && (
        <DetailSheet
          circle={circle}
          creator={creator}
          tags={tags}
          memberCount={memberCount}
          members={members}
          visibility={visibility}
          canManageMembers={canManageMembers}
          viewerId={viewerId}
          joinRequests={joinRequests}
          resolvingRequestId={resolvingRequestId}
          onClose={() => setShowDetails(false)}
          onInvite={() => {
            setShowDetails(false);
            setShowInvite(true);
          }}
          onProfile={(user) => {
            const userId = getId(user);
            if (user?.username) navigate(`/profile/${user.username}`);
            else if (userId) navigate(`/profile/user/${userId}`);
          }}
          onOpenActions={(member) => setActionsMember(member)}
          onOpenMenu={() => setShowCommunityMenu(true)}
          onAcceptJoinRequest={handleAcceptJoinRequest}
          onRejectJoinRequest={handleRejectJoinRequest}
        />
      )}

      {actionsMember && (
        <MemberActionsSheet
          member={actionsMember}
          onClose={() => setActionsMember(null)}
          onMakeAdmin={() => handleMakeAdmin(actionsMember)}
          onRemoveAdmin={() => handleRemoveAdmin(actionsMember)}
          onRemove={() => handleRemoveMember(actionsMember)}
          onToggleRestrict={(restrict) => handleToggleRestrict(actionsMember, restrict)}
        />
      )}

      {showCommunityMenu && (
        <CommunityMenuSheet
          isOwner={myRole === "owner"}
          onClose={() => setShowCommunityMenu(false)}
          onDelete={() => {
            setShowCommunityMenu(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteCommunityConfirm
          circleName={circle?.name}
          loading={deletingCommunity}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteCommunity}
        />
      )}

      {showInvite && (
        <InviteSheet
          people={displayedPeople}
          query={inviteQuery}
          invitedIds={invitedIds}
          connectionIds={connectionIds}
          searching={searching}
          onQuery={setInviteQuery}
          onClose={() => setShowInvite(false)}
          onInvite={async (user) => {
            const userId = String(getId(user));
            if (!userId || !circleId) return;

            try {
              await inviteToCircle(circleId, userId);
            } catch (inviteError) {
              const messageText = inviteError?.response?.data?.message || "";
              if (!messageText.toLowerCase().includes("already")) {
                setError(messageText || "Could not send this invite.");
                return;
              }
            }

            setInvitedIds((prev) => [...new Set([...prev, userId])]);
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="flex h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div
        className="relative flex h-screen w-full max-w-[430px] flex-col overflow-hidden"
        style={{ background: PAPER }}
      >
        {children}
      </div>
    </div>
  );
}

function ActionTile({ icon, label, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      className="grid min-h-[74px] place-items-center rounded-[18px] border p-3 text-[12px] font-black"
      style={{ borderColor: LINE, color: INK, background: "#fff" }}
    >
      {loading ? <Loader2 size={21} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function CircleAvatar({ circle, size = 72 }) {
  const cover = getImageUrl(circle?.coverImage);
  const dim = `${size}px`;

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{
        width: dim,
        height: dim,
        background: "linear-gradient(145deg, #151515, #3A270D)",
        color: MARIGOLD,
      }}
    >
      {cover ? (
        <img src={cover} alt={circle?.name || "Circle"} className="h-full w-full object-cover" />
      ) : (
        <img
          src={getCommunityCoverIcon()}
          alt=""
          className="h-full w-full rounded-full object-cover"
          style={{ padding: size * 0.18 }}
        />
      )}
    </div>
  );
}

function getUserName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getUserHeadline(user) {
  return user?.headline || user?.role || user?.field || user?.username || "Circle member";
}

function UserAvatar({ user, size = 42 }) {
  const image = getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.photo ||
      user?.picture
  );
  const dim = `${size}px`;

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full text-[13px] font-black"
      style={{ width: dim, height: dim, background: INK, color: MARIGOLD }}
    >
      <img
        src={image || getGenderAvatarIcon(user)}
        alt={getUserName(user)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function DetailSheet({
  circle,
  creator,
  tags,
  memberCount,
  members,
  visibility,
  canManageMembers,
  viewerId,
  joinRequests,
  resolvingRequestId,
  onClose,
  onInvite,
  onProfile,
  onOpenActions,
  onOpenMenu,
  onAcceptJoinRequest,
  onRejectJoinRequest,
}) {
  const visibleMembers =
    members.length > 0
      ? members
      : [creator].filter((user) => getId(user)).map((user) => ({ user, role: "owner" }));

  return (
    <div className="fixed inset-0 z-50 isolate flex justify-center bg-black/45">
      <div
        className="relative h-full w-full max-w-[430px] overflow-y-auto [&::-webkit-scrollbar]:hidden"
        style={{ background: PAPER, scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 backdrop-blur-xl" style={{ borderColor: LINE }}>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{ background: PAPER, color: INK }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[15px] font-black" style={{ color: INK }}>
            Community info
          </h2>
          <button
            onClick={onOpenMenu}
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{ background: PAPER, color: INK }}
          >
            <MoreVertical size={18} />
          </button>
        </header>

        <main className="px-4 pb-8 pt-5">
          <section className="rounded-[28px] bg-[var(--imc-surface)] p-5 text-center shadow-[0_16px_36px_rgba(18,20,28,0.06)]" style={{ border: `1px solid ${LINE}` }}>
            <div className="flex justify-center">
              <CircleAvatar circle={circle} size={104} />
            </div>
            <h1 className="mt-4 font-serif text-[24px] font-semibold leading-tight" style={{ color: INK }}>
              {circle?.name || "Circle"}
            </h1>
            <p className="mt-1 text-[12px] font-black" style={{ color: INK }}>
              Community · {memberCount} members · {visibility}
            </p>
            <p className="mx-auto mt-3 max-w-[320px] text-[13px] font-semibold leading-5" style={{ color: MUTED }}>
              {circle?.description || "Members can chat inside this circle."}
            </p>

            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: GOLD_TINT, color: "#8A5A12" }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={onInvite}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[17px] text-[13px] font-black"
              style={{ background: MARIGOLD, color: "#ffffff" }}
            >
              <UserPlus size={18} />
              Invite people
            </button>
          </section>

          {canManageMembers && joinRequests.length > 0 && (
            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-serif text-[17px] font-semibold" style={{ color: INK }}>
                  Join requests
                </h3>
                <span className="text-[11px] font-black" style={{ color: INK }}>
                  {joinRequests.length}
                </span>
              </div>

              <div className="space-y-2">
                {joinRequests.map((request) => {
                  const user = request?.user || {};
                  const requestId = getId(request);
                  const isResolving = resolvingRequestId === requestId;

                  return (
                    <div
                      key={requestId}
                      className="rounded-[20px] bg-[var(--imc-surface)] p-3"
                      style={{ border: `1px solid ${LINE}` }}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black" style={{ color: INK }}>
                            {getUserName(user)}
                          </p>
                          <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                            {getUserHeadline(user)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          disabled={isResolving}
                          onClick={() => onAcceptJoinRequest(request)}
                          className="flex h-9 items-center justify-center gap-1 rounded-[14px] text-[11px] font-black disabled:opacity-60"
                          style={{ background: MARIGOLD, color: "#ffffff" }}
                        >
                          <CheckCircle2 size={14} />
                          {isResolving ? "..." : "Accept"}
                        </button>
                        <button
                          disabled={isResolving}
                          onClick={() => onRejectJoinRequest(request)}
                          className="flex h-9 items-center justify-center gap-1 rounded-[14px] bg-[var(--imc-surface)] text-[11px] font-black disabled:opacity-60"
                          style={{ border: `1px solid ${LINE}`, color: MUTED }}
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="font-serif text-[17px] font-semibold" style={{ color: INK }}>
                Members
              </h3>
              <span className="text-[11px] font-black" style={{ color: INK }}>
                {memberCount}
              </span>
            </div>

            <div className="space-y-2">
              {visibleMembers.length > 0 ? (
                visibleMembers.map((member) => {
                  const user = member?.user || member;
                  const role = member?.role || "";
                  const restricted = member?.status === "restricted";
                  const memberId = getId(user);
                  const canManageThis =
                    canManageMembers && memberId !== viewerId && role !== "owner";

                  return (
                    <div
                      key={memberId}
                      className="flex w-full items-center gap-3 rounded-[20px] bg-[var(--imc-surface)] p-3"
                      style={{ border: `1px solid ${LINE}` }}
                    >
                      <button
                        onClick={() => onProfile(user)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <UserAvatar user={user} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black" style={{ color: INK }}>
                            {getUserName(user)}
                          </p>
                          <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                            {getUserHeadline(user)}
                          </p>
                        </div>
                      </button>

                      {(role === "owner" || role === "admin") && (
                        <span
                          className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black"
                          style={{ background: GOLD_TINT, color: "#8A5A12" }}
                        >
                          {role === "owner" ? "Owner" : "Admin"}
                        </span>
                      )}

                      {restricted && (
                        <span
                          className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black"
                          style={{ background: "#FFF1F0", color: "#B42318" }}
                        >
                          Restricted
                        </span>
                      )}

                      {canManageThis && (
                        <button
                          onClick={() => onOpenActions(member)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                          style={{ color: MUTED }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[20px] bg-[var(--imc-surface)] p-4 text-center text-[12px] font-bold" style={{ border: `1px solid ${LINE}`, color: MUTED }}>
                  Members will appear here when the backend exposes the member list.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function MemberActionsSheet({
  member,
  onClose,
  onMakeAdmin,
  onRemoveAdmin,
  onRemove,
  onToggleRestrict,
}) {
  const user = member?.user || member;
  const role = member?.role || "member";
  const restricted = member?.status === "restricted";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[28px] bg-[var(--imc-surface)] p-4 pb-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: LINE }} />

        <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: LINE }}>
          <UserAvatar user={user} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black" style={{ color: INK }}>
              {getUserName(user)}
            </p>
            <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
              {getUserHeadline(user)}
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {role !== "admin" && role !== "owner" && (
            <SheetAction icon={<ShieldPlus size={18} />} label="Make admin" onClick={onMakeAdmin} />
          )}

          {role === "admin" && (
            <SheetAction
              icon={<ShieldOff size={18} />}
              label="Remove as admin"
              description="They'll go back to being a regular member."
              onClick={onRemoveAdmin}
            />
          )}

          {restricted ? (
            <SheetAction
              icon={<CheckCircle2 size={18} />}
              label="Allow messaging"
              description="They'll be able to send messages in this circle again."
              onClick={() => onToggleRestrict(false)}
            />
          ) : (
            <SheetAction
              icon={<Ban size={18} />}
              label="Stop access to messaging"
              description="They can still view the circle but won't be able to send messages."
              onClick={() => onToggleRestrict(true)}
            />
          )}

          <SheetAction
            icon={<UserMinus size={18} />}
            label="Remove from community"
            danger
            onClick={onRemove}
          />
        </div>
      </div>
    </div>
  );
}

function SheetAction({ icon, label, description, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-[16px] px-2 py-3 text-left active:bg-black/5"
    >
      <span className="mt-0.5 shrink-0" style={{ color: danger ? "#D92D20" : INK }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[13px] font-black"
          style={{ color: danger ? "#D92D20" : INK }}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] font-semibold" style={{ color: MUTED }}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function InviteSheet({
  people,
  query,
  invitedIds,
  connectionIds,
  searching,
  onQuery,
  onClose,
  onInvite,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45">
      <div className="max-h-[82vh] w-full max-w-[430px] overflow-hidden rounded-t-[30px] bg-[var(--imc-surface)] shadow-2xl">
        <div className="border-b px-4 py-4" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-black" style={{ color: INK }}>
                Invite to this circle
              </h2>
              <p className="mt-1 text-[11px] font-bold" style={{ color: MUTED }}>
                They'll get an invite to join — search by name, username, or user ID.
              </p>
            </div>
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: PAPER, color: INK }}
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="mt-4 flex h-12 items-center gap-2 rounded-[18px] px-4" style={{ background: PAPER }}>
            {searching ? (
              <Loader2 size={17} className="animate-spin" style={{ color: MARIGOLD }} />
            ) : (
              <Search size={17} style={{ color: MUTED }} />
            )}
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search by name or username (e.g. rishuraj07)"
              className="w-full bg-transparent text-[13px] font-semibold outline-none"
              style={{ color: INK }}
            />
          </div>
        </div>

        <div
          className="max-h-[58vh] overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {people.length > 0 ? (
            <div className="space-y-2">
              {people.map((person) => {
                const userId = String(getId(person));
                const invited = invitedIds.includes(userId);
                const inCircle = connectionIds?.has(userId);

                return (
                  <div
                    key={userId}
                    className="flex items-center gap-3 rounded-[20px] p-3"
                    style={{ background: PAPER }}
                  >
                    <UserAvatar user={person} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black" style={{ color: INK }}>
                        {getUserName(person)}
                      </p>
                      <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                        {getUserHeadline(person)}
                      </p>
                    </div>
                    {inCircle ? (
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black"
                        style={{ background: GOLD_TINT, color: "#8A5A12" }}
                      >
                        In your circle
                      </span>
                    ) : (
                      <button
                        onClick={() => onInvite(person)}
                        disabled={invited}
                        className="h-9 rounded-[14px] px-3 text-[11px] font-black disabled:opacity-60"
                        style={{ background: invited ? "#D1D5DB" : MARIGOLD, color: invited ? INK : "#ffffff" }}
                      >
                        {invited ? "Invited" : "Invite"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[22px] p-6 text-center" style={{ background: PAPER }}>
              <UserPlus className="mx-auto" size={25} style={{ color: MARIGOLD }} />
              <p className="mt-3 text-[13px] font-black" style={{ color: INK }}>
                No users found
              </p>
              <p className="mt-1 text-[11px] font-semibold" style={{ color: MUTED }}>
                Try another name, username, or ID.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommunityMenuSheet({ isOwner, onClose, onDelete }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[28px] bg-[var(--imc-surface)] p-4 pb-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: LINE }} />

        {isOwner ? (
          <SheetAction
            icon={<Trash2 size={18} />}
            label="Delete community"
            description="Everyone loses access and is notified."
            danger
            onClick={onDelete}
          />
        ) : (
          <p className="px-2 py-3 text-[12px] font-semibold" style={{ color: MUTED }}>
            Only the community owner can delete it.
          </p>
        )}
      </div>
    </div>
  );
}

function DeleteCommunityConfirm({ circleName, loading, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-6">
      <div className="w-full max-w-[360px] rounded-[24px] bg-[var(--imc-surface)] p-5 text-center shadow-2xl">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-full"
          style={{ background: "#FFF1F0", color: "#D92D20" }}
        >
          <AlertTriangle size={22} />
        </div>
        <h2 className="mt-3 text-[16px] font-black" style={{ color: INK }}>
          Delete {circleName || "this community"}?
        </h2>
        <p className="mt-1 text-[12px] font-semibold" style={{ color: MUTED }}>
          Every member will lose access and be notified. This can't be undone.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-11 rounded-[14px] text-[12px] font-black disabled:opacity-60"
            style={{ border: `1px solid ${LINE}`, color: INK }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-11 rounded-[14px] text-[12px] font-black text-white disabled:opacity-60"
            style={{ background: "#D92D20" }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostBubble({ post, viewerId, canModerate, onReply, onReact, onDelete, onEdit, onJumpToMessage, registerRef, highlighted }) {
  const author = post?.author || {};
  const isMine = getId(author) === viewerId;
  const canDelete = isMine || canModerate;
  const hasImage = Boolean(post?.image?.url);
  const hasAudio = Boolean(post?.audio?.url);

  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post?.content || "");
  const [savingEdit, setSavingEdit] = useState(false);

  const bubbleRef = useRef(null);
  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const swipedRef = useRef(false);
  const longPressFiredRef = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const releaseCapture = (event) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    startPos.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
    longPressFiredRef.current = false;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // unsupported in this environment — gesture still degrades gracefully
    }

    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setShowActions(true);
    }, 450);
  };

  // Works for text AND image bubbles alike — swipe right to reply while
  // still deciding whether this is a long-press.
  const handlePointerMove = (event) => {
    if (longPressFiredRef.current) return;

    const deltaX = event.clientX - startPos.current.x;
    const deltaY = event.clientY - startPos.current.y;

    if (!swipedRef.current && deltaX > 55 && Math.abs(deltaY) < 40) {
      swipedRef.current = true;
      clearPressTimer();
      onReply(post);
    }
  };

  // A quick tap just cancels the pending long-press timer. Once the popup
  // has opened, releasing does nothing to it — it stays open (peek-and-stay,
  // like WhatsApp/Reddit) until a reaction/delete is tapped or the user taps
  // anywhere else on the page.
  const handlePointerUp = (event) => {
    if (!longPressFiredRef.current) clearPressTimer();
    releaseCapture(event);
  };

  const handlePointerCancel = (event) => {
    clearPressTimer();
    releaseCapture(event);
  };

  useEffect(() => {
    if (!showActions) return undefined;

    const handleOutsidePointer = (event) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [showActions]);

  const reactionCounts = useMemo(() => {
    const list = Array.isArray(post?.reactions) ? post.reactions : [];
    const counts = {};
    list.forEach((reaction) => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });
    return counts;
  }, [post?.reactions]);

  const myReaction = (Array.isArray(post?.reactions) ? post.reactions : []).find(
    (reaction) => getId(reaction?.user) === viewerId
  )?.emoji;

  const replySnippet = post?.replyTo;

  return (
    <motion.div
      ref={bubbleRef}
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      style={{ position: "relative", zIndex: showActions ? 50 : "auto" }}
    >
      <div className="relative max-w-[86%]">
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute -top-12 z-10 flex items-center gap-1 rounded-full bg-[var(--imc-surface)] p-1.5 shadow-lg ${
                isMine ? "right-0" : "left-0"
              }`}
              style={{ border: `1px solid ${LINE}` }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  onClick={() => {
                    onReact(post, emoji);
                    setShowActions(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-[16px]"
                >
                  {emoji}
                </motion.button>
              ))}
              {isMine && !hasAudio && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  onClick={() => {
                    setEditDraft(post?.content || "");
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full"
                  style={{ color: INK }}
                >
                  <Pencil size={14} />
                </motion.button>
              )}
              {canDelete && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  onClick={() => {
                    onDelete(post);
                    setShowActions(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full"
                  style={{ color: "#D92D20" }}
                >
                  <Trash2 size={15} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <article
          ref={(el) => registerRef?.(getId(post), el)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(event) => {
            if (longPressFiredRef.current) event.preventDefault();
          }}
          className={`rounded-[20px] bg-[var(--imc-surface)] p-3 shadow-[0_10px_24px_rgba(18,20,28,0.04)] transition-[transform,box-shadow] duration-150 ${
            highlighted ? "scale-[0.98] ring-2 ring-offset-2" : ""
          }`}
          style={{
            border: `1px solid ${LINE}`,
            touchAction: "pan-y",
            WebkitUserSelect: "none",
            userSelect: "none",
            ...(highlighted ? { "--tw-ring-color": INK, "--tw-ring-offset-color": "var(--imc-bg)" } : {}),
          }}
        >
          <div className="flex items-center gap-2">
            <UserAvatar user={author} size={26} />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black" style={{ color: INK }}>
                {getUserName(author)}
              </p>
              <p className="truncate text-[9px] font-semibold" style={{ color: MUTED }}>
                {getUserHeadline(author)}
              </p>
            </div>
          </div>

          {replySnippet && !replySnippet.isDeleted && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onJumpToMessage?.(getId(replySnippet));
              }}
              className="mt-2 block w-full rounded-[12px] border-l-4 px-2 py-1.5 text-left active:scale-[0.98] transition-transform"
              style={{ borderColor: INK, background: PAPER }}
            >
              <p className="truncate text-[10px] font-black" style={{ color: INK }}>
                {getUserName(replySnippet?.author)}
              </p>
              <p className="truncate text-[11px] font-semibold" style={{ color: MUTED }}>
                {replySnippet?.content ||
                  (replySnippet?.image?.url ? "Photo" : "") ||
                  (replySnippet?.audio?.url ? "🎤 Voice message" : "")}
              </p>
            </button>
          )}

          {hasImage && (
            <img
              src={getImageUrl(post.image)}
              alt="Shared"
              draggable={false}
              className="mt-2 max-h-[220px] w-full select-none rounded-[14px] object-cover"
            />
          )}

          {hasAudio && (
            <VoiceMessagePlayer
              url={post.audio.url}
              seedKey={getId(post) || post.audio.url}
              // Community bubbles are always the same light surface color
              // regardless of who posted (unlike Chat.jsx's DM bubbles,
              // which turn indigo for the viewer's own messages) — so this
              // always uses the light-surface color variant, never the
              // on-dark one.
              isSent={false}
              avatarUrl={
                getImageUrl(
                  author?.avatar ||
                    author?.profileImage ||
                    author?.profilePicture ||
                    author?.photo ||
                    author?.picture
                ) || getGenderAvatarIcon(author)
              }
            />
          )}

          {isEditing ? (
            <div className="mt-2" onPointerDown={(event) => event.stopPropagation()}>
              <textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value.slice(0, 3000))}
                autoFocus
                rows={3}
                className="w-full resize-none rounded-[12px] px-2.5 py-2 text-[13px] font-semibold outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK, background: PAPER }}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditDraft(post?.content || "");
                  }}
                  className="rounded-full px-3 py-1 text-[11px] font-black"
                  style={{ color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingEdit || !editDraft.trim()}
                  onClick={async () => {
                    setSavingEdit(true);
                    try {
                      await onEdit(getId(post), editDraft.trim());
                      setIsEditing(false);
                    } finally {
                      setSavingEdit(false);
                    }
                  }}
                  className="rounded-full px-3 py-1 text-[11px] font-black text-white disabled:opacity-50"
                  style={{ background: INK }}
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            post?.content && (
              <p className="mt-2 whitespace-pre-line text-[13px] font-semibold leading-5" style={{ color: INK }}>
                <RichText text={post.content} />
              </p>
            )
          )}

          {!isEditing && <LinkPreviewCard text={post?.content} />}

          <p className="mt-2 text-right text-[10px] font-bold" style={{ color: MUTED }}>
            {post?.isEdited && "edited · "}
            {post?.createdAt
              ? new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "now"}
          </p>
        </article>

        {Object.keys(reactionCounts).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            <AnimatePresence initial={false}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <motion.button
                  key={emoji}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onReact(post, emoji)}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                  style={{
                    background: myReaction === emoji ? "rgba(18,20,28,0.08)" : "var(--imc-surface)",
                    border: `1px solid ${myReaction === emoji ? INK : LINE}`,
                    color: INK,
                  }}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Mirrors Chat.jsx's VoiceMessage bubble, just restyled with this file's own
// color constants (INK/MUTED/PAPER/LINE) so it fits the community theme.
export default CircleCommunity;
