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
    <div className="py-8 flex justify-center">
      <div className="relative">
        <Avatar
          src={imageUrl}
          name={name}
          size={112}
          className="shadow-xl"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: "5px solid var(--imc-surface)" }}
        />

        <button
          type="button"
          onClick={openGallery}
          disabled={uploading}
          className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#EC9A1E] text-[var(--imc-text)] shadow-lg ring-2 transition active:scale-95 disabled:opacity-60"
          style={{ "--tw-ring-color": "var(--imc-surface)" }}
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#12141C] border-t-transparent" />
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