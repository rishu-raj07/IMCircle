import { useEffect, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import { generateShareCard, shareOrDownloadBlob } from "../../utils/shareCard";

const INK = "#12141C";
const INDIGO = "#4338CA";
const MUTED = "#6B7280";
const LINE = "rgba(18,20,28,0.08)";

/**
 * Preview + share sheet for a generated brand card. Renders the card once
 * on open, then lets the user share it (native share sheet on mobile, which
 * is where this app lives) or download it as a fallback.
 */
function ShareCardModal({ open, onClose, kind = "streak", data = {}, filename = "imcircle-card.png", shareText }) {
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("generating");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus("generating");
    setActionMessage("");

    generateShareCard(kind, data).then((result) => {
      if (cancelled) return;

      if (!result) {
        setStatus("error");
        return;
      }

      setBlob(result);
      setPreviewUrl(URL.createObjectURL(result));
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleShare = async () => {
    const result = await shareOrDownloadBlob(blob, filename, shareText);

    if (result === "shared") {
      setActionMessage("Shared!");
      setTimeout(onClose, 700);
    } else if (result === "downloaded") {
      setActionMessage("Saved to your device");
    } else if (result === "failed") {
      setActionMessage("Couldn't share — try downloading instead");
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-surface-2)] p-5 pb-7 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-[19px] font-semibold" style={{ color: INK }}>
            Share your streak
          </h3>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--imc-surface)] active:scale-95"
            style={{ border: `1px solid ${LINE}` }}
          >
            <X size={18} style={{ color: INK }} />
          </button>
        </div>

        <div
          className="mx-auto flex aspect-[4/5] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[24px] bg-[#12141C]"
          style={{ boxShadow: "0 20px 40px rgba(18,20,28,0.25)" }}
        >
          {status === "generating" && (
            <Loader2 className="animate-spin text-white/70" size={28} />
          )}

          {status === "error" && (
            <p className="px-6 text-center text-[12px] font-bold text-white/70">
              Couldn't generate the card. Try again in a moment.
            </p>
          )}

          {status === "ready" && previewUrl && (
            <img src={previewUrl} alt="Share card preview" className="h-full w-full object-cover" />
          )}
        </div>

        {actionMessage && (
          <p className="mt-3 text-center text-[12px] font-bold" style={{ color: INDIGO }}>
            {actionMessage}
          </p>
        )}

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={status !== "ready"}
            className="flex h-13 items-center justify-center gap-2 rounded-2xl text-[14px] font-black text-white active:scale-[0.98] disabled:opacity-50"
            style={{ background: INDIGO, height: 52 }}
          >
            <Share2 size={18} />
            Share
          </button>

          <button
            type="button"
            onClick={async () => {
              const result = await shareOrDownloadBlob(blob, filename, shareText);
              if (result === "downloaded") setActionMessage("Saved to your device");
            }}
            disabled={status !== "ready"}
            className="grid h-13 w-13 place-items-center rounded-2xl bg-[var(--imc-surface)] active:scale-95 disabled:opacity-50"
            style={{ border: `1px solid ${LINE}`, height: 52, width: 52, color: INK }}
          >
            <Download size={19} />
          </button>
        </div>

        <p className="mt-3 text-center text-[10.5px] font-semibold" style={{ color: MUTED }}>
          Perfect for WhatsApp Status, Instagram Stories or X
        </p>
      </div>
    </div>
  );
}

export default ShareCardModal;
