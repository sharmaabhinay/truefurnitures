import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Monitor, Tablet, Smartphone, RefreshCw, Download, Save } from "lucide-react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VideoInput } from "./video-input";
import { getVideoAnalytics } from "@/lib/admin-data.functions";
import { saveVideoSettings } from "@/lib/video-settings.functions";
import { useVideoSettings, videoSettingsKey } from "@/lib/use-video-settings";
import { videoEnabled, videoId, type VideoSettings } from "@/lib/video-settings";
import { useBrand } from "@/lib/brand";
import { downloadCsv } from "@/lib/export";
import { toast } from "sonner";
import showcase from "@/assets/sofa-living-room.mp4.asset.json";

export function VideoManager() {
  const settings = useVideoSettings(); const brand = useBrand(); const qc = useQueryClient();
  const save = useServerFn(saveVideoSettings); const read = useServerFn(getVideoAnalytics);
  const [draft, setDraft] = useState<VideoSettings | null>(null);
  const [busy, setBusy] = useState(false); const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [days, setDays] = useState<7 | 30 | 90>(30); const [selected, setSelected] = useState("all");
  const report = useQuery({ queryKey: ["video-report", days], queryFn: () => read({ data: { days } }), staleTime: 60000, refetchOnWindowFocus: false });
  useEffect(() => { if (settings.data) setDraft(p => p ?? settings.data); }, [settings.data]);
  const current = draft ?? settings.data ?? { disabled: [] };
  const inventory = useMemo(() => {
    const rows = [
      { name: "Hero · Desktop", url: current.heroDesktop ?? brand.hero_video ?? "" },
      { name: "Hero · Tablet", url: current.heroTablet ?? brand.hero_video_tablet ?? "" },
      { name: "Hero · Mobile", url: current.heroMobile ?? brand.hero_video_mobile ?? "" },
      { name: "Hero · Slide four", url: showcase.url },
      ...(report.data?.products ?? []).flatMap(p => [{ name: `${p.name} · Product`, url: p.video }, { name: `${p.name} · Social`, url: p.social }]),
    ];
    const grouped = new Map<string, { id: string; name: string; url: string }>();
    for (const row of rows.filter(r => r.url)) { const id = videoId(row.url); const old = grouped.get(id); grouped.set(id, { id, url: row.url, name: old ? `${old.name}, ${row.name}` : row.name }); }
    for (const event of report.data?.events ?? []) if (!grouped.has(event.videoId)) grouped.set(event.videoId, { id: event.videoId, name: `Previously posted · ${event.videoId}`, url: "" });
    return [...grouped.values()];
  }, [current, brand, report.data]);
  const events = (report.data?.events ?? []).filter(e => selected === "all" || e.videoId === selected);
  const trend = useMemo(() => {
    const rows = new Map<string, { day: string; plays: number; embeds: number }>();
    for (let i = days - 1; i >= 0; i--) { const date = new Date(); date.setUTCDate(date.getUTCDate() - i); const day = date.toISOString().slice(0, 10); rows.set(day, { day, plays: 0, embeds: 0 }); }
    for (const event of events) { const row = rows.get(event.time.slice(0, 10)); if (row) event.type === "video_play" ? row.plays++ : row.embeds++; }
    return [...rows.values()];
  }, [report.data, days, selected]);
  async function persist(value: VideoSettings) {
    setBusy(true);
    try { const saved = await save({ data: value }); setDraft(saved); qc.setQueryData(videoSettingsKey, saved); toast.success("Video settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Video settings could not be saved"); }
    finally { setBusy(false); }
  }
  const stats = inventory.map(v => ({ video: v.name, id: v.id, plays: (report.data?.events ?? []).filter(e => e.videoId === v.id && e.type === "video_play").length, embeds: (report.data?.events ?? []).filter(e => e.videoId === v.id && e.type === "video_embed").length }));
  return <div className="bg-background text-foreground rounded-md p-4 sm:p-6 space-y-8">
    <section className="space-y-5"><h2 className="text-xl font-semibold">Hero videos</h2>
      {settings.isPending ? <p role="status">Loading video settings…</p> : settings.error ? <p role="alert">Video settings could not be loaded. <Button variant="outline" onClick={() => void settings.refetch()}>Retry</Button></p> : <>
        <div className="grid gap-6 lg:grid-cols-3">{([
          { key: "heroDesktop", label: "Desktop · 16:9", Icon: Monitor, fallback: brand.hero_video },
          { key: "heroTablet", label: "Tablet · 4:3", Icon: Tablet, fallback: brand.hero_video_tablet },
          { key: "heroMobile", label: "Mobile · 9:16", Icon: Smartphone, fallback: brand.hero_video_mobile },
        ] as const).map(({ key, label, Icon, fallback }) => <div key={key} className="min-w-0 space-y-3"><Icon className="size-5 text-primary" /><VideoInput value={current[key] ?? fallback ?? ""} onChange={url => setDraft({ ...current, [key]: url })} label={label} folder="page-sections/hero-video" onBusyChange={value => setUploads(p => ({ ...p, [key]: value }))} /></div>)}</div>
        <Button disabled={busy || Object.values(uploads).some(Boolean)} onClick={() => void persist(current)}><Save className="size-4" />{busy ? "Saving…" : "Save hero videos"}</Button>
      </>}
    </section>
    <section className="tf-analytics space-y-5 text-analytics-text border-t border-analytics-border pt-6">
      <header className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Video insights</h2><div className="flex flex-wrap gap-2">{([7, 30, 90] as const).map(n => <Button variant={n === days ? "default" : "outline"} key={n} onClick={() => setDays(n)}>{n} days</Button>)}<Button variant="outline" size="icon" aria-label="Refresh video insights" disabled={report.isFetching} onClick={() => void report.refetch()}><RefreshCw /></Button><Button variant="outline" disabled={!report.data || !!report.error} onClick={() => downloadCsv("video-insights", stats)}><Download className="size-4" />Export</Button></div></header>
      {report.isPending ? <p role="status">Loading video activity…</p> : report.error ? <p role="alert" className="text-analytics-danger">Video insights could not be loaded. This is not a zero-activity result.</p> : <>
        {report.data?.staleSince && <p role="status">Showing last-good data from {new Date(report.data.staleSince).toLocaleString()}.</p>}
        <div className="grid grid-cols-3 gap-3">{[{ label: "Recorded plays", value: events.filter(e => e.type === "video_play").length }, { label: "Social embeds displayed", value: events.filter(e => e.type === "video_embed").length }, { label: "Viewing visits", value: new Set(events.map(e => e.session).filter(Boolean)).size }].map(m => <div key={m.label} className="tf-analytics-panel p-3"><p className="text-xs text-analytics-muted">{m.label}</p><p className="text-2xl font-semibold mt-2">{m.value}</p></div>)}</div>
        <label className="block text-sm space-y-2"><span>Video</span><select className="w-full rounded-md border border-analytics-border bg-analytics-field p-2" value={selected} onChange={e => setSelected(e.target.value)}><option value="all">All videos</option>{inventory.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid stroke="var(--analytics-border)" strokeDasharray="3 3" /><XAxis dataKey="day" minTickGap={45} /><YAxis allowDecimals={false} /><Tooltip contentStyle={{ background: "var(--analytics-surface)", borderColor: "var(--analytics-border)" }} /><Line name="Recorded plays" dataKey="plays" stroke="var(--analytics-green)" strokeWidth={2} dot={false} /><Line name="Social embeds displayed" dataKey="embeds" stroke="var(--analytics-blue)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-analytics-border"><th className="py-3">Video / placement</th><th className="p-3">Plays</th><th className="p-3">Embeds</th><th className="p-3">Enabled</th></tr></thead><tbody>{inventory.map((v, i) => <tr key={v.id} className="border-b border-analytics-border"><td className="py-4 min-w-40 max-w-80 break-words">{v.name}</td><td className="p-3">{stats[i]?.plays}</td><td className="p-3">{stats[i]?.embeds}</td><td className="p-3"><Switch aria-label={`Enable ${v.name}`} disabled={busy || !settings.data} checked={videoEnabled(current, v.url || v.id)} onCheckedChange={on => { const disabled = on ? current.disabled.filter(id => id !== v.id) : [...new Set([...current.disabled, v.id])]; void persist({ ...current, disabled }); }} /></td></tr>)}</tbody></table></div>
        {!events.length && <p className="text-sm text-analytics-muted">No recorded video activity in this period.</p>}
        <p className="text-xs text-analytics-muted">Plays count actual uploaded-video playback once per appearance, not every loop. Social embeds are displayed previews, not confirmed watches. Instagram controls autoplay and looping; upload the original video for reliable silent looping. History starts with this update; automated tests and admin previews are excluded.</p>
      </>}
    </section>
  </div>;
}