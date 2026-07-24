import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Minus,
  Undo2,
  Redo2,
  ImagePlus,
  ImageIcon,
  X,
  Loader2,
  Eye,
} from "lucide-react";

import { currentUser } from "../../store/authStore";
import { uploadImage } from "../../api/uploadApi";
import {
  createArticleDraft,
  getArticleForEdit,
  updateArticleDraft,
  publishArticle,
} from "../../api/articleApi";

const CATEGORIES = [
  "Startup", "Founder Stories", "Funding", "Education", "Career", "AI",
  "Technology", "Government", "Opportunities", "Productivity",
  "Creator Economy", "Business", "Personal Growth", "Other",
];

const LANGUAGES = ["English", "Hindi", "Hinglish"];
const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", hint: "Anyone on IMCircle" },
  { value: "followers", label: "Followers", hint: "Only people who follow you" },
  { value: "private", label: "Private", hint: "Only you" },
];

const AUTOSAVE_DELAY_MS = 2000;
const MIN_PUBLISH_LENGTH = 300;

function localKey(articleId) {
  return `imcircle_article_draft_${articleId}`;
}

function plainTextLength(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

function readLocalDraft(articleId) {
  try {
    const raw = window.localStorage.getItem(localKey(articleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocalDraft(articleId, data) {
  try {
    window.localStorage.setItem(
      localKey(articleId),
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    // localStorage full/unavailable — the server autosave is still the
    // source of truth, so this is a soft failure, not a blocker.
  }
}

function clearLocalDraft(articleId) {
  try {
    window.localStorage.removeItem(localKey(articleId));
  } catch {
    // ignore
  }
}

function ToolbarButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl active:scale-90 disabled:opacity-30"
      style={{
        background: active ? "var(--imc-indigo)" : "var(--imc-surface-2)",
        color: active ? "#fff" : "var(--imc-text)",
      }}
    >
      {children}
    </button>
  );
}

// LinkedIn-style long-form editor. Creates exactly ONE draft document
// immediately (see createArticleDraft) and every autosave/edit call PATCHes
// that same document — never a second one. A localStorage mirror is kept
// in lockstep so a closed tab/lost connection never loses writing; it's
// cleared the moment publish succeeds.
function WriteArticle() {
  const navigate = useNavigate();
  const location = useLocation();
  const editIdFromState = location.state?.articleId || null;

  const [articleId, setArticleId] = useState(editIdFromState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [visibility, setVisibility] = useState("public");
  const [coverImage, setCoverImage] = useState(null);
  const [confirmOriginal, setConfirmOriginal] = useState(false);
  const [status, setStatus] = useState("draft");

  const [saveStatus, setSaveStatus] = useState("idle"); // idle|saving|saved|error|offline
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const coverInputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const skipNextAutosave = useRef(true); // don't autosave the instant we load

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Write your article..." }),
    ],
    content: "",
    onUpdate: () => scheduleAutosave(),
  });

  // --- Load or create the draft on mount ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let doc;
        if (editIdFromState) {
          const res = await getArticleForEdit(editIdFromState);
          doc = res?.item;
        } else {
          const res = await createArticleDraft();
          doc = res?.item;
        }
        if (!doc) throw new Error("no-article");
        if (cancelled) return;

        const local = readLocalDraft(doc._id);
        const serverUpdatedAt = new Date(doc.updatedAt || 0).getTime();
        const useLocal = local?.savedAt && local.savedAt > serverUpdatedAt;
        const source = useLocal ? local : doc;

        setArticleId(doc._id);
        setTitle(source.title || "");
        setSubtitle(source.subtitle || "");
        setCategory(source.category && source.category !== "Other" ? source.category : doc.category || "");
        setTagsInput((source.tags || doc.tags || []).join(", "));
        setLanguage(source.language || doc.language || "English");
        setVisibility(source.visibility || doc.visibility || "public");
        setCoverImage(source.coverImage?.url ? source.coverImage : doc.coverImage?.url ? doc.coverImage : null);
        setStatus(doc.status || "draft");
        editor?.commands.setContent(source.content || doc.content || "");

        if (useLocal) {
          setSaveStatus("offline");
          writeLocalDraft(doc._id, { ...source }); // keep it until next successful save
        }
      } catch {
        if (!cancelled) setLoadError("Could not open the editor. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
        window.setTimeout(() => {
          skipNextAutosave.current = false;
        }, 300);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const currentSnapshot = useCallback(
    () => ({
      title,
      subtitle,
      shortSummary: undefined,
      content: editor?.getHTML() || "",
      category: category || "Other",
      tags: tagsInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      language,
      visibility,
      coverImage: coverImage || { url: "", publicId: "", altText: "" },
    }),
    [title, subtitle, editor, category, tagsInput, language, visibility, coverImage]
  );

  const runAutosave = useCallback(async () => {
    if (!articleId) return;
    const snapshot = currentSnapshot();
    writeLocalDraft(articleId, snapshot);
    setSaveStatus("saving");
    try {
      await updateArticleDraft(articleId, snapshot);
      setSaveStatus("saved");
      clearLocalDraft(articleId);
    } catch {
      setSaveStatus(navigator.onLine ? "error" : "offline");
    }
  }, [articleId, currentSnapshot]);

  function scheduleAutosave() {
    if (skipNextAutosave.current) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    // Immediate local mirror so a crash mid-debounce never loses text, even
    // though the SERVER save is still debounced.
    if (articleId) writeLocalDraft(articleId, currentSnapshot());
    autosaveTimer.current = window.setTimeout(runAutosave, AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, category, tagsInput, language, visibility, coverImage]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, []);

  const handleCoverPick = async (event) => {
    const file = event.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }

    setImageError("");
    setImageUploading(true);
    try {
      const uploaded = await uploadImage(file, { purpose: "article", maxWidth: 1600, maxSizeKB: 400 });
      setCoverImage({ url: uploaded.secureUrl || uploaded.url, publicId: uploaded.publicId, altText: "" });
    } catch {
      setImageError("Cover image upload failed. Try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const removeCoverImage = () => setCoverImage(null);

  const insertInlineImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const uploaded = await uploadImage(file, { purpose: "article", maxWidth: 1200, maxSizeKB: 300 });
        editor?.chain().focus().setImage({ src: uploaded.secureUrl || uploaded.url }).run();
      } catch {
        setImageError("Image upload failed. Try again.");
      }
    };
    input.click();
  };

  const setLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Links must start with http:// or https://");
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const contentLength = plainTextLength(editor?.getHTML() || "");

  const validationIssues = useMemo(() => {
    const issues = [];
    if (!title.trim()) issues.push("Add a title.");
    if (!category) issues.push("Choose a category.");
    if (contentLength < MIN_PUBLISH_LENGTH) {
      issues.push(`Write at least ${MIN_PUBLISH_LENGTH} characters (currently ${contentLength}).`);
    }
    if (!confirmOriginal) issues.push("Confirm this is your original work.");
    return issues;
  }, [title, category, contentLength, confirmOriginal]);

  // Clears the inline validation banner the moment whatever it complained
  // about is actually fixed, rather than leaving stale "add a title" text
  // up after the user has already added one.
  useEffect(() => {
    if (validationIssues.length === 0 && publishError) setPublishError("");
  }, [validationIssues, publishError]);

  const openPublishModal = async () => {
    setPublishError("");
    await runAutosave();
    if (validationIssues.length > 0) {
      setPublishError(validationIssues[0]);
      return;
    }
    setShowPublishModal(true);
  };

  const doPublish = async () => {
    if (!articleId) return;
    setPublishing(true);
    setPublishError("");
    try {
      const res = await publishArticle(articleId, { confirmOriginal });
      clearLocalDraft(articleId);
      setShowPublishModal(false);
      navigate(`/articles/${res.item.slug}`, { replace: true });
    } catch (err) {
      setPublishError(err?.response?.data?.message || "Could not publish this article.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--imc-bg)" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--imc-indigo)" }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "var(--imc-bg)" }}>
        <p className="text-[14px] font-black" style={{ color: "var(--imc-text)" }}>{loadError}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 rounded-2xl px-5 text-[12px] font-black text-white"
          style={{ background: "var(--imc-indigo)" }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center" style={{ background: "var(--imc-bg)" }}>
      <div className="relative min-h-screen w-full max-w-[760px] pb-24" style={{ background: "var(--imc-bg)" }}>
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--imc-bg)", borderBottom: "1px solid var(--imc-border)" }}>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="grid h-9 w-9 place-items-center rounded-full active:scale-90"
              style={{ background: "var(--imc-surface-2)" }}
            >
              <ArrowLeft size={18} style={{ color: "var(--imc-text)" }} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-text-muted)" }}>
              {status === "draft" ? "Draft" : "Editing"}
            </span>
            <SaveStatusPill status={saveStatus} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-black active:scale-95"
              style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
            >
              <Eye size={14} /> {showPreview ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              onClick={openPublishModal}
              className="h-9 rounded-full px-4 text-[11.5px] font-black text-white active:scale-95"
              style={{ background: "var(--imc-indigo)" }}
            >
              Publish
            </button>
          </div>
        </div>

        {/* Validation failures from openPublishModal (missing title/category/
            content length/confirmation) land here — set before the modal
            ever opens, so they'd otherwise be invisible (the modal, where
            publishError also renders, only mounts once validation passes). */}
        {publishError && !showPublishModal && (
          <div className="mx-4 mt-3 rounded-2xl px-4 py-3 text-[12.5px] font-bold" style={{ background: "rgba(217,45,32,0.08)", border: "1px solid rgba(217,45,32,0.25)", color: "#D92D20" }}>
            {publishError}
          </div>
        )}

        {showPreview ? (
          <ArticlePreview
            title={title}
            subtitle={subtitle}
            coverImage={coverImage}
            content={editor?.getHTML() || ""}
            category={category}
            authorName={currentUser()?.fullName}
          />
        ) : (
          <div className="px-4 py-5">
            <div className="mb-4">
              {coverImage?.url ? (
                <div className="relative overflow-hidden rounded-[18px]" style={{ aspectRatio: "1200 / 630", background: "var(--imc-surface-2)" }}>
                  <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
                  {imageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 size={22} className="animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    aria-label="Remove cover image"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex h-36 w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed"
                  style={{ borderColor: "var(--imc-border)", background: "var(--imc-surface)", color: "var(--imc-text-muted)" }}
                >
                  <ImageIcon size={22} />
                  <span className="text-[12px] font-black">Add a cover image</span>
                  <span className="text-[10.5px] font-bold">Recommended: 1200 × 630 pixels</span>
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleCoverPick} />
              {imageError && <p className="mt-1.5 text-[11px] font-bold" style={{ color: "#D92D20" }}>{imageError}</p>}
            </div>

            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              rows={1}
              maxLength={180}
              className="w-full resize-none border-none bg-transparent text-[26px] font-black leading-tight outline-none"
              style={{ color: "var(--imc-text)" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />

            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Add a subtitle (optional)"
              maxLength={300}
              className="mt-1 w-full border-none bg-transparent text-[15px] font-semibold outline-none"
              style={{ color: "var(--imc-text-muted)" }}
            />

            <div className="my-4 grid grid-cols-2 gap-2.5">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border px-3.5 py-2.5 text-[12.5px] font-bold outline-none"
                style={{ borderColor: "var(--imc-border)", color: "var(--imc-text)", background: "var(--imc-surface)" }}
              >
                <option value="">Choose category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-2xl border px-3.5 py-2.5 text-[12.5px] font-bold outline-none"
                style={{ borderColor: "var(--imc-border)", color: "var(--imc-text)", background: "var(--imc-surface)" }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma-separated) — e.g. hiring, saas, product"
              className="w-full rounded-2xl border px-3.5 py-2.5 text-[12.5px] font-semibold outline-none"
              style={{ borderColor: "var(--imc-border)", color: "var(--imc-text)", background: "var(--imc-surface)" }}
            />

            <div className="mt-3 flex gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className="flex-1 rounded-2xl border px-3 py-2 text-center"
                  style={{
                    borderColor: visibility === opt.value ? "var(--imc-indigo)" : "var(--imc-border)",
                    background: visibility === opt.value ? "var(--imc-indigo-soft)" : "var(--imc-surface)",
                  }}
                >
                  <p className="text-[11.5px] font-black" style={{ color: visibility === opt.value ? "var(--imc-indigo-text)" : "var(--imc-text)" }}>
                    {opt.label}
                  </p>
                  <p className="text-[9.5px] font-bold" style={{ color: "var(--imc-text-faint)" }}>{opt.hint}</p>
                </button>
              ))}
            </div>

            {editor && (
              <div className="no-scrollbar sticky top-[57px] z-10 my-4 flex items-center gap-1 overflow-x-auto rounded-2xl p-1.5" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
                <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  <Heading1 size={16} />
                </ToolbarButton>
                <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  <Heading3 size={16} />
                </ToolbarButton>
                <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                  <BoldIcon size={16} />
                </ToolbarButton>
                <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  <ItalicIcon size={16} />
                </ToolbarButton>
                <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                  <UnderlineIcon size={16} />
                </ToolbarButton>
                <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  <List size={16} />
                </ToolbarButton>
                <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  <Quote size={16} />
                </ToolbarButton>
                <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
                  <Link2 size={16} />
                </ToolbarButton>
                <ToolbarButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                  <Minus size={16} />
                </ToolbarButton>
                <ToolbarButton label="Insert image" onClick={insertInlineImage}>
                  <ImagePlus size={16} />
                </ToolbarButton>
                <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
                  <Undo2 size={16} />
                </ToolbarButton>
                <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
                  <Redo2 size={16} />
                </ToolbarButton>
              </div>
            )}

            <EditorContent
              editor={editor}
              className="imc-article-editor min-h-[300px] text-[15.5px] leading-7"
              style={{ color: "var(--imc-text)" }}
            />

            <label className="mt-6 flex items-start gap-2.5 rounded-2xl border p-3.5" style={{ borderColor: "var(--imc-border)" }}>
              <input
                type="checkbox"
                checked={confirmOriginal}
                onChange={(e) => setConfirmOriginal(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--imc-indigo)]"
              />
              <span className="text-[11.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
                I confirm that this article is my original work or that I have permission to publish it.
                I understand that copied, misleading, promotional, or copyright-infringing content may be removed.
              </span>
            </label>

            <GuidelinesNote />
          </div>
        )}
      </div>

      {showPublishModal && (
        <PublishModal
          publishing={publishing}
          error={publishError}
          onCancel={() => setShowPublishModal(false)}
          onConfirm={doPublish}
        />
      )}
    </div>
  );
}

function SaveStatusPill({ status }) {
  const map = {
    idle: "",
    saving: "Saving...",
    saved: "Draft saved",
    error: "Save failed",
    offline: "Offline changes pending",
  };
  const label = map[status];
  if (!label) return null;
  return (
    <span className="text-[10.5px] font-bold" style={{ color: status === "error" ? "#D92D20" : "var(--imc-text-faint)" }}>
      {label}
    </span>
  );
}

function GuidelinesNote() {
  return (
    <div className="mt-4 rounded-2xl p-3.5" style={{ background: "var(--imc-surface)", border: "1px solid var(--imc-border)" }}>
      <p className="text-[10.5px] font-black uppercase tracking-wide" style={{ color: "var(--imc-text-muted)" }}>Writing guidelines</p>
      <p className="mt-1.5 text-[11px] font-bold leading-5" style={{ color: "var(--imc-text-faint)" }}>
        Allowed: original founder experiences, educational content, lessons and case studies, career guidance,
        personal growth stories, interviews with permission, constructive opinions.
      </p>
      <p className="mt-1.5 text-[11px] font-bold leading-5" style={{ color: "var(--imc-text-faint)" }}>
        Not allowed: copied articles, copyrighted images without permission, pure advertisements, fake funding
        or job opportunities, scams, hate speech, harassment, dangerous misinformation, adult content,
        illegal content, spam, mass-produced low-quality AI content.
      </p>
    </div>
  );
}

function ArticlePreview({ title, subtitle, coverImage, content, category, authorName }) {
  return (
    <div className="px-4 py-5">
      {category && (
        <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--imc-indigo-text)" }}>{category}</p>
      )}
      <h1 className="mt-2 text-[24px] font-black leading-tight" style={{ color: "var(--imc-text)" }}>{title || "Untitled article"}</h1>
      {subtitle && <p className="mt-2 text-[14px] font-semibold" style={{ color: "var(--imc-text-muted)" }}>{subtitle}</p>}
      <p className="mt-2 text-[11.5px] font-bold" style={{ color: "var(--imc-text-faint)" }}>By {authorName || "You"} · Community article</p>
      {coverImage?.url && (
        <div className="mt-4 overflow-hidden rounded-[18px]" style={{ aspectRatio: "16 / 9" }}>
          <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div
        className="imc-article-body mt-5 text-[15px] leading-7"
        style={{ color: "var(--imc-text)" }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function PublishModal({ publishing, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-[420px] rounded-t-[26px] p-5 sm:rounded-[26px]"
        style={{ background: "var(--imc-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-black" style={{ color: "var(--imc-text)" }}>Publish this article?</h2>
        <ul className="mt-3 space-y-1.5 text-[12.5px] font-semibold leading-5" style={{ color: "var(--imc-text-muted)" }}>
          <li>• It will appear on your profile.</li>
          <li>• Followers may see it.</li>
          <li>• It can be edited after publishing.</li>
          <li>• It will be labeled as a Community Article.</li>
          <li>• It will not automatically enter the curated Articles tab.</li>
        </ul>
        {error && <p className="mt-3 text-[11.5px] font-bold" style={{ color: "#D92D20" }}>{error}</p>}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-2xl text-[12.5px] font-black"
            style={{ background: "var(--imc-surface-2)", color: "var(--imc-text)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-2xl text-[12.5px] font-black text-white disabled:opacity-60"
            style={{ background: "var(--imc-indigo)" }}
          >
            {publishing ? "Publishing..." : "Publish article"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WriteArticle;
