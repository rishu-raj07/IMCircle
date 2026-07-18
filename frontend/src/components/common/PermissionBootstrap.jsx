import { useEffect } from "react";
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

function canRequestPermissions(pathname) {
  return !(
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify"
  );
}

// PREVIOUSLY: this fired automatically ~450ms after landing on any
// non-auth screen (including Home, on every fresh login/app-open) and
// silently requested camera+mic (getUserMedia) and contacts (Contact
// Picker API) permission with no user action behind it — before it, this
// used to show its own "Connect IMCircle" bottom-sheet first. Both are
// exactly the "unsolicited permission prompt on app/home load" pattern
// the product spec calls out to remove: permissions should only be
// requested at the moment they're actually needed (camera/gallery when
// uploading media — already handled natively by the upload flows in
// CreatePost/Chat/etc, which is why removing this doesn't lose that
// capability; contacts when the person explicitly chooses to sync them).
//
// Disabled the automatic trigger rather than deleting the component/logic
// outright, so `requestPermissions()` below stays available to be wired to
// an explicit user action (e.g. a future "Find friends from contacts"
// button) without redoing this. Nothing currently calls it, so this
// component is now a deliberate no-op.
export default function PermissionBootstrap() {
  return null;
}

// eslint-disable-next-line no-unused-vars
function useDisabledAutoPermissionPrompt() {
  const location = useLocation();

  useEffect(() => {
    if (!canRequestPermissions(location.pathname)) return;
    if (localStorage.getItem(PROMPT_KEY) === "true") return;

    let cancelled = false;

    const id = window.setTimeout(async () => {
      if (cancelled) return;
      await requestPermissions();
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const finish = (status) => {
    localStorage.setItem(PROMPT_KEY, "true");
    localStorage.setItem(STATUS_KEY, status);
    window.dispatchEvent(new Event("imcircle-permissions-updated"));
  };

  const requestPermissions = async () => {
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
        finish("denied");
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

      finish("allowed");
    } catch {
      finish("denied");
    }
  };

  return null;
}
