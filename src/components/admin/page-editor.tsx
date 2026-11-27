import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, Save, Trash2, RotateCcw, Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageEditorTabs } from "./page-editor-tabs";
import { COL, fsList, fsSet, where } from "@/lib/db/firestore";
import { defaults, moveSection, normalizeLayout, SECTION_LABELS, type PageKind, type PageSection } from "@/lib/page-layout";
import { fetchLayouts, layoutKey } from "@/components/page-sections";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { SiteContentEditor } from "./site-content-editor";
import { EditorField, SectionInspector } from "./section-inspector";
import { normalizeNavigation, normalizeHeaderCta, type NavigationItem, type HeaderCta } from "@/lib/site-navigation";
import { AiTool } from "@/components/ai-tool";
import { parsePageDesignProposal } from "@/lib/page-design-ai";

export function PageEditor() {
  const [tab, setTab] = useState<"home" | "product" | "hero" | "brand">("home");
  const [dirty, setDirty] = useState(false);
  const { isAdmin } = useAuth();
  if (!isAdmin) return <p className="text-muted-foreground">Only an Owner can edit storefront pages.</p>;
  return <Tabs value={tab} activationMode="manual" onValueChange={value => {
    if (value !== "home" && value !== "product" && value !== "hero" && value !== "brand") return;
    if (value === tab || (dirty && !window.confirm("Discard unsaved changes?"))) return;
    setDirty(false); setTab(value);
  }} className="min-w-0 space-y-5">
    <PageEditorTabs />
    <TabsContent value={tab} className="mt-0 min-w-0">
      {tab === "home" || tab === "product" ? <PageLayoutEditor key={tab} initialPage={tab} onDirtyChange={setDirty} /> : <SiteContentEditor key={tab} section={tab} onDirtyChange={setDirty} />}
    </TabsContent>
  </Tabs>;
}

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

