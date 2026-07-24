import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ImagePlus, Loader2, Newspaper, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";

const NEWS_TYPES = [
  "announcement",
  "news",
  "opportunity",
  "event",
  "article",
  "exam",
  "scholarship",
  "internship",
  "funding",
];

const EMPTY_FORM = {
  title: "",
  summary: "",
  imageUrl: "",
  sourceName: "IMCircle",
  sourceUrl: "",
  type: "announcement",
  categories: "",
  industries: "",
  roles: "",
  publishedAt: "",
  isBreaking: false,
  notifyMatchedUsers: true,
};

function toDatetimeLocalValue(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Manual news entry — for pushing an IMCircle-authored announcement into
// the same News/For You feed real ingested content shows up in (see
// backend/src/controllers/adminNews.controller.js), rather than needing a
// real external RSS source for every announcement. Categories/industries
// match the same tag values the RSS pipeline's classifier produces
// (Startup, Education, Career, Government Schemes, Events, Finance, AI,
// Technology, etc. for categories; Tech/Business/Education/Healthcare/
// Fitness/Design/Creators/Hospitality for industries) — reusing those
// keeps this content flow through the exact same For You matching/
// notification logic ordinary ingested news does.
export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Local preview shown immediately on pick (a blob URL, swapped for the
  // real Cloudinary URL once the upload resolves) — separate from
  // form.imageUrl so a slow/failed upload never leaves a broken/blob URL
  // sitting in the value that actually gets submitted.
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/news", { params: { q: q || undefined, limit: 50 } });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load news items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(query), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, publishedAt: toDatetimeLocalValue(new Date()) });
    setImagePreview("");
    setImageError("");
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      summary: item.summary || "",
      imageUrl: item.imageUrl || "",
      sourceName: item.sourceName || "IMCircle",
      sourceUrl: item.sourceUrl || "",
      type: item.type || "announcement",
      categories: (item.categories || []).join(", "),
      industries: (item.industries || []).join(", "),
      roles: (item.roles || []).join(", "),
      publishedAt: toDatetimeLocalValue(item.publishedAt),
      isBreaking: Boolean(item.isBreaking),
      notifyMatchedUsers: false,
    });
    setImagePreview(item.imageUrl || "");
    setImageError("");
    setFormError("");
    setDrawerOpen(true);
  };

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be under 10MB.");
      return;
    }

    setImageError("");
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminApi.post("/admin/news/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateField("imageUrl", res.data?.file?.url || "");
    } catch (err) {
      setImageError(err.response?.data?.message || "Image upload failed. Try again.");
      setImagePreview(form.imageUrl || "");
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    updateField("imageUrl", "");
    setImagePreview("");
    setImageError("");
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!/^https?:\/\//i.test(form.sourceUrl.trim())) {
      setFormError("Link must start with http:// or https://");
      return;
    }
    if (imageUploading) {
      setFormError("Image is still uploading — wait for it to finish.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      };

      if (editingId) {
        await adminApi.patch(`/admin/news/${editingId}`, payload);
      } else {
        await adminApi.post("/admin/news", payload);
      }

      setDrawerOpen(false);
      await load(query);
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async (item) => {
    try {
      await adminApi.patch(`/admin/news/${item._id}`, {
        status: item.status === "hidden" ? "active" : "hidden",
      });
      await load(query);
    } catch (err) {
      setError(err.response?.data?.message || "That action failed");
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Permanently delete "${item.title}"? This can't be undone.`)) return;
    try {
      await adminApi.delete(`/admin/news/${item._id}`);
      await load(query);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete that item");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgba(67,56,202,0.1)] text-[#4338CA]">
            <Newspaper size={18} />
          </div>
          <div>
            <p className="text-[15px] font-black text-[#12141C]">News — manual entries</p>
            <p className="text-[11px] font-bold text-[#667085]">
              {total} admin-authored item{total === 1 ? "" : "s"} · shows up in the app's News feed alongside
              ingested content
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#4338CA] px-4 py-2.5 text-[12px] font-black text-white active:scale-95"
        >
          <Plus size={14} /> New announcement
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title..."
          className="w-full rounded-2xl border border-[#EAECF0] bg-white py-2.5 pl-10 pr-3.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
        />
      </div>

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError text={error} onRetry={() => load(query)} />
      ) : items.length === 0 ? (
        <AdminEmpty
          title="No manual news entries yet"
          text="Use New announcement to push IMCircle-authored content into the News feed."
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item._id} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-black uppercase text-[#667085]">
                      {item.type}
                    </span>
                    {item.status === "hidden" && (
                      <span className="rounded-full bg-[#FEF3F2] px-2.5 py-1 text-[10px] font-black uppercase text-[#D92D20]">
                        Hidden
                      </span>
                    )}
                    {item.isBreaking && (
                      <span className="rounded-full bg-[#FFF6ED] px-2.5 py-1 text-[10px] font-black uppercase text-[#EC9A1E]">
                        Breaking
                      </span>
                    )}
                    {item.isNotificationEligible && (
                      <span className="flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-black uppercase text-[#067647]">
                        <Bell size={10} /> Notifies
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[14px] font-black text-[#12141C]">{item.title}</p>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-[#667085]">{item.summary}</p>
                  )}
                  {(item.categories || []).length > 0 && (
                    <p className="mt-1.5 text-[10.5px] font-bold text-[#98A2B3]">
                      {item.categories.join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 text-[10.5px] font-bold text-[#98A2B3]">
                    {new Date(item.publishedAt).toLocaleString()}
                  </p>
                </div>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <AdminButton onClick={() => openEdit(item)}>
                  <span className="flex items-center gap-1.5">
                    <Pencil size={12} /> Edit
                  </span>
                </AdminButton>
                <AdminButton onClick={() => toggleHidden(item)}>
                  {item.status === "hidden" ? "Unhide" : "Hide"}
                </AdminButton>
                <AdminButton danger onClick={() => remove(item)}>
                  <span className="flex items-center gap-1.5">
                    <Trash2 size={12} /> Delete
                  </span>
                </AdminButton>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit announcement" : "New announcement"}
        subtitle="Appears in the app's News feed"
        footer={
          <>
            {formError && <p className="mb-2 text-[11.5px] font-bold text-[#D92D20]">{formError}</p>}
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="h-11 w-full rounded-2xl bg-[#4338CA] text-[12.5px] font-black text-white active:scale-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Publish announcement"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Title
            </label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={300}
              placeholder="What's the headline?"
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Summary
            </label>
            <textarea
              value={form.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              maxLength={600}
              rows={3}
              placeholder="A short 1-2 sentence summary"
              className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Image
            </label>
            <p className="mb-2 text-[10.5px] font-bold text-[#98A2B3]">
              Every card in the News feed shows an image — upload one from your device, it's stored on Cloudinary.
            </p>

            {imagePreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-[#EAECF0]">
                <img src={imagePreview} alt="" className="h-40 w-full object-cover" />
                {imageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#F7F8FC] text-[#667085] active:scale-[0.99]"
              >
                <ImagePlus size={22} />
                <span className="text-[12px] font-black">Upload from gallery</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={handleImagePick}
            />

            {imageError && <p className="mt-1.5 text-[11px] font-bold text-[#D92D20]">{imageError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
                Source name
              </label>
              <input
                value={form.sourceName}
                onChange={(event) => updateField("sourceName", event.target.value)}
                placeholder="IMCircle"
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
                Type
              </label>
              <select
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              >
                {NEWS_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Link
            </label>
            <input
              value={form.sourceUrl}
              onChange={(event) => updateField("sourceUrl", event.target.value)}
              placeholder="https://... (registration page, full announcement, etc.)"
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Categories (comma-separated)
            </label>
            <input
              value={form.categories}
              onChange={(event) => updateField("categories", event.target.value)}
              placeholder="Startup, Events, Government Schemes..."
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
                Industries
              </label>
              <input
                value={form.industries}
                onChange={(event) => updateField("industries", event.target.value)}
                placeholder="Tech, Business..."
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
                Publish date
              </label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => updateField("publishedAt", event.target.value)}
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
            <input
              type="checkbox"
              checked={form.isBreaking}
              onChange={(event) => updateField("isBreaking", event.target.checked)}
              className="h-4 w-4 accent-[#4338CA]"
            />
            <span className="text-[12.5px] font-bold text-[#344054]">Mark as breaking/urgent</span>
          </label>

          {!editingId && (
            <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
              <input
                type="checkbox"
                checked={form.notifyMatchedUsers}
                onChange={(event) => updateField("notifyMatchedUsers", event.target.checked)}
                className="h-4 w-4 accent-[#4338CA]"
              />
              <span className="text-[12.5px] font-bold text-[#344054]">
                Notify users whose interest/field matches these categories
              </span>
            </label>
          )}
        </div>
      </Drawer>
    </div>
  );
}
