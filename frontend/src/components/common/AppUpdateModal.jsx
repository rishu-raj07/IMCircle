import { RefreshCw } from "lucide-react";
import { useNativeUpdateCheck } from "../../hooks/useNativeUpdateCheck";

// Native-only (Android/iOS) update prompt — see useNativeUpdateCheck.js.
// Mounted once near the app root (App.jsx), same pattern as
// PushNotificationListener/VersionUpdateBanner. Renders nothing on web or
// when no update is due.
export default function AppUpdateModal() {
  const { visible, updateRequired, info, dismiss, openStore } = useNativeUpdateCheck();

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 px-5"
      role="dialog"
      aria-modal="true"
      // Required updates: no dismissing by tapping outside. Optional: tapping
      // outside behaves the same as "Later".
      onClick={updateRequired ? undefined : dismiss}
    >
      <div
        className="w-full max-w-[360px] rounded-[24px] bg-[var(--imc-surface)] p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[rgba(67,56,202,0.1)]">
          <RefreshCw size={26} className="text-[var(--imc-indigo-text)]" />
        </div>

        <h2 className="mt-4 text-[17px] font-extrabold text-[var(--imc-text)]">
          {info?.updateTitle || "A new version of IMCircle is available"}
        </h2>
        <p className="mt-2 text-[13px] font-medium leading-5 text-[var(--imc-text-muted)]">
          {updateRequired
            ? "This version is no longer supported. Please update to continue using IMCircle."
            : info?.updateMessage || "Update now to get the latest improvements and fixes."}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={openStore}
            className="flex h-[48px] w-full items-center justify-center rounded-[14px] bg-[var(--imc-indigo)] text-[13.5px] font-black text-white active:scale-[0.98]"
          >
            Update now
          </button>

          {!updateRequired && (
            <button
              type="button"
              onClick={dismiss}
              className="flex h-[44px] w-full items-center justify-center rounded-[14px] text-[13px] font-bold text-[var(--imc-text-muted)] active:scale-[0.98]"
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
