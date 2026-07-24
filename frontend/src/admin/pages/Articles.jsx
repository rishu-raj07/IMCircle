import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, FileText, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import adminApi from "../api/adminApi";
import { AdminButton, AdminEmpty, AdminError, AdminLoading } from "../components/AdminStates";
import Drawer from "../components/Drawer";

// Admin-authored Articles — a SEPARATE tool from admin/pages/News.jsx's
// manual news entries (deliberately not merged, per spec). This creates
// Article documents directly (status draft/published, no review workflow —
// the admin creating it IS the reviewer). Community-submitted articles
// (draft -> pending_review -> approved/rejected/changes_requested) go
// through this same Article model/status enum but arrive via a separate
// user-facing /articles/write flow + moderation queue in a later phase —
// this page only needs to list/manage them, not gatekeep here.

const CATEGORIES = [
  "Startup", "Founder Stories", "Funding", "Education", "Career", "AI",
  "Technology", "Government", "Opportunities", "Productivity",
  "Creator Economy", "Business", "Other",
];

const TARGET_ROLES = ["student", "founder", "creator", "freelancer", "professional", "all"];
const LANGUAGES = ["English", "Hindi", "Hinglish"];

const EMPTY_FORM = {
  title: "",
  shortSummary: "",
  content: "",
  contentFormat: "html",
  whyItMatters: "",
  keyTakeaways: "",
  authorName: "",
  articleType: "internal",
  sourceName: "",
  sourceUrl: "",
  category: "Startup",
  industries: "",
  tags: "",
  targetRoles: [],
  targetInterests: "",
  language: "English",
  isFeatured: false,
  allowThoughts: true,
  publishNow: false,
};

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseLines(value) {
  return String(value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function AdminArticles() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCoverImage, setEditingCoverImage] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  const load = useCallback(async (q, status) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.get("/admin/articles", {
        params: { q: q || undefined, status: status && status !== "all" ? status : undefined, limit: 50 },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(query, statusFilter), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTargetRole = (role) => {
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingCoverImage(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
    setImageError("");
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setEditingCoverImage(item.coverImage || null);
    setForm({
      title: item.title || "",
      shortSummary: item.shortSummary || "",
      content: item.content || "",
      contentFormat: item.contentFormat || "html",
      whyItMatters: item.whyItMatters || "",
      keyTakeaways: (item.keyTakeaways || []).join("\n"),
      authorName: item.authorName || "",
      articleType: item.articleType || "internal",
      sourceName: item.sourceName || "",
      sourceUrl: item.sourceUrl || "",
      category: item.category || "Startup",
      industries: (item.industries || []).join(", "),
      tags: (item.tags || []).join(", "),
      targetRoles: item.targetRoles || [],
      targetInterests: (item.targetInterests || []).join(", "),
      language: item.language || "English",
      isFeatured: Boolean(item.isFeatured),
      allowThoughts: item.allowThoughts !== false,
      publishNow: item.status === "published",
    });
    setImagePreview(item.coverImage?.url || "");
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
      const res = await adminApi.post("/admin/articles/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditingCoverImage({ url: res.data?.file?.url || "", publicId: res.data?.file?.publicId || "", altText: "" });
    } catch (err) {
      setImageError(err.response?.data?.message || "Image upload failed. Try again.");
      setImagePreview(editingCoverImage?.url || "");
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setEditingCoverImage(null);
    setImagePreview("");
    setImageError("");
  };

  const submit = async () => {
    setFormError("");

    if (!form.title.trim()) return setFormError("Title is required.");
    if (!form.shortSummary.trim()) return setFormError("Short summary is required.");
    if (form.articleType === "external" && !/^https?:\/\//i.test(form.sourceUrl.trim())) {
      return setFormError("External articles need a valid source link (http:// or https://).");
    }
    if (form.articleType === "external" && !form.sourceName.trim()) {
      return setFormError("Source name is required for external articles.");
    }
    if (form.articleType === "internal" && !form.content.trim()) {
      return setFormError("Content is required for internal articles.");
    }
    if (imageUploading) return setFormError("Image is still uploading — wait for it to finish.");

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        shortSummary: form.shortSummary,
        content: form.content,
        contentFormat: form.contentFormat,
        whyItMatters: form.whyItMatters,
        keyTakeaways: parseLines(form.keyTakeaways),
        authorName: form.authorName,
        articleType: form.articleType,
        sourceName: form.sourceName,
        sourceUrl: form.sourceUrl,
        category: form.category,
        industries: parseCsv(form.industries),
        tags: parseCsv(form.tags).map((t) => t.toLowerCase()),
        targetRoles: form.targetRoles,
        targetInterests: parseCsv(form.targetInterests).map((t) => t.toLowerCase()),
        language: form.language,
        isFeatured: form.isFeatured,
        allowThoughts: form.allowThoughts,
        coverImage: editingCoverImage || undefined,
      };

      if (editingId) {
        await adminApi.patch(`/admin/articles/${editingId}`, {
          ...payload,
          status: form.publishNow ? "published" : "draft",
        });
      } else {
        await adminApi.post("/admin/articles", { ...payload, publishNow: form.publishNow });
      }

      setDrawerOpen(false);
      await load(query, statusFilter);
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save this article.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (item) => {
    try {
      await adminApi.patch(`/admin/articles/${item._id}/feature`, { isFeatured: !item.isFeatured });
      await load(query, statusFilter);
    } catch (err) {
      setError(err.response?.data?.message || "That action failed");
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Permanently delete "${item.title}"? This can't be undone.`)) return;
    try {
      await adminApi.delete(`/admin/articles/${item._id}`);
      await load(query, statusFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete that article");
    }
  };

  const STATUS_TABS = ["all", "draft", "published", "archived"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#EAECF0] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgba(67,56,202,0.1)] text-[#4338CA]">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[15px] font-black text-[#12141C]">Articles</p>
            <p className="text-[11px] font-bold text-[#667085]">
              {total} article{total === 1 ? "" : "s"} · internal + external, separate from News manual entries
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#4338CA] px-4 py-2.5 text-[12px] font-black text-white active:scale-95"
        >
          <Plus size={14} /> New article
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className="rounded-full px-3 py-1.5 text-[11px] font-black capitalize"
            style={
              statusFilter === s
                ? { background: "#4338CA", color: "#fff" }
                : { background: "#F2F4F7", color: "#667085" }
            }
          >
            {s}
          </button>
        ))}
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
        <AdminError text={error} onRetry={() => load(query, statusFilter)} />
      ) : items.length === 0 ? (
        <AdminEmpty title="No articles yet" text="Use New article to publish internal or external content." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item._id} className="rounded-[24px] border border-[#EAECF0] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-black uppercase text-[#667085]">
                      {item.status}
                    </span>
                    <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-black uppercase text-[#4338CA]">
                      {item.articleType}
                    </span>
                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-black text-[#667085]">
                      {item.category}
                    </span>
                    {item.isFeatured && (
                      <span className="flex items-center gap-1 rounded-full bg-[#FFF6ED] px-2.5 py-1 text-[10px] font-black uppercase text-[#EC9A1E]">
                        <Star size={10} fill="currentColor" /> Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[14px] font-black text-[#12141C]">{item.title}</p>
                  {item.shortSummary && (
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-[#667085]">{item.shortSummary}</p>
                  )}
                  <p className="mt-1.5 text-[10.5px] font-bold text-[#98A2B3]">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Not published"}
                  </p>
                </div>
                {item.coverImage?.url && (
                  <img
                    src={item.coverImage.url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <AdminButton onClick={() => openEdit(item)}>
                  <span className="flex items-center gap-1.5">
                    <Pencil size={12} /> Edit
                  </span>
                </AdminButton>
                <AdminButton onClick={() => toggleFeature(item)}>
                  {item.isFeatured ? "Unfeature" : "Feature"}
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
        title={editingId ? "Edit article" : "New article"}
        subtitle="Separate from News manual entries — shows up in the app's Articles tab"
        footer={
          <>
            {formError && <p className="mb-2 text-[11.5px] font-bold text-[#D92D20]">{formError}</p>}
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="h-11 w-full rounded-2xl bg-[#4338CA] text-[12.5px] font-black text-white active:scale-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : form.publishNow ? "Publish article" : "Save as draft"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => updateField("articleType", "internal")}
              className="rounded-2xl border px-3.5 py-2.5 text-[12.5px] font-black"
              style={
                form.articleType === "internal"
                  ? { borderColor: "#4338CA", background: "#EEF2FF", color: "#4338CA" }
                  : { borderColor: "#EAECF0", color: "#667085" }
              }
            >
              Internal (full content)
            </button>
            <button
              type="button"
              onClick={() => updateField("articleType", "external")}
              className="rounded-2xl border px-3.5 py-2.5 text-[12.5px] font-black"
              style={
                form.articleType === "external"
                  ? { borderColor: "#4338CA", background: "#EEF2FF", color: "#4338CA" }
                  : { borderColor: "#EAECF0", color: "#667085" }
              }
            >
              External (summary only)
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Title</label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={180}
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Short summary</label>
            <textarea
              value={form.shortSummary}
              onChange={(event) => updateField("shortSummary", event.target.value)}
              maxLength={500}
              rows={2}
              className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Cover image</label>
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
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleImagePick} />
            {imageError && <p className="mt-1.5 text-[11px] font-bold text-[#D92D20]">{imageError}</p>}
          </div>

          {form.articleType === "internal" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
                Content (HTML)
              </label>
              <textarea
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
                rows={8}
                placeholder="<p>Full article body...</p>"
                className="w-full resize-y rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[12.5px] font-medium text-[#12141C] outline-none focus:border-[#4338CA]"
              />
              <p className="mt-1 text-[10px] font-bold text-[#98A2B3]">
                Plain HTML for now — the rich-text writing editor lands with community submissions.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Source name</label>
                  <input
                    value={form.sourceName}
                    onChange={(event) => updateField("sourceName", event.target.value)}
                    className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Source link</label>
                  <input
                    value={form.sourceUrl}
                    onChange={(event) => updateField("sourceUrl", event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Why it matters</label>
                <textarea
                  value={form.whyItMatters}
                  onChange={(event) => updateField("whyItMatters", event.target.value)}
                  maxLength={600}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Key takeaways (one per line)
            </label>
            <textarea
              value={form.keyTakeaways}
              onChange={(event) => updateField("keyTakeaways", event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Category</label>
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Language</label>
              <select
                value={form.language}
                onChange={(event) => updateField("language", event.target.value)}
                className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
              Author name {form.articleType === "internal" ? "" : "(byline, optional)"}
            </label>
            <input
              value={form.authorName}
              onChange={(event) => updateField("authorName", event.target.value)}
              placeholder="IMCircle Editorial"
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="funding, saas, hiring..."
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Industries (comma-separated)</label>
            <input
              value={form.industries}
              onChange={(event) => updateField("industries", event.target.value)}
              placeholder="Tech, Business..."
              className="w-full rounded-2xl border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-semibold text-[#12141C] outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">Target roles</label>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleTargetRole(role)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-black capitalize"
                  style={
                    form.targetRoles.includes(role)
                      ? { background: "#4338CA", color: "#fff" }
                      : { background: "#F2F4F7", color: "#667085" }
                  }
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) => updateField("isFeatured", event.target.checked)}
              className="h-4 w-4 accent-[#4338CA]"
            />
            <span className="text-[12.5px] font-bold text-[#344054]">Feature on the Articles rail</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
            <input
              type="checkbox"
              checked={form.allowThoughts}
              onChange={(event) => updateField("allowThoughts", event.target.checked)}
              className="h-4 w-4 accent-[#4338CA]"
            />
            <span className="text-[12.5px] font-bold text-[#344054]">Allow "Add Thought" replies</span>
          </label>

          {!editingId && (
            <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
              <input
                type="checkbox"
                checked={form.publishNow}
                onChange={(event) => updateField("publishNow", event.target.checked)}
                className="h-4 w-4 accent-[#4338CA]"
              />
              <span className="text-[12.5px] font-bold text-[#344054]">Publish immediately (otherwise saved as draft)</span>
            </label>
          )}

          {editingId && (
            <label className="flex items-center gap-2.5 rounded-2xl border border-[#EAECF0] p-3">
              <input
                type="checkbox"
                checked={form.publishNow}
                onChange={(event) => updateField("publishNow", event.target.checked)}
                className="h-4 w-4 accent-[#4338CA]"
              />
              <span className="text-[12.5px] font-bold text-[#344054]">Published — uncheck and save to unpublish back to draft</span>
            </label>
          )}
        </div>
      </Drawer>
    </div>
  );
}
