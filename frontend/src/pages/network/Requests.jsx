import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Search,
  UserPlus,
  X,
  MapPin,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "../../components/navigation/BottomNav";
import {
  getReceivedCircleRequests,
  acceptCircleRequest,
  rejectCircleRequest,
} from "../../api/circleRequestApi";

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function getImageUrl(user) {
  if (!user) return "";

  const url =
    user?.avatar?.secure_url ||
    user?.avatar?.url ||
    user?.avatar ||
    user?.profileImage?.secure_url ||
    user?.profileImage?.url ||
    user?.profileImage ||
    user?.picture ||
    "";

  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;

  return url;
}

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function getId(value) {
  if (!value) return "";
  return value?._id || value?.id || value;
}

function Requests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);

      const data = await getReceivedCircleRequests();
      setRequests(data?.requests || data?.data?.requests || []);
    } catch (error) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase();

    return requests.filter((request) => {
      const sender = request?.sender || {};
      const name = getName(sender).toLowerCase();
      const headline = (sender?.headline || sender?.role || "").toLowerCase();
      const city = (sender?.location?.city || "").toLowerCase();

      return name.includes(q) || headline.includes(q) || city.includes(q);
    });
  }, [requests, search]);

  const removeLocal = (requestId) => {
    setRequests((prev) =>
      prev.filter((request) => String(getId(request)) !== String(requestId))
    );
  };

  const handleAccept = async (requestId) => {
    if (!requestId || actionId) return;

    try {
      setActionId(requestId);
      await acceptCircleRequest(requestId);
      removeLocal(requestId);
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (requestId) => {
    if (!requestId || actionId) return;

    try {
      setActionId(requestId);
      await rejectCircleRequest(requestId);
      removeLocal(requestId);
    } catch (error) {
      // best-effort — non-critical
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">
              <h1 className="text-[19px] font-black text-[var(--imc-text)]">
                Circle Requests
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                Accept to allow direct messages
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm">
              <UserPlus size={21} />
            </div>
          </div>

          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface)] px-4 shadow-sm">
            <Search size={18} className="text-[var(--imc-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>
        </div>

        <main className="px-5 py-5">
          <div className="rounded-[30px] bg-gradient-to-br from-[#4338CA] to-[#2E2A8F] p-5 text-white shadow-xl shadow-purple-200">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Sparkles size={24} />
              </div>

              <div>
                <h2 className="text-[21px] font-black">
                  {filteredRequests.length} New Requests
                </h2>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-white/75">
                  Accepting adds both users to circle, followers and following.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-20 text-center text-[13px] font-black text-[var(--imc-indigo-text)]">
              Loading requests...
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="mt-5 space-y-4">
              {filteredRequests.map((request) => {
                const sender = request?.sender || {};
                const requestId = getId(request);
                const name = getName(sender);
                const avatar = getImageUrl(sender);
                const isLoading = actionId === requestId;

                return (
                  <div
                    key={requestId}
                    className="rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#12141C] text-[20px] font-black text-[#EC9A1E]">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-black text-[var(--imc-text)]">
                          {name}
                        </h3>

                        <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                          <Briefcase size={13} />
                          {sender?.headline || sender?.role || "IMCircle user"}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                          <MapPin size={13} />
                          {[sender?.location?.city, sender?.location?.state]
                            .filter(Boolean)
                            .join(", ") || "India"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[var(--imc-surface-2)] p-3">
                      <p className="text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
                        Wants to add you to circle. Accept only if you want to
                        allow direct messaging.
                      </p>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        disabled={isLoading}
                        onClick={() => handleAccept(requestId)}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#4338CA] text-[13px] font-black text-white disabled:opacity-60"
                      >
                        <Check size={16} />
                        {isLoading ? "..." : "Accept"}
                      </button>

                      <button
                        disabled={isLoading}
                        onClick={() => handleReject(requestId)}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--imc-surface-2)] text-[13px] font-black text-[var(--imc-text-muted)] disabled:opacity-60"
                      >
                        <X size={16} />
                        Ignore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-24 text-center">
              <p className="text-[16px] font-black text-[var(--imc-text)]">
                No circle requests
              </p>
              <p className="mt-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                New circle requests will appear here.
              </p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

export default Requests;