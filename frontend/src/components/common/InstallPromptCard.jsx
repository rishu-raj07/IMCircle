import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { IS_WEB } from "../../config/platform";

const DISMISSED_KEY = "imcircle_install_prompt_dismissed";

function isAlreadyInstalled() {
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  // iOS Safari's own "already added to home screen" flag — iOS never fires
  // beforeinstallprompt at all, but this keeps the check consistent if this
  // component is ever reused somewhere iOS-relevant.
  if (window.navigator?.standalone) return true;
  return false;
}

// Chrome/Edge/Samsung Internet on Android fire `beforeinstallprompt` when a
// page qualifies as an installable PWA (valid manifest + registered service
// worker + HTTPS, both already wired up via vite-plugin-pwa) and it hasn't
// been installed yet. The browser only exposes that prompt through this
// captured event — there's no other way to trigger the native "Install
// app" UI. This card is web-only: inside the actual Capacitor Android/iOS
// shell (IS_WEB false) the app is already installed, so there's nothing to
// prompt.
function InstallPromptCard() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!IS_WEB) return undefined;

    try {
      if (localStorage.getItem(DISMISSED_KEY) === "true") return undefined;
    } catch {
      // best-effort — non-critical
    }

    if (isAlreadyInstalled()) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      // Stop the browser's own mini-infobar so we control when/how the
      // install prompt is offered, then hang onto the event — it can only
      // be triggered once, from a later user gesture (`prompt()` below).
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(DISMISSED_KEY, "true");
      } catch {
        // best-effort — non-critical
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // best-effort — non-critical
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);

    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // best-effort — non-critical
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-[18px] px-4 py-3"
      style={{
        background: "rgba(67,56,202,0.08)",
        border: "1px solid rgba(67,56,202,0.18)",
      }}
    >
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--imc-surface)" }}
      >
        <Download size={18} style={{ color: "#4338CA" }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-black" style={{ color: "var(--imc-text)" }}>
          Install IMCircle
        </p>
        <p className="mt-0.5 text-[11px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
          Add to your home screen for the full app experience.
        </p>
      </div>

      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="shrink-0 rounded-full px-3 py-2 text-[11px] font-black text-white disabled:opacity-60"
        style={{ background: "#4338CA" }}
      >
        {installing ? "Installing..." : "Install now"}
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 text-[var(--imc-text-muted)]"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default InstallPromptCard;
