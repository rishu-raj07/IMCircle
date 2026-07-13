import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Modal from "./Modal";
import { deleteMyAccount } from "../../api/profileApi";
import { logoutApi } from "../../api/authApi";
import { logoutUser } from "../../store/authStore";

export default function DeleteAccountModal({ open, onClose }) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    if (deleting) return;
    onClose();
    window.setTimeout(() => {
      setConfirmText("");
      setError("");
    }, 200);
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE" || deleting) return;
    setDeleting(true);
    setError("");

    try {
      await deleteMyAccount();
      await logoutApi().catch(() => {});
      logoutUser();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't delete your account. Try again.");
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Delete account">
      <p className="text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
        This removes your profile from IMCircle and hides your posts, journeys, messages, and other content from everyone.
      </p>
      <p className="mt-4 text-[11px] font-black text-[var(--imc-text)]">Type DELETE to continue</p>
      <input
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        placeholder="DELETE"
        maxLength={10}
        className="mt-2 w-full rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-3.5 text-[13px] font-semibold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
      />
      {error && <p className="mt-2 text-[11px] font-semibold text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl border text-[12px] font-black active:scale-[0.99] disabled:opacity-40"
        style={{ background: "rgba(217,45,32,0.06)", borderColor: "rgba(217,45,32,0.18)", color: "#D92D20" }}
      >
        {deleting ? "Deleting…" : "Delete account"}
      </button>
      <p className="mt-3 text-center text-[10.5px] font-semibold leading-4 text-[var(--imc-text-faint)]">
        Need your account back later? Email{" "}
        <a href="mailto:rishu@imcircle.com" className="font-black text-[var(--imc-indigo-text)]">
          rishu@imcircle.com
        </a>{" "}
        to request data restoration.
      </p>
    </Modal>
  );
}
