import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase";
import { COL, fsList, fsAdd, fsUpdate, fsDelete, orderBy } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";
import { ACard, AButton, AEmpty, AField, AInput, AModal, ASelect, ATextarea, AToggle, dark, slugify } from "./ui";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  reading_minutes: number | null;
  is_published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  external_url?: string | null;
  source_name?: string | null;
  tags?: string[];
  created_at?: string;
};

const BLANK: Omit<Post, "id"> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "True Furniture's",
  reading_minutes: 4,
  is_published: false,
  published_at: null,
  seo_title: "",
  seo_description: "",
  external_url: null,
  source_name: null,
  tags: [],
};

/** Very small markdown subset preview — matches what the public blog renders. */
function renderPreview(md: string) {
  return md.split("\n\n").map((block, i) => {
    if (block.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-3">{block.slice(4)}</h3>;
    if (block.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4">{block.slice(3)}</h2>;
    if (block.startsWith("> ")) return <blockquote key={i} className="border-l-2 pl-3 italic opacity-80" style={{ borderColor: dark.accent }}>{block.slice(2)}</blockquote>;
    if (/^!\[.*\]\(.+\)$/.test(block.trim())) {
      const url = block.trim().replace(/^!\[.*\]\(/, "").replace(/\)$/, "");
      return <img key={i} src={url} alt="" className="rounded-md w-full" />;
    }
    if (block.split("\n").every((l) => l.startsWith("- "))) {
      return (
        <ul key={i} className="list-disc pl-5 space-y-1">
          {block.split("\n").map((l, j) => <li key={j}>{l.slice(2)}</li>)}
        </ul>
      );
    }
    return <p key={i} className="whitespace-pre-wrap opacity-90">{block}</p>;
  });
}

export function BlogManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Post | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "published" | "draft" | "linked">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => fsList<Post>(COL.blogPosts, orderBy("created_at", "desc")),
  });

  const posts = useMemo(() => {
    let rows = data ?? [];
    if (tab === "published") rows = rows.filter((p) => p.is_published);
    if (tab === "draft") rows = rows.filter((p) => !p.is_published);
    if (tab === "linked") rows = rows.filter((p) => !!p.external_url);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((p) => p.title?.toLowerCase().includes(s) || p.slug?.toLowerCase().includes(s));
    }
    return rows;
  }, [data, tab, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-blog"] });

  const togglePublish = async (p: Post) => {
    const next = !p.is_published;
    try {
      await fsUpdate(COL.blogPosts, p.id, {
        is_published: next,
        published_at: next ? p.published_at ?? new Date().toISOString() : null,
      });
      toast.success(next ? "Post published" : "Moved to drafts");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    await fsDelete(COL.blogPosts, p.id);
    toast.success("Post deleted");
    refresh();
  };

  const duplicate = async (p: Post) => {
    const { id: _id, ...rest } = p;
    await fsAdd(COL.blogPosts, {
      ...rest,
      title: `${p.title} (copy)`,
      slug: `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
      is_published: false,
      published_at: null,
      created_at: new Date().toISOString(),
    });
    toast.success("Duplicated as draft");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AButton onClick={() => setEditing({ id: "", ...BLANK } as Post)}>✍️ Write new post</AButton>
        <AButton variant="ghost" onClick={() => setImportOpen(true)}>🔗 Add post from link</AButton>
        <div className="flex-1" />
        <AInput placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "published", "draft", "linked"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-[11px] px-3 py-1 rounded-full capitalize"
            style={{
              background: tab === t ? dark.accent : "transparent",
              color: tab === t ? "#1a1a1a" : dark.mute,
              border: `1px solid ${tab === t ? dark.accent : dark.border}`,
            }}
          >
            {t === "linked" ? "External links" : t}
          </button>
        ))}
      </div>

      <ACard className="!p-0">
        {isLoading ? (
          <AEmpty icon="⏳" text="Loading posts…" />
        ) : posts.length === 0 ? (
          <AEmpty icon="📝" text="No posts here yet. Write one or paste an external link." />
        ) : (
          posts.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 p-4 border-t first:border-t-0"
              style={{ borderColor: "rgba(42,42,56,0.6)" }}
            >
              <div
                className="h-12 w-16 rounded-md bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: p.cover_image ? `url(${p.cover_image})` : undefined, background: p.cover_image ? undefined : "#16161D", border: `1px solid ${dark.border}` }}
              />
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-[13px] flex items-center gap-2">
                  {p.title}
                  {p.external_url && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(80,144,224,0.15)", color: "#5090E0" }}>LINK</span>
                  )}
                </div>
                <div className="text-[11px]" style={{ color: dark.mute }}>
                  /{p.slug} · {p.author ?? "—"} · {p.published_at ? formatDate(p.published_at) : "unpublished"}
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: p.is_published ? "rgba(76,175,130,0.15)" : "rgba(200,168,107,0.12)",
                  color: p.is_published ? dark.good : dark.accent,
                }}
              >
                {p.is_published ? "Published" : "Draft"}
              </span>
              <div className="flex items-center gap-2">
                <AButton variant="ghost" onClick={() => togglePublish(p)}>{p.is_published ? "Unpublish" : "Publish"}</AButton>
                <AButton variant="ghost" onClick={() => setEditing(p)}>Edit</AButton>
                <AButton variant="ghost" onClick={() => duplicate(p)}>Duplicate</AButton>
                <AButton variant="danger" onClick={() => remove(p)}>Delete</AButton>
              </div>
            </div>
          ))
        )}
      </ACard>

      {editing && <PostEditor post={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      <ImportLinkModal open={importOpen} onClose={() => setImportOpen(false)} onSaved={refresh} />
    </div>
  );
}

function PostEditor({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
  const isNew = !post.id;
  const [form, setForm] = useState<Post>({ ...post });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setForm((f) => ({ ...f, [k]: v }));

  const wrap = (before: string, after = "") => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const text = form.content ?? "";
    const sel = text.slice(start, end) || "text";
    const next = `${text.slice(0, start)}${before}${sel}${after}${text.slice(end)}`;
    set("content", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const words = (form.content ?? "").trim().split(/\s+/).filter(Boolean).length;

  const uploadCover = async (file: File) => {
    try {
      const storage = getStorage(getFirebaseApp());
      const r = storageRef(storage, `blog/${Date.now()}-${file.name.replace(/\s+/g, "-")}`);
      await uploadBytes(r, file);
      set("cover_image", await getDownloadURL(r));
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const save = async (publish?: boolean) => {
    if (!form.title.trim()) return toast.error("Give the post a title");
    const slug = (form.slug || slugify(form.title)).trim();
    const published = publish ?? form.is_published;
    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt ?? "",
      content: form.content ?? "",
      cover_image: form.cover_image || null,
      author: form.author || "True Furniture's",
      reading_minutes: Number(form.reading_minutes) || Math.max(1, Math.round(words / 200)),
      is_published: published,
      published_at: published ? form.published_at ?? new Date().toISOString() : null,
      seo_title: form.seo_title || form.title,
      seo_description: form.seo_description || form.excerpt || "",
      tags: form.tags ?? [],
      external_url: form.external_url ?? null,
      source_name: form.source_name ?? null,
    };
    setSaving(true);
    try {
      if (isNew) await fsAdd(COL.blogPosts, { ...payload, created_at: new Date().toISOString() });
      else await fsUpdate(COL.blogPosts, post.id, payload);
      toast.success(published ? "Post published" : "Draft saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const TOOLS: { label: string; title: string; run: () => void }[] = [
    { label: "H2", title: "Heading", run: () => wrap("\n\n## ") },
    { label: "H3", title: "Sub-heading", run: () => wrap("\n\n### ") },
    { label: "B", title: "Bold", run: () => wrap("**", "**") },
    { label: "I", title: "Italic", run: () => wrap("_", "_") },
    { label: "“ ”", title: "Quote", run: () => wrap("\n\n> ") },
    { label: "• List", title: "Bullet list", run: () => wrap("\n\n- ") },
    { label: "🔗", title: "Link", run: () => wrap("[", "](https://)") },
    { label: "🖼", title: "Image", run: () => wrap("\n\n![alt](", ")") },
  ];

  return (
    <AModal
      open
      wide
      onClose={onClose}
      title={isNew ? "Write a new post" : "Edit post"}
      subtitle={`${words} words · ~${Math.max(1, Math.round(words / 200))} min read`}
      footer={
        <>
          <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
          <AButton variant="ghost" disabled={saving} onClick={() => save(false)}>Save draft</AButton>
          <AButton disabled={saving} onClick={() => save(true)}>{saving ? "Saving…" : "Publish"}</AButton>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-3 min-w-0">
          <AField label="Title">
            <AInput
              value={form.title}
              placeholder="How to choose the right sofa fabric"
              onChange={(e) => {
                set("title", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
            />
          </AField>
          <AField label="URL slug" hint={`/blog/${form.slug || "…"}`}>
            <AInput value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
          </AField>
          <AField label="Excerpt" hint="shown on the blog grid">
            <ATextarea rows={2} value={form.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
          </AField>

          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {TOOLS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  title={t.title}
                  onClick={t.run}
                  className="rounded px-2 py-1 text-[11px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${dark.border}`, color: dark.text }}
                >
                  {t.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="rounded px-2 py-1 text-[11px]"
                style={{ background: preview ? dark.accent : "transparent", color: preview ? "#1a1a1a" : dark.mute, border: `1px solid ${dark.border}` }}
              >
                {preview ? "Editing" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="rounded-md p-4 space-y-3 text-[13px] max-h-[420px] overflow-y-auto" style={{ background: dark.field, border: `1px solid ${dark.border}` }}>
                {renderPreview(form.content ?? "")}
              </div>
            ) : (
              <ATextarea
                ref={areaRef as never}
                rows={16}
                value={form.content ?? ""}
                onChange={(e) => set("content", e.target.value)}
                placeholder={"Write your story…\n\n## A heading\n\nA paragraph. Use **bold**, _italic_, - lists and ![alt](image-url)."}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1.7 }}
              />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <AField label="Cover image">
            <div
              className="h-28 rounded-md bg-cover bg-center mb-2"
              style={{ backgroundImage: form.cover_image ? `url(${form.cover_image})` : undefined, background: form.cover_image ? undefined : dark.field, border: `1px solid ${dark.border}` }}
            />
            <AInput placeholder="https://…" value={form.cover_image ?? ""} onChange={(e) => set("cover_image", e.target.value)} />
            <label className="mt-2 block text-[11px] cursor-pointer" style={{ color: dark.accent }}>
              ⬆ Upload image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </label>
          </AField>
          <AField label="Author"><AInput value={form.author ?? ""} onChange={(e) => set("author", e.target.value)} /></AField>
          <AField label="Reading minutes">
            <AInput type="number" min={1} value={form.reading_minutes ?? 4} onChange={(e) => set("reading_minutes", Number(e.target.value))} />
          </AField>
          <AField label="Tags" hint="comma separated">
            <AInput
              value={(form.tags ?? []).join(", ")}
              onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            />
          </AField>
          <AField label="Status">
            <ASelect value={form.is_published ? "published" : "draft"} onChange={(e) => set("is_published", e.target.value === "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </ASelect>
          </AField>
          <AField label="Publish date">
            <AInput
              type="date"
              value={(form.published_at ?? "").slice(0, 10)}
              onChange={(e) => set("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </AField>
          <AField label="SEO title" hint="< 60 chars"><AInput value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></AField>
          <AField label="SEO description" hint="< 160 chars">
            <ATextarea rows={3} value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
          </AField>
        </div>
      </div>
    </AModal>
  );
}

/** Paste any article URL — it is saved as a post card that links out. */
function ImportLinkModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  const onUrl = (v: string) => {
    setUrl(v);
    try {
      const u = new URL(v);
      if (!source) setSource(u.hostname.replace(/^www\./, ""));
      if (!title) {
        const last = u.pathname.split("/").filter(Boolean).pop() ?? "";
        if (last) setTitle(decodeURIComponent(last).replace(/[-_]+/g, " ").replace(/\.\w+$/, "").replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    } catch { /* still typing */ }
  };

  const save = async () => {
    let host = "";
    try { host = new URL(url).hostname; } catch { return toast.error("Paste a valid link (https://…)"); }
    if (!title.trim()) return toast.error("Add a title for the card");
    setSaving(true);
    try {
      await fsAdd(COL.blogPosts, {
        title: title.trim(),
        slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
        excerpt: excerpt || `Read this story on ${source || host}.`,
        content: `> Originally published on ${source || host}.\n\n[Read the full article ↗](${url})`,
        cover_image: cover || null,
        author: source || host,
        source_name: source || host,
        external_url: url,
        reading_minutes: 3,
        is_published: true,
        published_at: new Date().toISOString(),
        seo_title: title.trim(),
        seo_description: excerpt || "",
        created_at: new Date().toISOString(),
      });
      toast.success("Link added to the journal");
      setUrl(""); setTitle(""); setExcerpt(""); setCover(""); setSource("");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AModal
      open={open}
      onClose={onClose}
      title="Add a post from a link"
      subtitle="The card appears in the journal and opens the original article in a new tab."
      footer={
        <>
          <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
          <AButton disabled={saving} onClick={save}>{saving ? "Adding…" : "Add to blog"}</AButton>
        </>
      }
    >
      <AField label="Article link"><AInput placeholder="https://example.com/article" value={url} onChange={(e) => onUrl(e.target.value)} /></AField>
      <AField label="Card title"><AInput value={title} onChange={(e) => setTitle(e.target.value)} /></AField>
      <AField label="Short description"><ATextarea rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></AField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Cover image URL"><AInput value={cover} onChange={(e) => setCover(e.target.value)} /></AField>
        <AField label="Source name"><AInput value={source} onChange={(e) => setSource(e.target.value)} /></AField>
      </div>
    </AModal>
  );
}