function PageLayoutEditor({ initialPage, onDirtyChange }: { initialPage: PageKind; onDirtyChange: (dirty: boolean) => void }) {
  const { isAdmin } = useAuth();
  const client = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: layoutKey, queryFn: fetchLayouts });
  const { data: products = [] } = useQuery({ queryKey: ["editor-products"], queryFn: () => fsList<{ id: string; slug: string; name: string }>(COL.sofas, where("is_published", "==", true)) });
  const [page, setPage] = useState<PageKind>(initialPage);
  const [rows, setRows] = useState<PageSection[]>(defaults(initialPage));
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [addType, setAddType] = useState("text");
  const [productSlug, setProductSlug] = useState("");
  const [navigation, setNavigation] = useState<NavigationItem[]>(normalizeNavigation(null));
  const [headerCta, setHeaderCta] = useState<HeaderCta>(normalizeHeaderCta(null));
  const [editingHeader, setEditingHeader] = useState(false);
  const [image, setImage] = useState<{ key: string; src: string; alt: string } | null>(null);
  const [screen, setScreen] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const frame = useRef<HTMLIFrameElement>(null);
  const rowsRef = useRef(rows); rowsRef.current = rows;
  const pageRef = useRef(page); pageRef.current = page;
  const navRef = useRef(navigation); navRef.current = navigation;
  const ctaRef = useRef(headerCta); ctaRef.current = headerCta;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { if (!dirty && !isPending) { setRows(normalizeLayout(data?.[page], page)); setNavigation(normalizeNavigation(data?.navigation)); setHeaderCta(normalizeHeaderCta(data?.headerCta)); } }, [data, page, dirty, isPending]);
  const sendPreview = () => frame.current?.contentWindow?.postMessage({ kind: "tf-page-preview", page: pageRef.current, sections: rowsRef.current, navigation: navRef.current, headerCta: ctaRef.current }, window.location.origin);
  useEffect(() => { sendPreview(); }, [rows, page, navigation, headerCta]);
  useEffect(() => {
    const ready = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.kind === "tf-page-ready") sendPreview();
      if (e.data?.kind === "tf-editor-select") {
        setEditingHeader(e.data.node === "header");
        if (typeof e.data.sectionId === "string" && rowsRef.current.some(row => row.id === e.data.sectionId)) {
          setSelected(e.data.sectionId);
          setImage(typeof e.data.imageKey === "string" ? { key: e.data.imageKey, src: typeof e.data.imageSrc === "string" ? e.data.imageSrc : "", alt: typeof e.data.imageAlt === "string" ? e.data.imageAlt : "" } : null);
        } else { setSelected(null); setImage(null); }
      }
    };
    window.addEventListener("message", ready); return () => window.removeEventListener("message", ready);
  }, []);
  const change = (next: PageSection[]) => { setRows(next); setDirty(true); };
  const active = rows.find(s => s.id === selected);
  const patch = (values: Partial<PageSection>) => change(rows.map(s => s.id === selected ? { ...s, ...values } : s));
  const switchPage = (next: PageKind) => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false); setSelected(null); setImage(null); setEditingHeader(false); setPage(next); setRows(normalizeLayout(data?.[next], next));
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = async () => {
    setSaving(true);
    try {
      const cleanRows = normalizeLayout(rows, page);
      const cleanNav = normalizeNavigation(navigation);
      if (cleanNav.length !== navigation.length || cleanRows.some((row, i) => (row.buttons?.length ?? 0) !== (rows[i]?.buttons?.length ?? 0))) throw new Error("Check your button labels and links. Use HTTPS URLs or site paths beginning with /.");
      await fsSet(COL.siteSettings, "page-layouts", JSON.parse(JSON.stringify({ [page]: cleanRows, navigation: cleanNav, headerCta: normalizeHeaderCta(headerCta) })));
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
        <Button variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) { setDirty(false); setRows(normalizeLayout(data?.[page], page)); setNavigation(normalizeNavigation(data?.navigation)); setHeaderCta(normalizeHeaderCta(data?.headerCta)); } }} disabled={!dirty || saving}><RotateCcw />Discard</Button>
        <Button onClick={save} disabled={!dirty || saving || uploading}><Save />{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm">Page <select aria-label="Page to edit" value={page} onChange={e => switchPage(e.target.value as PageKind)} className="ml-2 border border-input rounded-md bg-background p-2"><option value="home">Home page</option><option value="product">Product pages</option></select></label>
      {page === "product" && <select aria-label="Product to preview" value={previewSlug ?? ""} onChange={e => setProductSlug(e.target.value)} className="border border-input rounded-md bg-background p-2 max-w-full">{products.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}</select>}
      <Button variant="ghost" onClick={() => { if (window.confirm("Restore default sections? Save changes to apply.")) change(defaults(page)); }}>Restore default sections</Button>
    </div>
    <div className="grid xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-6">
      <div className="space-y-4 min-w-0 xl:max-h-[850px] xl:overflow-y-auto xl:pr-2">
        <Button variant={editingHeader ? "secondary" : "outline"} className="w-full justify-start" onClick={() => { setEditingHeader(true); setSelected(null); frame.current?.contentWindow?.postMessage({ kind: "tf-editor-highlight", node: "header" }, window.location.origin); }}>Header & navigation</Button>
        {editingHeader && <div className="space-y-4 border-b border-border pb-5">
          <h3 className="font-semibold">Header & navigation</h3>
          {navigation.map((item, index) => <div key={item.id} className="space-y-2 border-b border-border pb-3">
            <EditorField label={`Navigation ${index + 1} label`} value={item.label} onChange={label => { setNavigation(navigation.map(n => n.id === item.id ? { ...n, label } : n)); setDirty(true); }} />
            <EditorField label={`Navigation ${index + 1} link`} value={item.url} onChange={url => { setNavigation(navigation.map(n => n.id === item.id ? { ...n, url } : n)); setDirty(true); }} />
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" title="Move link up" aria-label={`Move navigation ${index + 1} up`} disabled={index === 0} onClick={() => { const next = [...navigation]; const previous = next[index - 1]; if (!previous) return; next[index - 1] = item; next[index] = previous; setNavigation(next); setDirty(true); }}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" title="Move link down" aria-label={`Move navigation ${index + 1} down`} disabled={index === navigation.length - 1} onClick={() => { const next = [...navigation]; const following = next[index + 1]; if (!following) return; next[index + 1] = item; next[index] = following; setNavigation(next); setDirty(true); }}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" title={item.enabled ? "Hide link" : "Show link"} aria-label={`Toggle navigation ${index + 1}`} onClick={() => { setNavigation(navigation.map(n => n.id === item.id ? { ...n, enabled: !n.enabled } : n)); setDirty(true); }}>{item.enabled ? <Eye /> : <EyeOff />}</Button>
              <Button size="icon" variant="ghost" title="Remove link" aria-label={`Remove navigation ${index + 1}`} onClick={() => { setNavigation(navigation.filter(n => n.id !== item.id)); setDirty(true); }}><Trash2 /></Button>
            </div>
          </div>)}
          <Button variant="outline" disabled={navigation.length >= 12} onClick={() => { setNavigation([...navigation, { id: crypto.randomUUID(), label: "Track order", url: "/track-order", enabled: true }]); setDirty(true); }}><Plus />Add navigation link</Button>
          <EditorField label="Header button text" value={headerCta.label} onChange={label => { setHeaderCta({ ...headerCta, label }); setDirty(true); }} />
          <EditorField label="Header button link" value={headerCta.url} onChange={url => { setHeaderCta({ ...headerCta, url }); setDirty(true); }} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={headerCta.enabled} onChange={e => { setHeaderCta({ ...headerCta, enabled: e.target.checked }); setDirty(true); }} />Show header button</label>
        </div>}
        {active && !editingHeader && <div className="space-y-4 border-b border-border pb-5"><h3 className="font-semibold">{SECTION_LABELS[active.type]}</h3><SectionInspector key={active.id} section={active} image={image} onChange={patch} onUploading={setUploading} /></div>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active: a, over }) => { if (over) change(moveSection(rows, String(a.id), String(over.id))); }}>
          <SortableContext items={rows.map(s => s.id)} strategy={verticalListSortingStrategy}><ol className="space-y-2">{rows.map((s, i) => <SectionRow key={s.id} section={s} selected={selected === s.id} first={i === 0} last={i === rows.length - 1} onSelect={() => { setSelected(s.id); setImage(null); setEditingHeader(false); frame.current?.contentWindow?.postMessage({ kind: "tf-editor-highlight", sectionId: s.id }, window.location.origin); }} onMove={d => { const target = rows[i + d]; if (target) change(moveSection(rows, s.id, target.id)); }} onToggle={() => change(rows.map(r => r.id === s.id ? { ...r, enabled: !r.enabled } : r))} onRemove={() => { if (window.confirm("Remove this section from the page?")) change(rows.filter(r => r.id !== s.id)); }} />)}</ol></SortableContext>
        </DndContext>
        <div className="flex gap-2"><select aria-label="Section type" className="min-w-0 flex-1 border border-input rounded-md p-2 bg-background" value={addType} onChange={e => setAddType(e.target.value)}>{available.map(t => <option key={t} value={t}>{SECTION_LABELS[t]}</option>)}</select><Button onClick={() => { const id = crypto.randomUUID(); change([...rows, { id, type: addType, enabled: true }]); setSelected(id); }}><Plus />Add section</Button></div>
        <AiTool task="design" label="Design with AI" facts={JSON.stringify({ page, sections: rows, navigation, headerCta, allowedTypes: available })} onApply={raw => { try { const proposal = parsePageDesignProposal(raw, page); if (!window.confirm(`${proposal.summary}\nApply this proposal to your unsaved preview?`)) return; if (proposal.sections) setRows(proposal.sections); if (proposal.navigation) setNavigation(proposal.navigation); if (proposal.headerCta) setHeaderCta(proposal.headerCta); setDirty(true); } catch (error) { toast.error(error instanceof Error ? error.message : "The proposal could not be applied"); } }} />
      </div>
      <div className="min-w-0"><div className="flex items-center justify-between gap-2 mb-3"><h3 className="text-sm font-semibold">Live preview</h3><div className="flex gap-1" role="group" aria-label="Preview screen size">{([{ id: "desktop", Icon: Monitor }, { id: "tablet", Icon: Tablet }, { id: "mobile", Icon: Smartphone }] as const).map(({ id, Icon }) => <Button key={id} size="icon" variant={screen === id ? "secondary" : "ghost"} aria-label={`${id} preview`} title={`${id} preview`} aria-pressed={screen === id} onClick={() => setScreen(id)}><Icon /></Button>)}</div></div><div className="overflow-x-auto bg-muted/30">{source ? <iframe key={source} ref={frame} src={source} title="Storefront page preview" onLoad={sendPreview} className={`block mx-auto h-[850px] border border-border rounded-md bg-background ${screen === "mobile" ? "w-[375px] max-w-full" : screen === "tablet" ? "w-[768px] max-w-full" : "w-full"}`} /> : <p className="text-muted-foreground">No published sofas available to preview.</p>}</div></div>
    </div>
  </div>;
}