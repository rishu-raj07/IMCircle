import { useEffect, useState } from "react";
import { Camera, Contact, Loader2, Mic, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import { matchContacts } from "../../api/userApi";
import { setStoredPermissionState } from "../../utils/permissions";

const PROMPT_KEY = "imcircle_permission_prompt_done";
const STATUS_KEY = "imcircle_permission_status";
const CONTACT_MATCHES_KEY = "imcircle_contact_matches_cache";

function normalizeContactPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
}

function getContactName(contact) {
  if (Array.isArray(contact?.name)) return contact.name.filter(Boolean).join(" ");
  return contact?.name || contact?.displayName || "Contact";
}

function getContactPhones(contact) {
  const phones = Array.isArray(contact?.tel) ? contact.tel : [];
  return phones.map(normalizeContactPhone).filter(Boolean);
}

function canShowPrompt(pathname) {
  return !(
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify"
  );
}

export default function PermissionBootstrap() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canShowPrompt(location.pathname)) return;
    if (localStorage.getItem(PROMPT_KEY) === "true") return;

    const id = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  const closeWithStatus = (status) => {
    localStorage.setItem(PROMPT_KEY, "true");
    localStorage.setItem(STATUS_KEY, status);
    window.dispatchEvent(new Event("imcircle-permissions-updated"));
    setOpen(false);
  };

  const handleAllow = async () => {
    setLoading(true);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          setStoredPermissionState("microphone", "granted");
          setStoredPermissionState("camera", "granted");
        } catch {
          // Contact sync can still continue if media permission is denied.
          // Record the denial so Chat/CreatePost's voice recorder doesn't
          // immediately re-prompt the moment the user taps record.
          setStoredPermissionState("microphone", "denied");
          setStoredPermissionState("camera", "denied");
        }
      }

      if (!navigator.contacts?.select) {
        closeWithStatus("denied");
        return;
      }

      const contacts = await navigator.contacts.select(["name", "tel"], {
        multiple: true,
      });
      const cleanContacts = (contacts || [])
        .map((contact) => ({
          name: getContactName(contact),
          phones: getContactPhones(contact),
        }))
        .filter((contact) => contact.phones.length > 0);

      if (cleanContacts.length > 0) {
        const res = await matchContacts(cleanContacts);
        localStorage.setItem(CONTACT_MATCHES_KEY, JSON.stringify(res?.matches || []));
      }

      closeWithStatus("allowed");
    } catch {
      closeWithStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 px-4 sm:items-center">
      <div className="w-full max-w-[390px] rounded-t-[28px] bg-[var(--imc-surface)] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-black text-[var(--imc-text)]">
              Connect IMCircle
            </h2>
            <p className="mt-1 text-[12px] font-bold leading-5 text-[var(--imc-text-muted)]">
              Allow contacts, camera/media and microphone so IMCircle can find people you know and keep creation tools ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => closeWithStatus("denied")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--imc-surface-2)] text-[var(--imc-text)]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PermissionTile icon={Contact} label="Contacts" />
          <PermissionTile icon={Camera} label="Media" />
          <PermissionTile icon={Mic} label="Mic" />
        </div>

        <button
          type="button"
          onClick={handleAllow}
          disabled={loading}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4338CA] text-[13px] font-black text-white disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Requesting..." : "Allow permissions"}
        </button>
      </div>
    </div>
  );
}

function PermissionTile({ icon: Icon, label }) {
  return (
    <div className="grid place-items-center rounded-2xl bg-[var(--imc-surface-2)] px-2 py-3 text-center">
      <Icon size={18} className="text-[#4338CA]" />
      <span className="mt-1 text-[10px] font-black text-[var(--imc-text-muted)]">{label}</span>
    </div>
  );
}
