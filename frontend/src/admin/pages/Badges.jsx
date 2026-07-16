import { useEffect, useState } from "react";
import { Award, Search, X } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";

export default function AdminBadges() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.get("/admin/badges/recent");
        setRecent(res.data.awards || []);
      } catch {
        setRecent([]);
      } finally {
        setRecentLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminApi.get("/admin/badges/search-users", { params: { q: query.trim() } });
        setResults(res.data.users || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const openUser = async (user) => {
    setSelectedUser(user);
    setProfile(null);
    setProfileLoading(true);
    setError("");
    try {
      const res = await adminApi.get(`/admin/badges/user/${user._id}`);
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load badges for this user");
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleBadge = async (badge) => {
    if (!selectedUser) return;
    setBusyKey(badge.key);
    try {
      if (badge.earned) {
        await adminApi.post("/admin/badges/revoke", { userId: selectedUser._id, badgeKey: badge.key });
      } else {
        await adminApi.post("/admin/badges/award", { userId: selectedUser._id, badgeKey: badge.key });
      }
      const res = await adminApi.get(`/admin/badges/user/${selectedUser._id}`);
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "That action failed");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-[#EAECF0] bg-[#F7F8FC] px-3.5 py-2.5">
            <Search size={16} className="text-[#98A2B3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, username, or mobile"
              className="w-full bg-transparent text-[13px] font-semibold text-[#12141C] outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X size={15} className="text-[#98A2B3]" />
              </button>
            )}
          </div>

          {searching && <p className="mt-3 text-[11px] font-bold text-[#98A2B3]">Searching...</p>}

          {!searching && results.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {results.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => openUser(user)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                    selectedUser?._id === user._id ? "bg-[#EEF0FF]" : "hover:bg-[#F7F8FC]"
                  }`}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F2F4F7] text-[12px] font-black text-[#667085]">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName} className="h-full w-full object-cover" />
                    ) : (
                      (user.fullName || user.username || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-black text-[#12141C]">{user.fullName || user.username}</p>
                    <p className="truncate text-[11px] font-bold text-[#667085]">@{user.username || "unknown"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
          <p className="mb-3 text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">Recently awarded</p>
          {recentLoading ? (
            <AdminLoading rows={2} />
          ) : recent.length === 0 ? (
            <p className="text-[11.5px] font-bold text-[#98A2B3]">Nothing yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 12).map((award) => (
                <div key={award._id} className="flex items-center justify-between text-[11.5px]">
                  <span className="truncate font-bold text-[#344054]">
                    {award.user?.fullName || award.user?.username || "A user"}
                  </span>
                  <span className="ml-2 shrink-0 font-black text-[#4338CA]">
                    {award.badgeKey?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
        {!selectedUser ? (
          <AdminEmpty title="Pick a member" text="Search for a member on the left to view and manage their badges." />
        ) : profileLoading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError text={error} />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[#EAECF0] pb-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F2F4F7] text-[13px] font-black text-[#667085]">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.fullName} className="h-full w-full object-cover" />
                ) : (
                  (selectedUser.fullName || selectedUser.username || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-[15px] font-black text-[#12141C]">{selectedUser.fullName || selectedUser.username}</p>
                <p className="text-[11.5px] font-bold text-[#667085]">
                  {profile?.earnedCount || 0} of {profile?.badges?.length || 0} badges earned
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {(profile?.badges || []).map((badge) => (
                <div
                  key={badge.key}
                  className={`flex items-center justify-between rounded-2xl border p-3 ${
                    badge.earned ? "border-[#DCFCE7] bg-[#F6FEFA]" : "border-[#EAECF0] bg-[#F7F8FC]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-black text-[#12141C]">{badge.label}</p>
                    <p className="mt-0.5 truncate text-[10.5px] font-bold text-[#98A2B3]">
                      {badge.kind === "manual" ? "Manual" : badge.kind === "spotlight" ? "Spotlight" : "Auto"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === badge.key}
                    onClick={() => toggleBadge(badge)}
                    className={`ml-2 flex shrink-0 items-center gap-1 rounded-2xl px-3 py-1.5 text-[10.5px] font-black active:scale-95 disabled:opacity-50 ${
                      badge.earned ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[#12141C] text-white"
                    }`}
                  >
                    <Award size={12} />
                    {badge.earned ? "Revoke" : "Award"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
