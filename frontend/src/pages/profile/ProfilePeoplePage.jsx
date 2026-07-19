import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CirclePlus,
  MoreVertical,
  Search,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import Avatar from "../../components/common/Avatar";
import { getMyProfile } from "../../api/profileApi";
import {
  unfollowUserById,
  removeFollowerById,
  removeCircleUserById,
  getUserFollowersById,
  getUserFollowingById,
  getUserCircleById,
} from "../../api/userApi";

import {
  sendCircleRequest,
  getSentCircleRequests,
} from "../../api/circleRequestApi";

import { createConversation } from "../../api/messageApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getImageUrl(user) {
  if (!user) return "";

  if (typeof user === "string") {
    if (user.startsWith("http")) return user;
    if (user.startsWith("/uploads")) return `${API_URL}${user}`;
    return user;
  }

  const url =
    user?.avatar?.secure_url ||
    user?.avatar?.url ||
    user?.avatar ||
    user?.profileImage?.secure_url ||
    user?.profileImage?.url ||
    user?.profileImage ||
    user?.profilePicture?.secure_url ||
    user?.profilePicture?.url ||
    user?.profilePicture ||
    user?.picture?.secure_url ||
    user?.picture?.url ||
    user?.picture ||
    user?.photo?.secure_url ||
    user?.photo?.url ||
    user?.photo ||
    user?.image?.secure_url ||
    user?.image?.url ||
    user?.image ||
    "";

  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;

  return url;
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || value?.userId || "";
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function normalizeUser(item) {
  if (!item) return item;

  // If `item` is already a full user document (has an id of its own), use
  // it as-is. Every user document also carries its OWN `following` and
  // `followers` arrays (their personal social graph) — without this check,
  // those non-empty arrays would incorrectly win the fallback chain below
  // and get treated as if they were the user, turning every row into
  // meaningless list-of-ids data with no name/avatar/username.
  if (item._id || item.id || item.fullName || item.username) return item;

  return item.user || item.member || item.follower || item.following || item;
}

