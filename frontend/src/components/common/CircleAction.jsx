import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, Loader2, Plus, X } from "lucide-react";

import { sendCircleRequest } from "../../api/circleRequestApi";
import { removeCircleUserById } from "../../api/userApi";

// Single reusable "relationship action" for post/journey/learning cards
// across the whole app (feed, discover, reposts, profile). Replaces the old
// per-component "Follow" buttons (PostCard, RepostCard, JourneyCard each
// had their own copy calling followUserById directly). IMCircle's real
// relationship primitive is Circle (mutual request/accept — see
// backend/src/controllers/circleRequest.controller.js), not a one-way
// follow, so this always sends a Circle request rather than a plain follow.
// Accepting a Circle request already makes both users follow each other
// server-side (see acceptCircleRequest), so nothing extra is needed here.

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getStoredUserId() {
  const keys = ["user", "bharat_user", "authUser", "currentUser"];

  for (const key of keys) {
    const parsed = safeJsonParse(localStorage.getItem(key));
    const user = parsed?.user || parsed?.data?.user || parsed?.data || parsed;
    const id = user?._id || user?.id || user?.userId;
    if (id) return String(id);
  }

  return "";
}

function normalizeStatus(value) {
  if (!value) return "none";
  const v = String(value).toLowerCase();
  if (["circle", "accepted", "connected", "member", "in_circle"].includes(v)) return "circle";
  if (["pending", "requested", "sent"].includes(v)) return "pending";
  return "none";
}

const SIZES = {
  sm: { padding: "min-h-8 px-3 py-1.5", text: "text-[10px]", icon: 12 },
  xs: { padding: "min-h-7 px-2.5 py-1", text: "text-[9px]", icon: 10 },
};

const CIRCLE_STATUS_EVENT = "imcircle:circle-status";

function broadcastCircleStatus(userId, status) {
  window.dispatchEvent(
    new CustomEvent(CIRCLE_STATUS_EVENT, { detail: { userId: String(userId), status } })
  );
}

/**
 * @param {string} userId - the OTHER user's id (never the viewer's own id)
 * @param {boolean} isCircleMember - true if viewer + this user are already in each other's Circle
 * @param {boolean} isRequested - true if viewer already has a pending sent request to this user
 * @param {boolean} isSelf - true when this card belongs to the logged-in viewer (button never renders)
 * @param {string} status - optional raw status string ("circle"|"pending"|"none") that takes priority over the two booleans above
 * @param {"sm"|"xs"} size
 */
