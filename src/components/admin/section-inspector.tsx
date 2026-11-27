import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/upload";
import { safeImage, type PageSection } from "@/lib/page-layout";
import { toast } from "sonner";

export function EditorField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const classes = "block w-full mt-1.5 border border-input bg-background rounded-md p-2 text-sm";
  return <label className="block text-sm">{label}{multiline ? <textarea aria-label={label} rows={3} className={classes} value={value} onChange={e => onChange(e.target.value)} /> : <input aria-label={label} className={classes} value={value} onChange={e => onChange(e.target.value)} />}</label>;
}

export function SectionInspector({ section, image, onChange, onUploading }: {
  section: PageSection; image: { key: string; src: string; alt: string } | null;
  onChange: (values: Partial<PageSection>) => void; onUploading: (value: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const key = image?.key ?? "main";
  const source = section.type === "image" ? section.image ?? "" : section.images?.[key] ?? image?.src ?? "";
  const updateImage = (url: string) => {
    if (url && !safeImage(url)) { toast.error("Use an HTTPS image URL or a site image path."); return; }
    onChange(section.type === "image" ? { image: url } : { images: { ...section.images, [key]: url } });
  };
  const style = section.style ?? { spacing: "default", background: "default", alignment: "left" };
  const hero = section.heroSlides?.[slide] ?? {};
  const heroPatch = (values: Partial<typeof hero>) => {
    const next = Array.from({ length: 4 }, (_, i) => ({ ...section.heroSlides?.[i] }));
    next[slide] = { ...hero, ...values }; onChange({ heroSlides: next });
  };
  return <div className="space-y-4">
    {section.type === "hero" && <label className="block text-sm">Slide<select aria-label="Hero slide to edit" value={slide} onChange={e => setSlide(Number(e.target.value))} className="block mt-2 w-full border border-input bg-background p-2 rounded-md">{[0, 1, 2, 3].map(i => <option key={i} value={i}>Slide {i + 1}</option>)}</select></label>}
    {(section.type !== "main" || section.type === "hero") && <>
      <EditorField label="Eyebrow" value={section.type === "hero" ? hero.eyebrow ?? "" : section.eyebrow ?? ""} onChange={eyebrow => section.type === "hero" ? heroPatch({ eyebrow }) : onChange({ eyebrow })} />
      <EditorField label="Heading" value={section.type === "hero" ? hero.title ?? "" : section.title ?? ""} onChange={title => section.type === "hero" ? heroPatch({ title }) : onChange({ title })} />
      {section.type === "hero" && <EditorField label="Italic heading" value={hero.italic ?? ""} onChange={italic => heroPatch({ italic })} />}
      <EditorField label="Text" multiline value={section.type === "hero" ? hero.body ?? "" : section.body ?? ""} onChange={body => section.type === "hero" ? heroPatch({ body }) : onChange({ body })} />
    </>}
    {(image || section.type === "image") && <div className="space-y-3 border-t border-border pt-4">
      {source && <img src={source} alt="Selected photograph" className="w-full aspect-video object-contain bg-muted" />}
      <EditorField key={`${section.id}-${key}`} label="Image URL" value={source} onChange={updateImage} />
      <EditorField label="Image description" value={section.type === "image" ? section.alt ?? "" : section.imageAlts?.[key] ?? image?.alt ?? ""} onChange={alt => onChange(section.type === "image" ? { alt } : { imageAlts: { ...section.imageAlts, [key]: alt } })} />
      <Button asChild variant="outline" disabled={busy}><label className="cursor-pointer"><Upload />{busy ? "Uploading…" : "Upload image"}<input aria-label="Upload selected image" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("Choose a JPG, PNG or WebP image up to 5 MB."); return; }
        setBusy(true); onUploading(true);
        try { const result = await uploadToCloudinary(file, "page-sections", "image"); updateImage(result.url); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
        finally { setBusy(false); onUploading(false); }
      }} /></label></Button>
    </div>}
    {section.type !== "main" && <div className="space-y-3 border-t border-border pt-4">
      <EditorField label="Primary button text" value={section.type === "hero" ? hero.buttonLabel ?? "" : section.buttonLabel ?? ""} onChange={buttonLabel => section.type === "hero" ? heroPatch({ buttonLabel }) : onChange({ buttonLabel })} />
      <EditorField label="Primary button link" value={section.type === "hero" ? hero.buttonUrl ?? "" : section.buttonUrl ?? ""} onChange={buttonUrl => section.type === "hero" ? heroPatch({ buttonUrl }) : onChange({ buttonUrl })} />
      {(section.buttons ?? []).map((button, index) => <div key={button.id} className="space-y-2 border-b border-border pb-3">
        <EditorField label={`Button ${index + 1} text`} value={button.label} onChange={label => onChange({ buttons: section.buttons?.map(b => b.id === button.id ? { ...b, label } : b) ?? [] })} />
        <EditorField label={`Button ${index + 1} link`} value={button.url} onChange={url => onChange({ buttons: section.buttons?.map(b => b.id === button.id ? { ...b, url } : b) ?? [] })} />
        <Button size="icon" variant="ghost" title="Remove button" aria-label={`Remove button ${index + 1}`} onClick={() => onChange({ buttons: section.buttons?.filter(b => b.id !== button.id) ?? [] })}><Trash2 /></Button>
      </div>)}
      <Button variant="outline" disabled={(section.buttons?.length ?? 0) >= 8} onClick={() => onChange({ buttons: [...section.buttons ?? [], { id: crypto.randomUUID(), label: "Explore sofas", url: "/collections" }] })}><Plus />Add button</Button>
    </div>}
    <div className="grid grid-cols-1 gap-3 border-t border-border pt-4">
      <label className="text-sm">Spacing<select aria-label="Section spacing" className="block w-full border border-input bg-background p-2 mt-2 rounded-md" value={style.spacing} onChange={e => { const spacing = e.target.value; if (spacing === "compact" || spacing === "default" || spacing === "spacious") onChange({ style: { ...style, spacing } }); }}><option value="compact">Compact</option><option value="default">Default</option><option value="spacious">Spacious</option></select></label>
      <label className="text-sm">Background<select aria-label="Section background" className="block w-full border border-input bg-background p-2 mt-2 rounded-md" value={style.background} onChange={e => { const background = e.target.value; if (background === "default" || background === "surface" || background === "muted") onChange({ style: { ...style, background } }); }}><option value="default">Original</option><option value="surface">Surface</option><option value="muted">Muted</option></select></label>
      <label className="text-sm">Alignment<select aria-label="Section alignment" className="block w-full border border-input bg-background p-2 mt-2 rounded-md" value={style.alignment} onChange={e => onChange({ style: { ...style, alignment: e.target.value === "center" ? "center" : "left" } })}><option value="left">Left</option><option value="center">Center</option></select></label>
    </div>
  </div>;
}