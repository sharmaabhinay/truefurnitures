import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CTA_SETTINGS_KEY, ctaSettingsSchema, DEFAULT_CTA_SETTINGS, type CtaSettings } from "@/lib/cta-settings";
import { getCtaSettings, saveCtaSettings } from "@/lib/cta-settings.functions";

export function CtaSettingsPanel() {
  const read = useServerFn(getCtaSettings);
  const save = useServerFn(saveCtaSettings);
  const client = useQueryClient();
  const query = useQuery({ queryKey: CTA_SETTINGS_KEY, queryFn: () => read() });
  const [draft, setDraft] = useState<CtaSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (query.data && !draft) setDraft(query.data); }, [query.data, draft]);
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading button settings…</p>;
  if (query.error || !draft) return <div role="alert" className="flex gap-3 items-center"><p className="text-sm text-destructive">Button settings could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>;
  const set = <K extends keyof CtaSettings>(k: K, v: CtaSettings[K]) => setDraft({ ...draft, [k]: v });
  const num = (k: "showSeconds" | "intervalSeconds" | "initialDelaySeconds", label: string, min: number, max: number) =>
    <div className="space-y-1.5"><Label htmlFor={`cta-${k}`}>{label}</Label>
      <Input id={`cta-${k}`} type="number" min={min} max={max} value={draft[k]} onChange={e => set(k, Number(e.target.value))} /></div>;
  async function submit() {
    const clean = { ...draft!, questions: draft!.questions.map(q => q.trim()).filter(Boolean) };
    const parsed = ctaSettingsSchema.safeParse(clean);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check the values"); return; }
    if (clean.phone && !/^[1-9]\d{7,14}$/.test(clean.phone.replace(/\D/g, ""))) { toast.error("Enter a WhatsApp number with country code, e.g. +91 98765 43210"); return; }
    setSaving(true);
    try {
      const saved = await save({ data: parsed.data });
      client.setQueryData(CTA_SETTINGS_KEY, saved); setDraft(saved);
      toast.success("WhatsApp button saved");
    } catch { toast.error("Could not save. Please try again."); } finally { setSaving(false); }
  }
  return <section className="space-y-5 border-b border-border pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Button settings</h2><p className="text-sm text-muted-foreground">Changes go live for customers after you save.</p></div>
      <label className="flex items-center gap-3 text-sm font-medium" htmlFor="cta-enabled">{draft.enabled ? "Button shown" : "Button hidden"}
        <Switch id="cta-enabled" checked={draft.enabled} onCheckedChange={v => set("enabled", v)} /></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="cta-phone">WhatsApp number</Label>
        <Input id="cta-phone" placeholder="Leave empty to use the store number" value={draft.phone} onChange={e => set("phone", e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cta-message">Prefilled chat message</Label>
        <Textarea id="cta-message" rows={2} value={draft.message} onChange={e => set("message", e.target.value)} /></div>
      {num("initialDelaySeconds", "First message after (seconds)", 0, 60)}
      {num("showSeconds", "Text visible for (seconds)", 2, 60)}
      {num("intervalSeconds", "New question every (seconds)", 4, 120)}
    </div>
    <div className="space-y-2">
      <Label>Suggested questions (shown in turn)</Label>
      {draft.questions.map((q, i) => <div key={i} className="flex gap-2">
        <Input aria-label={`Question ${i + 1}`} maxLength={80} value={q} onChange={e => set("questions", draft.questions.map((x, j) => j === i ? e.target.value : x))} />
        <Button variant="outline" size="icon" aria-label={`Remove question ${i + 1}`} disabled={draft.questions.length <= 1} onClick={() => set("questions", draft.questions.filter((_, j) => j !== i))}><Trash2 /></Button>
      </div>)}
      <Button variant="outline" disabled={draft.questions.length >= 12} onClick={() => set("questions", [...draft.questions, ""])}><Plus />Add question</Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => void submit()} disabled={saving}>{saving ? "Saving…" : "Save button"}</Button>
      <Button variant="outline" onClick={() => setDraft(query.data!)} disabled={saving}>Discard changes</Button>
      <Button variant="ghost" onClick={() => setDraft(DEFAULT_CTA_SETTINGS)} disabled={saving}>Restore defaults</Button>
    </div>
  </section>;
}