function CircleAction({
  userId,
  isCircleMember = false,
  isRequested = false,
  isSelf = false,
  status,
  size = "sm",
  className = "",
  onStatusChange,
}) {
  const targetId = userId ? String(userId) : "";
  const viewerId = getStoredUserId();
  const self = isSelf || Boolean(targetId && viewerId && targetId === viewerId);

  const derivedInitial =
    normalizeStatus(status) !== "none"
      ? normalizeStatus(status)
      : isCircleMember
      ? "circle"
      : isRequested
      ? "pending"
      : "none";

  const [circleStatus, setCircleStatus] = useState(derivedInitial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setCircleStatus(derivedInitial);
    setFailed(false);
    // Re-derive whenever the underlying data for this card changes (e.g.
    // feed refresh, or navigating between different posts reusing this
    // component instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, isCircleMember, isRequested, status]);

  useEffect(() => {
    const syncStatus = (event) => {
      if (String(event.detail?.userId || "") !== targetId) return;
      setCircleStatus(normalizeStatus(event.detail?.status));
      setFailed(false);
    };

    window.addEventListener(CIRCLE_STATUS_EVENT, syncStatus);
    return () => window.removeEventListener(CIRCLE_STATUS_EVENT, syncStatus);
  }, [targetId]);

  if (!targetId || self) return null;

  const sizeCls = SIZES[size] || SIZES.sm;

  const handleSend = async (event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();

    if (loading || circleStatus !== "none") return;

    setLoading(true);
    setFailed(false);

    try {
      const res = await sendCircleRequest(targetId);
      const respStatus = normalizeStatus(res?.status);
      const nextStatus = respStatus !== "none" ? respStatus : "pending";
      setCircleStatus(nextStatus);
      broadcastCircleStatus(targetId, nextStatus);
      onStatusChange?.(nextStatus, targetId);
    } catch (error) {
      // Never optimistically leave the button in "Requested" if the API
      // failed — revert to the un-sent state so the user can retry.
      const message = (error?.response?.data?.message || error?.message || "").toLowerCase();

      if (message.includes("already") && message.includes("circle")) {
        setCircleStatus("circle");
        broadcastCircleStatus(targetId, "circle");
      } else if (message.includes("already sent") || message.includes("pending")) {
        setCircleStatus("pending");
        broadcastCircleStatus(targetId, "pending");
      } else {
        setCircleStatus("none");
        setFailed(true);
        window.setTimeout(() => setFailed(false), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (removing) return;

    setRemoving(true);

    try {
      await removeCircleUserById(targetId);
      setCircleStatus("none");
      broadcastCircleStatus(targetId, "none");
      setShowRemoveConfirm(false);
      onStatusChange?.("none", targetId);
    } catch (error) {
      // Leave them shown as connected — the removal genuinely failed
      // server-side, so flipping the UI to "+ Circle" here would be a lie.
      setShowRemoveConfirm(false);
    } finally {
      setRemoving(false);
    }
  };

  if (circleStatus === "circle") {
    return (
      <>
        <button
          type="button"
          onClick={(event) => {
            event?.stopPropagation?.();
            event?.preventDefault?.();
            setShowRemoveConfirm(true);
          }}
          className={`flex items-center gap-1 rounded-full font-black active:scale-95 ${sizeCls.padding} ${sizeCls.text} ${className}`}
          style={{ background: "var(--imc-surface-2)", border: "1px solid var(--imc-border)", color: "var(--imc-text)" }}
        >
          <Check size={sizeCls.icon} />
          In Circle
        </button>

        {showRemoveConfirm && createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-6"
            onClick={(event) => {
              event.stopPropagation();
              if (!removing) setShowRemoveConfirm(false);
            }}
          >
            <div
              className="w-full max-w-[340px] rounded-[24px] p-5 shadow-2xl"
              style={{ background: "var(--imc-surface)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full" style={{ background: "rgba(217,45,32,0.1)", color: "#D92D20" }}>
                <X size={20} />
              </div>

              <h3 className="mt-3 text-center text-[15px] font-black" style={{ color: "var(--imc-text)" }}>
                Remove from Circle?
              </h3>
              <p className="mt-1 text-center text-[12.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
                You'll need to send a new Circle request to reconnect — they'll have to accept it again.
              </p>

              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!removing) setShowRemoveConfirm(false);
                  }}
                  disabled={removing}
                  className="h-11 flex-1 rounded-2xl text-[13px] font-black active:scale-[0.99] disabled:opacity-60"
                  style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemove();
                  }}
                  disabled={removing}
                  className="h-11 flex-1 rounded-2xl text-[13px] font-black text-white active:scale-[0.99] disabled:opacity-70"
                  style={{ background: "#D92D20" }}
                >
                  {removing ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  const isPending = circleStatus === "pending";

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={loading || isPending}
      className={`flex items-center gap-1 rounded-full font-bold transition active:scale-95 disabled:opacity-80 ${sizeCls.padding} ${sizeCls.text} ${className}`}
      style={{
        background: failed ? "rgba(217,45,32,0.08)" : "var(--imc-action-soft)",
        border: failed
          ? "1px solid rgba(217,45,32,0.22)"
          : "1px solid var(--imc-action-border)",
        color: failed ? "var(--imc-danger)" : "var(--imc-indigo-text)",
        boxShadow: "none",
      }}
    >
      {loading ? (
        <Loader2 size={sizeCls.icon} className="animate-spin" />
      ) : isPending ? (
        <Clock size={sizeCls.icon} />
      ) : (
        <Plus size={sizeCls.icon} strokeWidth={2.3} />
      )}
      {loading ? "..." : failed ? "Retry" : isPending ? "Requested" : "Circle"}
    </button>
  );
}

export default CircleAction;