export default function ProfilePeoplePage() {
  const navigate = useNavigate();
  const { type, userId } = useParams();

  // Viewing someone else's followers/following/circle — read-only, no
  // manage actions (remove/unfollow). Circle is additionally gated: the
  // backend only returns it if the viewer is already in that user's Circle.
  const readOnly = Boolean(userId);

  const [items, setItems] = useState([]);
  const [circleIds, setCircleIds] = useState([]);
  const [requestedIds, setRequestedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");

  // Only relevant for readOnly + pageType "circle" — true when the backend
  // rejected the request because the viewer isn't in this user's Circle yet.
  const [circleGated, setCircleGated] = useState(false);
  const [circleGateLoading, setCircleGateLoading] = useState(false);
  const [circleGateRequested, setCircleGateRequested] = useState(false);

  const pageType = readOnly
    ? ["followers", "following", "circle"].includes(type)
      ? type
      : "followers"
    : ["followers", "following", "circle"].includes(type)
    ? type
    : "followers";

  const title =
    pageType === "followers"
      ? "Followers"
      : pageType === "following"
      ? "Following"
      : "Circle";

  const loadData = async () => {
    try {
      setLoading(true);

      if (readOnly) {
        setCircleGated(false);
        setCircleGateRequested(false);

        if (pageType === "circle") {
          try {
            const data = await getUserCircleById(userId);
            const list = data?.circle || data?.data?.circle || [];

            setItems(Array.isArray(list) ? list : []);
          } catch (error) {
            if (error?.response?.status === 403) {
              setItems([]);
              setCircleGated(true);
            } else {
              setItems([]);
            }
          }

          setCircleIds([]);
          setRequestedIds([]);
          return;
        }

        const data =
          pageType === "following"
            ? await getUserFollowingById(userId)
            : await getUserFollowersById(userId);

        const list =
          pageType === "following"
            ? data?.following || data?.data?.following || []
            : data?.followers || data?.data?.followers || [];

        setItems(Array.isArray(list) ? list : []);
        setCircleIds([]);
        setRequestedIds([]);
        return;
      }

      const data = await getMyProfile();
      const user = data?.user || data?.data?.user || data?.data || data;

      const circleList = Array.isArray(user?.circle) ? user.circle : [];

      setCircleIds(
        circleList
          .map((item) => {
            const person = normalizeUser(item);
            return String(getId(person));
          })
          .filter(Boolean)
      );

      try {
        const sentData = await getSentCircleRequests();

        const sentRequests =
          sentData?.requests ||
          sentData?.data?.requests ||
          sentData?.circleRequests ||
          [];

        setRequestedIds(
          sentRequests
            .map((request) => {
              const receiver = request?.receiver || request?.to || request?.user;
              return String(getId(receiver));
            })
            .filter(Boolean)
        );
      } catch (error) {
        setRequestedIds([]);
      }

      if (pageType === "followers") {
        setItems(Array.isArray(user?.followers) ? user.followers : []);
      } else if (pageType === "following") {
        setItems(Array.isArray(user?.following) ? user.following : []);
      } else {
        setItems(circleList);
      }
    } catch (error) {
      // StrictMode's double-effect in development cancels the first of two
      // identical in-flight requests (see api/axios.js) — that's expected,
      // not a real failure, so don't clear real data because of it.
      if (error?.code === "ERR_CANCELED") return;

      setItems([]);
      setCircleIds([]);
      setRequestedIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageType, userId]);

  const filteredItems = useMemo(() => {
    return items.filter((rawItem) => {
      const item = normalizeUser(rawItem);
      const q = search.toLowerCase();

      return (
        getName(item).toLowerCase().includes(q) ||
        (item?.username || "").toLowerCase().includes(q) ||
        (item?.headline || item?.tagline || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const removeLocal = (userId) => {
    setItems((prev) =>
      prev.filter((rawItem) => {
        const item = normalizeUser(rawItem);
        return String(getId(item)) !== String(userId);
      })
    );
  };

  const openChat = async (userId) => {
    if (!userId || actionLoadingId) return;

    try {
      setActionLoadingId(userId);

      const res = await createConversation(userId);
      const conversation = res?.conversation || res?.data?.conversation;

      if (conversation?._id) {
        navigate(`/chat/${conversation._id}`, {
          state: { conversation },
        });
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setActionLoadingId("");
    }
  };

  const handleGateSendRequest = async () => {
    if (!userId || circleGateLoading || circleGateRequested) return;

    try {
      setCircleGateLoading(true);
      await sendCircleRequest(userId);
      setCircleGateRequested(true);
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setCircleGateLoading(false);
    }
  };

  const handleMainAction = async (rawItem) => {
    const item = normalizeUser(rawItem);
    const userId = getId(item);

    if (!userId || actionLoadingId) return;

    try {
      setActionLoadingId(userId);

      if (pageType === "followers") {
        await sendCircleRequest(userId);

        setRequestedIds((prev) => [...new Set([...prev, String(userId)])]);
      }

      if (pageType === "following") {
        await unfollowUserById(userId);
        removeLocal(userId);
      }

      if (pageType === "circle") {
        await openChat(userId);
      }
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setActionLoadingId("");
    }
  };

  const handleMenuAction = async (rawItem) => {
    const item = normalizeUser(rawItem);
    const userId = getId(item);

    if (!userId || actionLoadingId) return;

    try {
      setActionLoadingId(userId);

      if (pageType === "followers") {
        await removeFollowerById(userId);
      }

      if (pageType === "following") {
        await unfollowUserById(userId);
      }

      if (pageType === "circle") {
        await removeCircleUserById(userId);
        setCircleIds((prev) => prev.filter((id) => id !== String(userId)));
      }

      removeLocal(userId);
      setOpenMenu("");
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-surface)]">
      <div className="relative min-h-screen w-full max-w-[430px] bg-[var(--imc-surface)] pb-24">
        <header className="border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-10 w-10 place-items-center rounded-full active:bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={27} />
            </button>

            <div className="text-center">
              <h1 className="text-[21px] font-black text-[var(--imc-text)]">
                {title}
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-muted)]">
                {filteredItems.length} people
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/network")}
              className="grid h-10 w-10 place-items-center rounded-full text-[var(--imc-indigo-text)]"
            >
              <UserPlus size={24} />
            </button>
          </div>

          <div className="mt-4 flex h-[48px] items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
            <Search size={20} className="text-[var(--imc-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              className="h-full flex-1 bg-transparent text-[15px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>
        </header>

        <main className="px-5">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-[13px] font-black text-[var(--imc-indigo-text)]">
                Loading...
              </p>
            </div>
          ) : circleGated ? (
            <div className="flex h-[360px] flex-col items-center justify-center px-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                <CirclePlus size={28} />
              </div>
              <p className="mt-4 text-[16px] font-black text-[var(--imc-text)]">
                This Circle is private
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[var(--imc-text-muted)]">
                Join their Circle to see who else is in it.
              </p>

              <button
                type="button"
                disabled={circleGateLoading || circleGateRequested}
                onClick={handleGateSendRequest}
                className="mt-5 flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#4338CA] px-6 text-[13px] font-black text-white active:scale-[0.98] disabled:opacity-60"
              >
                <CirclePlus size={15} />
                {circleGateLoading
                  ? "..."
                  : circleGateRequested
                  ? "Request sent"
                  : "Circle"}
              </button>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((rawItem, index) => {
              const item = normalizeUser(rawItem);
              const userId = getId(item);
              const name = getName(item);
              const avatar = getImageUrl(item);
              const menuId = `${userId}-${index}`;
              const isLoading = actionLoadingId === userId;
              const isInCircle = circleIds.includes(String(userId));
              const isRequested = requestedIds.includes(String(userId));

              return (
                <div
                  key={menuId}
                  className="relative flex items-center gap-3 border-b border-[var(--imc-border)] py-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      item?.username
                        ? navigate(`/profile/${item.username}`, {
                            state: { source: "network" },
                          })
                        : navigate(`/profile/user/${userId}`, {
                            state: { source: "network" },
                          })
                    }
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-full"
                  >
                    <Avatar user={item} src={avatar} name={name} size={56} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      item?.username
                        ? navigate(`/profile/${item.username}`, {
                            state: { source: "network" },
                          })
                        : navigate(`/profile/user/${userId}`, {
                            state: { source: "network" },
                          })
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[15px] font-black text-[var(--imc-text)]">
                      {item?.username || name}
                    </p>
                    <p className="truncate text-[13px] font-bold text-[var(--imc-text-muted)]">
                      {item?.headline || item?.tagline || name}
                    </p>
                  </button>

                  {readOnly ? (
                    <button
                      type="button"
                      onClick={() =>
                        item?.username
                          ? navigate(`/profile/${item.username}`, {
                              state: { source: "network" },
                            })
                          : navigate(`/profile/user/${userId}`, {
                              state: { source: "network" },
                            })
                      }
                      className="shrink-0 rounded-xl border border-[var(--imc-border)] px-4 py-2 text-[12px] font-black text-[var(--imc-text)]"
                    >
                      View
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading || (pageType === "followers" && isRequested)}
                      onClick={async () => {
                        if (pageType !== "followers") {
                          await handleMainAction(rawItem);
                          return;
                        }

                        if (isInCircle) {
                          await openChat(userId);
                          return;
                        }

                        if (isRequested) return;

                        await handleMainAction(rawItem);
                      }}
                      className={`shrink-0 rounded-xl px-4 py-2 text-[12px] font-black disabled:opacity-60 ${
                        pageType === "followers"
                          ? isInCircle || isRequested
                            ? "bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
                            : "bg-[#4338CA] text-white"
                          : "bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
                      }`}
                    >
                      {isLoading
                        ? "..."
                        : pageType === "followers"
                        ? isInCircle
                          ? "Message"
                          : isRequested
                          ? "Requested"
                          : "+ Circle"
                        : pageType === "following"
                        ? "Unfollow"
                        : "Message"}
                    </button>
                  )}

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(openMenu === menuId ? "" : menuId)
                        }
                        className="grid h-9 w-8 place-items-center rounded-full active:bg-[var(--imc-surface-2)]"
                      >
                        <MoreVertical size={21} className="text-[var(--imc-text-muted)]" />
                      </button>

                      {openMenu === menuId && (
                        <div className="absolute right-0 top-[58px] z-20 w-44 rounded-2xl border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-2 shadow-xl">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleMenuAction(rawItem)}
                            className="w-full rounded-xl px-3 py-2 text-left text-[13px] font-black text-red-600 active:bg-red-50 disabled:opacity-60"
                          >
                            {pageType === "followers"
                              ? "Remove follower"
                              : pageType === "following"
                              ? "Unfollow"
                              : "Remove"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex h-[360px] flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                <MessageCircle size={28} />
              </div>
              <p className="mt-4 text-[16px] font-black text-[var(--imc-text)]">
                No {title} found
              </p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
