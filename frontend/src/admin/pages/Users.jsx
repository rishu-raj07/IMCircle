import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";

const USERS_PAGE_SIZE = 50;

const ACTION_COPY = {
  suspend: {
    title: "Suspend this user?",
    description: "They won't be able to sign in or post until you unsuspend them.",
    confirmLabel: "Suspend",
    danger: true,
  },
  unsuspend: {
    title: "Unsuspend this user?",
    description: "This restores their normal access immediately.",
    confirmLabel: "Unsuspend",
    danger: false,
  },
  delete: {
    title: "Delete this user?",
    description: "This hides the account and all content authored by this user until the account is restored.",
    confirmLabel: "Delete",
    danger: true,
  },
  restore: {
    title: "Restore this user?",
    description: "This restores the account and the content hidden with its deletion.",
    confirmLabel: "Restore",
    danger: false,
  },
};

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getImageUrl(value) {
  if (!value) return "";

  const url =
    value?.url ||
    value?.secure_url ||
    value?.path ||
    value?.avatar?.url ||
    value?.profileImage?.url ||
    value?.profilePicture?.url ||
    value?.photo?.url ||
    value?.photoURL ||
    value?.picture ||
    value;

  if (typeof url !== "string") return "";
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

function getAvatar(user) {
  return getImageUrl(
    user?.avatar ||
      user?.profileImage ||
      user?.profilePicture ||
      user?.photo ||
      user?.photoURL ||
      user?.picture
  );
}

function getCover(user) {
  return getImageUrl(user?.coverImage);
}

function formatDate(value, fallback = "Not added") {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
}

function formatDateTime(value, fallback = "Not available") {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return fallback;
  }
}

function getLocation(user) {
  const parts = [
    user?.location?.city,
    user?.location?.state,
    user?.location?.country,
  ].filter(Boolean);
  return parts.join(", ") || "Location not added";
}

// Every account is created with fullName "BN User" the moment someone
// requests an OTP or gets OTP-verified — it only becomes their real name
// once they finish the mandatory profile-setup form (see ProfileSetup.jsx).
// Showing that internal placeholder as if it were their actual name in the
// admin list reads as broken/confusing, so surface it as an explicit
// "hasn't finished signup" state instead of fabricating a display name.
function getDisplayName(user) {
  if (user?.fullName && user.fullName !== "BN User") return user.fullName;
  return null;
}

function getStatus(user) {
  if (user?.isDeleted) return { label: "Deleted", className: "text-[#D92D20]" };
  if (user?.isBlocked) return { label: "Suspended", className: "text-[#B54708]" };
  return { label: "Active", className: "text-[#067647]" };
}

