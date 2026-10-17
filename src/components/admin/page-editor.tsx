import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, Save, Trash2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COL, fsList, fsSet, where } from "@/lib/db/firestore";
import { defaults, moveSection, normalizeLayout, SECTION_LABELS, type PageKind, type PageSection } from "@/lib/page-layout";
import { fetchLayouts, layoutKey } from "@/components/page-sections";
import { useAuth } from "@/lib/auth/auth-context";
import { uploadToCloudinary } from "@/lib/upload";
import { toast } from "sonner";

function SectionRow({ section, selected, onSelect, onMove, onToggle, onRemove, first, last }: {
  section: PageSection; selected: boolean; onSelect: () => void; onMove: (direction: number) => void; onToggle: () => void; onRemove: () => void; first: boolean; last: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-1 border rounded-md p-2 bg-card ${selected ? "border-primary" : "border-border"} ${isDragging ? "opacity-60 z-10" : ""}`}>
    <Button variant="ghost" size="icon" className="touch-none shrink-0" title="Drag section" aria-label={`Drag ${SECTION_LABELS[section.type]}`} {...attributes} {...listeners}><GripVertical /></Button>
    <Button variant="ghost" onClick={onSelect} className="flex-1 justify-start min-w-0 h-auto py-2 whitespace-normal text-left"><span className={!section.enabled ? "opacity-50" : ""}>{section.title || SECTION_LABELS[section.type]}</span></Button>
    <div className="flex shrink-0">
      <Button variant="ghost" size="icon" disabled={first} title="Move up" aria-label={`Move ${SECTION_LABELS[section.type]} up`} onClick={() => onMove(-1)}><ArrowUp /></Button>
      <Button variant="ghost" size="icon" disabled={last} title="Move down" aria-label={`Move ${SECTION_LABELS[section.type]} down`} onClick={() => onMove(1)}><ArrowDown /></Button>
      <Button variant="ghost" size="icon" title={section.enabled ? "Hide section" : "Show section"} aria-label={`${section.enabled ? "Hide" : "Show"} ${SECTION_LABELS[section.type]}`} onClick={onToggle}>{section.enabled ? <Eye /> : <EyeOff />}</Button>
      <Button variant="ghost" size="icon" title="Remove section" aria-label={`Remove ${SECTION_LABELS[section.type]}`} onClick={onRemove}><Trash2 /></Button>
    </div>
  </li>;
}

export function PageEditor() {
  const { isAdmin } = useAuth();
  const client = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: layoutKey, queryFn: fetchLayouts });
  const { data: products = [] } = useQuery({ queryKey: ["editor-products"], queryFn: () => fsList<{ id: string; slug: string; name: string }>(COL.sofas, where("is_published", "==", true)) });
  const [page, setPage] = useState<PageKind>("home");
  const [rows, setRows] = useState<PageSection[]>(defaults("home"));
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [addType, setAddType] = useState("text");
  const [productSlug, setProductSlug] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const rowsRef = useRef(rows); rowsRef.current = rows;
  const pageRef = useRef(page); pageRef.current = page;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { if (!dirty && !isPending) setRows(normalizeLayout(data?.[page], page)); }, [data, page, dirty, isPending]);
  const sendPreview = () => frame.current?.contentWindow?.postMessage({ kind: "tf-page-preview", page: pageRef.current, sections: rowsRef.current }, window.location.origin);
  useEffect(() => { sendPreview(); }, [rows, page]);
  useEffect(() => {
    const ready = (e: MessageEvent) => { if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.kind === "tf-page-ready") sendPreview(); };
    window.addEventListener("message", ready); return () => window.removeEventListener("message", ready);
  }, []);
  const change = (next: PageSection[]) => { setRows(next); setDirty(true); };
  const active = rows.find(s => s.id === selected);
  const patch = (values: Partial<PageSection>) => change(rows.map(s => s.id === selected ? { ...s, ...values } : s));
  const switchPage = (next: PageKind) => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false); setSelected(null); setPage(next); setRows(normalizeLayout(data?.[next], next));
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = async () => {
    setSaving(true);
    try {
      await fsSet(COL.siteSettings, "page-layouts", { [page]: rows });
      await client.invalidateQueries({ queryKey: layoutKey });
      setDirty(false); toast.success("Page arrangement saved to the storefront");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Page could not be saved"); }
    finally { setSaving(false); }
  };
  const previewSlug = productSlug || products[0]?.slug;
  const source = page === "home" ? "/?sectionPreview=1" : previewSlug ? `/products/${encodeURIComponent(previewSlug)}?sectionPreview=1` : null;
  const available = [...new Set([...defaults(page).map(s => s.type), "journey", "faqs", "text", "image"])];
  if (!isAdmin) return <p className="text-muted-foreground">Only an Owner can edit storefront pages.</p>;
  if (isPending) return <p>Loading page arrangements…</p>;
  if (error) return <div role="alert"><p>Page arrangements could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></div>;
  return <div className="bg-background text-foreground rounded-md p-4 sm:p-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-xl font-semibold">Page editor</h2><p className="text-sm text-muted-foreground">{dirty ? "Unsaved changes" : "Saved arrangement"} · Product layout applies to all sofas</p></div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) { setDirty(false); setRows(normalizeLayout(data?.[page], page)); } }} disabled={!dirty || saving}><RotateCcw />Discard</Button>
        <Button onClick={save} disabled={!dirty || saving || uploading}><Save />{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm">Page <select aria-label="Page to edit" value={page} onChange={e => switchPage(e.target.value as PageKind)} className="ml-2 border border-input rounded-md bg-background p-2"><option value="home">Home page</option><option value="product">Product pages</option></select></label>
      {page === "product" && <select aria-label="Product to preview" value={previewSlug ?? ""} onChange={e => setProductSlug(e.target.value)} className="border border-input rounded-md bg-background p-2 max-w-full">{products.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}</select>}
      <Button variant="ghost" onClick={() => { if (window.confirm("Restore default sections? Save changes to apply.")) change(defaults(page)); }}>Restore default sections</Button>
    </div>
    <div className="grid xl:grid-cols-[minmax(380px,0.8fr)_minmax(0,1.2fr)] gap-6">
      <div className="space-y-4 min-w-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active: a, over }) => { if (over) change(moveSection(rows, String(a.id), String(over.id))); }}>
          <SortableContext items={rows.map(s => s.id)} strategy={verticalListSortingStrategy}><ol className="space-y-2">{rows.map((s, i) => <SectionRow key={s.id} section={s} selected={selected === s.id} first={i === 0} last={i === rows.length - 1} onSelect={() => setSelected(s.id)} onMove={d => { const target = rows[i + d]; if (target) change(moveSection(rows, s.id, target.id)); }} onToggle={() => change(rows.map(r => r.id === s.id ? { ...r, enabled: !r.enabled } : r))} onRemove={() => { if (window.confirm("Remove this section from the page?")) change(rows.filter(r => r.id !== s.id)); }} />)}</ol></SortableContext>
        </DndContext>
        <div className="flex gap-2"><select aria-label="Section type" className="min-w-0 flex-1 border border-input rounded-md p-2 bg-background" value={addType} onChange={e => setAddType(e.target.value)}>{available.map(t => <option key={t} value={t}>{SECTION_LABELS[t]}</option>)}</select><Button onClick={() => { const id = crypto.randomUUID(); change([...rows, { id, type: addType, enabled: true }]); setSelected(id); }}><Plus />Add section</Button></div>
        {active && <div className="border-t border-border pt-5 space-y-4"><h3 className="font-semibold">{SECTION_LABELS[active.type]}</h3>
          {active.type === "text" || active.type === "image" ? <>
            <label className="block text-sm">Heading<input aria-label="Section heading" className="block w-full mt-2 border border-input bg-background rounded-md p-2" value={active.title ?? ""} onChange={e => patch({ title: e.target.value })} /></label>
            <label className="block text-sm">Text<textarea aria-label="Section text" rows={4} className="block w-full mt-2 border border-input bg-background rounded-md p-2" value={active.body ?? ""} onChange={e => patch({ body: e.target.value })} /></label>
            {active.type === "image" && <>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer border border-input p-3 rounded-md"><Upload />{uploading ? "Uploading…" : "Upload photograph"}<input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={async e => {
                const file = e.target.files?.[0], id = active.id; if (!file) return; setUploading(true);
                try { const result = await uploadToCloudinary(file, "page-sections", "image"); setRows(previous => previous.map(s => s.id === id ? { ...s, image: result.url } : s)); setDirty(true); }
                catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } finally { setUploading(false); }
              }} /></label>
              <label className="block text-sm">Image description<input aria-label="Image description" className="block w-full mt-2 border border-input bg-background rounded-md p-2" value={active.alt ?? ""} onChange={e => patch({ alt: e.target.value })} /></label>
            </>}
          </> : <p className="text-muted-foreground text-sm">Existing content is managed in its corresponding admin section.</p>}
        </div>}
      </div>
      <div className="min-w-0"><h3 className="text-sm font-semibold mb-3">Live preview</h3>{source ? <iframe key={source} ref={frame} src={source} title="Storefront page preview" onLoad={sendPreview} className="w-full h-[850px] border border-border rounded-md bg-background" /> : <p className="text-muted-foreground">No published sofas available to preview.</p>}</div>
    </div>
  </div>;
}