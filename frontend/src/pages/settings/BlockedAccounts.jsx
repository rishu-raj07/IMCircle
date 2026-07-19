import { useEffect, useState } from "react";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getBlockedUsers, unblockUserById } from "../../api/userApi";
import BottomNav from "../../components/navigation/BottomNav";
import { getGenderAvatarIcon } from "../../utils/avatar";

function getName(user) {
  return user?.fullName || user?.name || user?.username || "User";
}

function BlockedAccounts() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getBlockedUsers();
        if (!cancelled) setUsers(res?.blockedUsers || []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnblock = async (userId) => {
    if (unblockingId) return;
    setUnblockingId(userId);

    try {
      await unblockUserById(userId);
      setUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch {
      // best-effort — leave the item in the list so the user can retry
    } finally {
      setUnblockingId("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Blocked Accounts
            </h1>
          </div>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              Loading…
            </p>
          ) : users.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[var(--imc-border)] bg-[rgba(67,56,202,0.06)] px-5 py-8 text-center">
              <ShieldOff size={22} className="mx-auto text-[var(--imc-text-faint)]" />
              <p className="mt-3 text-[13px] font-black text-[var(--imc-text)]">
                No blocked accounts
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-muted)]">
                Accounts you block will show up here.
              </p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 border-b border-[var(--imc-border)] py-3.5"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[rgba(67,56,202,0.12)] text-[15px] font-black text-[var(--imc-indigo-text)]">
                  <img
                    src={user.avatar || getGenderAvatarIcon(user)}
                    alt={getName(user)}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-[var(--imc-text)]">
                    {getName(user)}
                  </p>
                  {user.username && (
                    <p className="truncate text-[11px] font-semibold text-[var(--imc-text-faint)]">
                      @{user.username}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleUnblock(user._id)}
                  disabled={unblockingId === user._id}
                  className="shrink-0 rounded-full border border-[var(--imc-border)] px-4 py-2 text-[11px] font-black text-[var(--imc-text)] active:scale-95 disabled:opacity-50"
                >
                  {unblockingId === user._id ? "…" : "Unblock"}
                </button>
              </div>
            ))
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default BlockedAccounts;