function Avatar({ user, size = "md" }) {
  const avatar = getAvatar(user);
  const sizeClass = size === "lg" ? "h-20 w-20 text-[24px]" : "h-12 w-12 text-[16px]";

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#F2F4F7] font-black text-[#667085] ${sizeClass}`}
    >
      {avatar ? (
        <img src={avatar} alt={user?.fullName || user?.username || "User"} className="h-full w-full object-cover" />
      ) : (
        <UserRound size={size === "lg" ? 30 : 20} />
      )}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [pendingAction, setPendingAction] = useState(null); // { user, kind }
  const [actionLoading, setActionLoading] = useState(false);

  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async ({ pageNumber = 1, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/users", {
        params: { q, status, page: pageNumber, limit: USERS_PAGE_SIZE },
      });
      const nextUsers = res.data.users || [];
      setUsers((current) => (append ? [...current, ...nextUsers] : nextUsers));
      setPage(res.data.page || pageNumber);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, status]);

  useEffect(() => {
    const request = window.setTimeout(() => load({ pageNumber: 1 }), 0);
    return () => window.clearTimeout(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const runAction = async () => {
    if (!pendingAction) return;
    const { user, kind } = pendingAction;

    setActionLoading(true);
    try {
      if (kind === "delete") await adminApi.delete(`/admin/users/${user._id}`);
      else await adminApi.patch(`/admin/users/${user._id}/${kind}`);
      setPendingAction(null);
      await load({ pageNumber: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "That action failed. Try again.");
      setPendingAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (user) => {
    setDetailUser({ user, contentCount: null, recentContent: null });
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await adminApi.get(`/admin/users/${user._id}`);
      setDetailUser({
        user: res.data.user,
        contentCount: res.data.contentCount,
        recentContent: res.data.recentContent,
      });
    } catch (err) {
      setDetailError(err.response?.data?.message || "Could not load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminToolbar
        q={q}
        setQ={setQ}
        onSearch={() => load({ pageNumber: 1 })}
        status={status}
        setStatus={setStatus}
      />

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError text={error} onRetry={load} />
      ) : users.length === 0 ? (
        <AdminEmpty title="No users" text="Try another filter or search term." />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#EAECF0] bg-white">
          {users.map((user) => {
            const statusInfo = getStatus(user);
            return (
            <div
              key={user._id}
              className="flex flex-col gap-3 border-b border-[#EAECF0] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <button
                type="button"
                onClick={() => openDetail(user)}
                className="flex min-w-0 flex-1 gap-3 text-left active:scale-[0.99]"
              >
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getDisplayName(user) ? (
                      <p className="font-black text-[#12141C]">{getDisplayName(user)}</p>
                    ) : (
                      <p className="italic text-[#98A2B3]">Signup incomplete</p>
                    )}
                    <span className={`text-[11px] font-black ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="truncate text-[12px] font-bold text-[#667085]">
                    @{user.username || "unknown"} · {user.headline || user.role || user.field || "No tagline"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[#667085]">
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} /> {user.mobile || "No mobile"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail size={12} /> {user.email || "No email"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {getLocation(user)}
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 gap-2">
                {user.isBlocked ? (
                  <AdminButton onClick={() => setPendingAction({ user, kind: "unsuspend" })}>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Unsuspend
                    </span>
                  </AdminButton>
                ) : (
                  <AdminButton onClick={() => setPendingAction({ user, kind: "suspend" })}>
                    <span className="flex items-center gap-1.5">
                      <Ban size={13} /> Suspend
                    </span>
                  </AdminButton>
                )}
                {user.isDeleted ? (
                  <AdminButton onClick={() => setPendingAction({ user, kind: "restore" })}>
                    <span className="flex items-center gap-1.5">
                      <RotateCcw size={13} /> Restore
                    </span>
                  </AdminButton>
                ) : (
                  <AdminButton danger onClick={() => setPendingAction({ user, kind: "delete" })}>
                    <span className="flex items-center gap-1.5">
                      <Trash2 size={13} /> Delete
                    </span>
                  </AdminButton>
                )}
              </div>
            </div>
            );
          })}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#EAECF0] px-4 py-4 sm:flex-row">
            <p className="text-[12px] font-bold text-[#667085]">
              Showing {users.length} of {total} user{total === 1 ? "" : "s"}
            </p>
            {users.length < total && (
              <button
                type="button"
                onClick={() => load({ pageNumber: page + 1, append: true })}
                disabled={loadingMore}
                className="h-10 rounded-2xl border border-[#D0D5DD] bg-white px-5 text-[12px] font-black text-[#344054] disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more users"}
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        loading={actionLoading}
        title={pendingAction ? ACTION_COPY[pendingAction.kind].title : ""}
        description={pendingAction ? ACTION_COPY[pendingAction.kind].description : ""}
        confirmLabel={pendingAction ? ACTION_COPY[pendingAction.kind].confirmLabel : "Confirm"}
        danger={pendingAction ? ACTION_COPY[pendingAction.kind].danger : false}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />

      <Drawer
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        title={detailUser?.user?.fullName || detailUser?.user?.username || "User"}
        subtitle={detailUser?.user?.username ? `@${detailUser.user.username}` : ""}
      >
        {detailLoading ? (
          <AdminLoading rows={3} />
        ) : detailError ? (
          <AdminError text={detailError} />
        ) : (
          <UserDetailBody detail={detailUser} />
        )}
      </Drawer>
    </div>
  );
}

function UserDetailBody({ detail }) {
  const { user, contentCount, recentContent } = detail || {};
  if (!user) return null;
  const cover = getCover(user);
  const statusInfo = getStatus(user);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[24px] border border-[#EAECF0] bg-white">
        <div className="h-24 bg-[#EEF2FF]">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="-mt-10 px-4 pb-4">
          <Avatar user={user} size="lg" />
          <div className="mt-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {getDisplayName(user) ? (
                <p className="truncate text-[18px] font-black text-[#12141C]">
                  {getDisplayName(user)}
                </p>
              ) : (
                <p className="truncate text-[18px] font-black italic text-[#98A2B3]">
                  Signup incomplete
                </p>
              )}
              <span className={`rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-black ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="truncate text-[12px] font-bold text-[#667085]">
              @{user.username || "unknown"} · {user.headline || "No tagline added"}
            </p>
            {user.bio && <p className="mt-2 text-[13px] font-semibold leading-5 text-[#344054]">{user.bio}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InfoRow icon={Phone} label="Mobile" value={user.mobile || "Not added"} />
        <InfoRow icon={Mail} label="Email" value={user.email || "Not added"} />
        <InfoRow icon={MapPin} label="Location" value={getLocation(user)} />
        <InfoRow icon={CalendarDays} label="Date of birth" value={formatDate(user.dob)} />
        <InfoRow label="Interest" value={user.primaryInterest || "Not added"} />
        <InfoRow label="Role" value={user.role || "Not added"} />
        <InfoRow label="Field" value={user.field || "Not added"} />
        <InfoRow label="Gender" value={user.gender || "Not added"} />
        <InfoRow label="Profile complete" value={`${user.profileCompletionPercent || 0}%`} />
        <InfoRow label="Joined" value={formatDateTime(user.createdAt)} />
        <InfoRow label="Last active" value={formatDateTime(user.lastActiveAt)} />
        <InfoRow label="Username changed" value={formatDateTime(user.usernameLastChangedAt, "Never")} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Posts" value={contentCount?.posts} />
        <StatBox label="Learning" value={contentCount?.learnings} />
        <StatBox label="Journeys" value={contentCount?.journeys} />
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">
          Account flags
        </h3>
        <div className="flex flex-wrap gap-2">
          <Flag active={user.onboardingCompleted} label="Onboarded" />
          <Flag active={user.isProfileCompleted} label="Profile completed" />
          <Flag active={user.preferences?.openToWork} label="Open to work" />
          <Flag active={user.preferences?.openToFreelance} label="Freelance" />
          <Flag active={user.preferences?.openToCollab} label="Collab" />
          <Flag active={user.preferences?.openToHiring} label="Hiring" />
          <Flag active={user.verification?.mobile} label="Mobile verified" />
          <Flag active={user.verification?.email} label="Email verified" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">
          Network and score
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBox label="Followers" value={user.stats?.followersCount} />
          <StatBox label="Following" value={user.stats?.followingCount} />
          <StatBox label="Circle" value={user.stats?.circleCount || user.stats?.connectionsCount} />
          <StatBox label="Score" value={user.builderScore?.total} />
        </div>
      </div>

      {(recentContent?.posts?.length > 0 || recentContent?.journeys?.length > 0) && (
        <div>
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">
            Recent content
          </h3>
          <div className="space-y-2">
            {[...(recentContent?.posts || []), ...(recentContent?.journeys || [])]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-2xl border border-[#EAECF0] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-black uppercase text-[#667085]">
                      {item.type}
                    </span>
                    {item.reportCount > 0 && (
                      <span className="text-[10px] font-black text-[#D92D20]">
                        {item.reportCount} report{item.reportCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold text-[#344054]">
                    {item.preview || "Untitled"}
                  </p>
                  <p className="mt-1 text-[10.5px] font-bold text-[#98A2B3]">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.isDeleted ? " · removed" : ""}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-2 rounded-2xl border border-[#EAECF0] p-3">
      {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-[#4338CA]" />}
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#98A2B3]">{label}</p>
        <p className="mt-0.5 break-words text-[12.5px] font-black text-[#12141C]">{value}</p>
      </div>
    </div>
  );
}

function Flag({ active, label }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
        active ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#F2F4F7] text-[#667085]"
      }`}
    >
      {label}
    </span>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F2F4F7] p-3 text-center">
      <p className="text-[18px] font-black text-[#12141C]">{value ?? 0}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#667085]">{label}</p>
    </div>
  );
}

function AdminToolbar({ q, setQ, onSearch, status, setStatus }) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-[#EAECF0] bg-white p-3 sm:flex-row">
      <div className="relative flex-1">
        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search by name, username, mobile, email"
          className="h-11 w-full rounded-2xl border border-[#D0D5DD] pl-10 pr-4 text-[13px] font-bold outline-none focus:border-[#4338CA]"
        />
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-11 rounded-2xl border border-[#D0D5DD] px-4 text-[13px] font-bold outline-none"
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="deleted">Deleted</option>
      </select>
      <AdminButton onClick={onSearch}>Search</AdminButton>
    </div>
  );
}
