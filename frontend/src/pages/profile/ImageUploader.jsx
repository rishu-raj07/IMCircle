import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { uploadImage } from "../../api/uploadApi";
import Avatar from "../../components/common/Avatar";

export default function ImageUploader({
  imageUrl,
  name,
  onChange,
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);

  const openGallery = () => {
    inputRef.current?.click();
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const uploaded = await uploadImage(file, { purpose: "profile" });

      onChange(uploaded.url);
    } catch (err) {
      console.error(err);
      alert("Unable to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative -mx-1 mt-5 flex justify-center overflow-hidden rounded-[28px] border border-[rgba(67,56,202,0.10)] bg-[linear-gradient(135deg,rgba(37,99,235,0.07),rgba(124,58,237,0.11))] py-7">
      <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full border-[22px] border-[rgba(67,56,202,0.05)]" />
      <div className="relative">
        <Avatar
          src={imageUrl}
          name={name}
          size={112}
          className="shadow-[0_14px_35px_rgba(67,56,202,0.16)]"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: "5px solid var(--imc-surface)" }}
        />

        <button
          type="button"
          onClick={openGallery}
          disabled={uploading}
          aria-label="Change profile photo"
          className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-indigo)] text-white shadow-[0_7px_18px_rgba(67,56,202,0.28)] ring-2 transition active:scale-95 disabled:opacity-60"
          style={{ "--tw-ring-color": "var(--imc-surface)" }}
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Pencil size={18} />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleImage}
        />
      </div>
    </div>
  );
}
