import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useVersionCheck } from "../../hooks/useVersionCheck";
import { IS_NATIVE } from "../../config/platform";

// Global "New version available" banner (Issue 1, requirement #10). Native
// builds skip this entirely — there's no way to hot-swap a bundled APK, and
// Google Play already runs its own "update available" prompt for that case
// (duplicating it here would just confuse users with a button that can't
// actually do anything). This is purely a web/PWA concern, where a stale
// cached bundle is the actual failure mode being solved for.
function VersionUpdateBanner() {
  const { updateAvailable, applyUpdate } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (IS_NATIVE || !updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex items-center gap-3 px-4 py-3 shadow-lg"
      style={{ background: "var(--imc-indigo)", paddingTop: "max(12px, env(safe-area-inset-top))" }}
      role="status"
    >
      <RefreshCw size={16} className="shrink-0 text-white" />
      <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-white">
        A new version of IMCircle is available.
      </p>
      <button
        type="button"
        onClick={applyUpdate}
        className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-black text-[var(--imc-indigo)] active:scale-95"
      >
        Update
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/80 active:scale-90"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default VersionUpdateBanner;
