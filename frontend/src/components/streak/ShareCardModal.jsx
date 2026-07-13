import { useEffect, useState } from "react";
import { ContactRound, Download, Loader2, Share2 } from "lucide-react";
import {
  createProfileVCard,
  downloadBlob,
  generateShareCard,
  shareBlob,
} from "../../utils/shareCard";
import { getShareAvatarBlob } from "../../api/mediaApi";

const INK = "#12141C";
const INDIGO = "#4338CA";
const MUTED = "#6B7280";
const LINE = "rgba(18,20,28,0.08)";

function ShareCardModal({ open, onClose, kind = "streak", data = {}, filename = "imcircle-card.png", shareText }) {
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("generating");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    if (kind === "streak" && Number(data?.streak || 0) < 1) return;

    let cancelled = false;
    setStatus("generating");
    setActionMessage("");

    let temporaryAvatarUrl = "";

    const generate = async () => {
      let cardData = data;
      if (data?.avatarUrl && !String(data.avatarUrl).startsWith("data:")) {
        try {
          const avatarBlob = await getShareAvatarBlob(data.avatarUrl);
          temporaryAvatarUrl = URL.createObjectURL(avatarBlob);
          cardData = { ...data, avatarUrl: temporaryAvatarUrl };
        } catch {
          // The card renderer will use its standard user icon fallback.
        }
      }

      const result = await generateShareCard(kind, cardData);
      if (temporaryAvatarUrl) URL.revokeObjectURL(temporaryAvatarUrl);
      if (cancelled) return;
      if (!result) {
        setStatus("error");
        return;
      }

      setBlob(result);
      setPreviewUrl(URL.createObjectURL(result));
      setStatus("ready");
    };

    generate();

    return () => {
      cancelled = true;
      if (temporaryAvatarUrl) URL.revokeObjectURL(temporaryAvatarUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, data?.profileUrl, data?.avatarUrl, data?.streak, data?.longestStreak, data?.name, data?.username, data?.headline, data?.interest, data?.location, data?.level]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open || (kind === "streak" && Number(data?.streak || 0) < 1)) return null;

  const handleShare = async () => {
    setActionMessage("");
    const result = await shareBlob(blob, filename, shareText, data?.profileUrl);
    if (result === "shared") setActionMessage("Shared!");
    else if (result === "copied") setActionMessage("Profile link copied");
    else if (result === "failed") setActionMessage("Couldn't open sharing. Download the card instead.");
  };

  const handleDownload = async () => {
    setActionMessage("");
    const result = await downloadBlob(blob, filename);
    setActionMessage(
      result === "downloaded" ? "Profile card saved to your device" : "Couldn't save the card"
    );
  };

  const handleVCardDownload = async () => {
    setActionMessage("");
    const vcard = createProfileVCard(data);
    const safeUsername = String(data?.username || data?.name || "imcircle-profile")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "");
    const result = await downloadBlob(vcard, `${safeUsername || "imcircle-profile"}.vcf`);
    setActionMessage(
      result === "downloaded" ? "Contact vCard saved to your device" : "Couldn't save the vCard"
    );
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[30px] bg-[var(--imc-bg)] p-5 pb-[max(28px,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--imc-border)]" />
        <h3 className="text-center text-[18px] font-black" style={{ color: "var(--imc-text)" }}>
          {kind === "profile" ? "Share your profile" : "Share your streak"}
        </h3>
        <p className="mb-4 mt-1 text-center text-[10.5px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>
          {kind === "profile" ? "A scannable card made for meaningful connections" : "Your consistency, identity and progress in one card"}
        </p>

        <div
          className="mx-auto flex aspect-[4/5] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-[26px] border bg-[var(--imc-surface)]"
          style={{ borderColor: "var(--imc-border)", boxShadow: "0 22px 50px rgba(18,20,28,0.18)" }}
        >
          {status === "generating" && <Loader2 className="animate-spin text-white/70" size={28} />}
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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={status !== "ready"}
            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl text-[14px] font-black active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--imc-action-soft)", border: "1px solid var(--imc-action-border)", color: "var(--imc-indigo-text)", height: 52 }}
          >
            <Share2 size={18} />
            Share
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={status !== "ready"}
            className={`flex items-center justify-center gap-2 rounded-2xl bg-[var(--imc-surface)] px-3 text-[12px] font-black active:scale-95 disabled:opacity-50 ${kind !== "profile" ? "col-span-2" : ""}`}
            style={{ border: "1px solid var(--imc-border)", height: 52, color: "var(--imc-text)" }}
          >
            <Download size={18} />
            Download card
          </button>

          {kind === "profile" && (
            <button
              type="button"
              onClick={handleVCardDownload}
              disabled={status !== "ready"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--imc-surface)] px-3 text-[12px] font-black active:scale-95 disabled:opacity-50"
              style={{ border: `1px solid ${LINE}`, height: 52, color: INK }}
            >
              <ContactRound size={18} />
              Download vCard
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[10.5px] font-semibold" style={{ color: MUTED }}>
          {kind === "profile"
            ? "The QR opens your unique IMCircle profile"
            : "Perfect for WhatsApp Status, Instagram Stories or X"}
        </p>
      </div>
    </div>
  );
}

export default ShareCardModal;
