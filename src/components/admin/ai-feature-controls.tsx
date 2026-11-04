import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AI_TOOLS } from "@/lib/ai-usage";
import { AI_FEATURES_KEY } from "@/lib/ai-features";
import { getAiFeatures, setAiFeature } from "@/lib/ai-features.functions";
import { isAdminAi, type AiInput } from "@/lib/ai-contract";

export function AiFeatureControls() {
  const read = useServerFn(getAiFeatures);
  const save = useServerFn(setAiFeature);
  const client = useQueryClient();
  const [saving, setSaving] = useState<AiInput["task"] | null>(null);
  const query = useQuery({ queryKey: AI_FEATURES_KEY, queryFn: () => read(), staleTime: 30_000 });
  async function toggle(task: AiInput["task"], enabled: boolean) {
    setSaving(task);
    try {
      const features = await save({ data: { task, enabled } });
      client.setQueryData(AI_FEATURES_KEY, features);
      toast.success(`${AI_TOOLS[task]} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("AI setting could not be saved. Please try again.");
      void query.refetch();
    } finally { setSaving(null); }
  }
  return <section className="space-y-3 border-b border-border pb-6">
    <h2 className="text-lg font-semibold">AI feature controls</h2>
    {query.isPending ? <p className="text-sm text-muted-foreground">Loading AI settings…</p> : query.error ? <div role="alert" className="flex flex-wrap items-center gap-3"><p className="text-sm text-destructive">AI settings could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> :
      <div className="grid gap-x-6 sm:grid-cols-2">{(Object.keys(AI_TOOLS) as AiInput["task"][]).map(task => <div key={task} className="flex min-w-0 items-center justify-between gap-4 border-b border-border py-4">
        <label htmlFor={`ai-feature-${task}`} className="min-w-0 cursor-pointer"><span className="block text-sm font-medium">{AI_TOOLS[task]}</span><span className="text-xs text-muted-foreground">{isAdminAi(task) ? "Admin" : "Customer"} · {saving === task ? "Saving…" : query.data?.[task] ? "Enabled" : "Disabled"}</span></label>
        <Switch id={`ai-feature-${task}`} aria-label={`Enable ${AI_TOOLS[task]}`} checked={query.data?.[task] ?? false} disabled={saving !== null || query.isFetching} onCheckedChange={enabled => void toggle(task, enabled)} />
      </div>)}</div>}
  </section>;
}