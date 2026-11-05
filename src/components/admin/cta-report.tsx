import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, RefreshCw, Eye, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCtaAnalytics } from "@/lib/admin-data.functions";
import { summarizeCta } from "@/lib/cta-analytics";
import { downloadCsv } from "@/lib/export";

export function CtaReport() {
  const [days, setDays] = useState<7 | 30 | 365>(30);
  const read = useServerFn(getCtaAnalytics);
  const query = useQuery({ queryKey: ["cta-report", days], queryFn: () => read({ data: { days } }), staleTime: 60000, refetchOnWindowFocus: false });
  const report = useMemo(() => summarizeCta(query.data?.events ?? [], days), [query.data, days]);
  return <div className="tf-analytics text-analytics-text space-y-6">
    <header className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-semibold">WhatsApp enquiry</h2><p className="text-sm text-analytics-muted mt-1">Customer call-to-action performance</p></div>
      <div className="flex flex-wrap gap-2">{([7, 30, 365] as const).map(n => <Button key={n} variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n === 365 ? "12 months" : `${n} days`}</Button>)}
        <Button variant="outline" size="icon" title="Refresh report" aria-label="Refresh report" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw /></Button>
        <Button variant="outline" disabled={!query.data || !!query.error} onClick={() => downloadCsv("whatsapp-cta", report.pages)}><Download />Export</Button>
      </div></header>
    {query.isPending ? <p role="status">Loading button activity…</p> : query.error ? <p role="alert" className="text-analytics-danger">Button activity could not be loaded. Please refresh — this is not a zero-activity result.</p> : <>
      {query.data?.staleSince && <p role="status" className="text-analytics-gold">Showing last saved data from {new Date(query.data.staleSince).toLocaleString()}. Refresh to retry.</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
        { label: "Button impressions", value: report.impressions, Icon: Eye },
        { label: "WhatsApp clicks", value: report.clicks, Icon: MousePointerClick },
        { label: "Clicking sessions", value: report.clickSessions, Icon: Users },
        { label: "Session click rate", value: `${report.rate.toFixed(1)}%`, Icon: TrendingUp },
      ].map(({ label, value, Icon }) => <div className="tf-analytics-panel p-4" key={label}><Icon className="text-analytics-gold size-5 mb-3" /><p className="text-xs text-analytics-muted">{label}</p><p className="text-2xl font-semibold mt-2">{value}</p></div>)}</div>
      {!report.impressions && !report.clicks && <p className="text-analytics-muted">No button activity recorded in this period.</p>}
      <section className="border-y border-analytics-border py-5"><h3 className="font-semibold mb-4">Visibility & clicks · UTC</h3><div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={report.trend}><CartesianGrid stroke="var(--analytics-border)" strokeDasharray="3 3" /><XAxis dataKey="name" minTickGap={40} /><YAxis allowDecimals={false} /><Tooltip contentStyle={{ background: "var(--analytics-surface)", color: "var(--analytics-text)", borderColor: "var(--analytics-border)" }} /><Legend /><Line name="Impressions" dataKey="impressions" stroke="var(--analytics-blue)" dot={false} strokeWidth={2} /><Line name="Clicks" dataKey="clicks" stroke="var(--analytics-green)" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>
      <section><h3 className="font-semibold mb-3">Activity by page</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-analytics-border"><th className="py-3">Page</th><th className="p-3">Impressions</th><th className="p-3">Clicks</th></tr></thead><tbody>{report.pages.map(p => <tr key={p.name} className="border-b border-analytics-border"><td className="py-3 break-all">{p.name}</td><td className="p-3">{p.impressions}</td><td className="p-3">{p.clicks}</td></tr>)}</tbody></table></div></section>
      <section><h3 className="font-semibold mb-3">Devices</h3><div className="flex flex-wrap gap-6 text-sm">{report.devices.map(d => <p key={d.name}>{d.name}: <strong>{d.clicks}</strong> clicks · {d.impressions} impressions</p>)}</div></section>
      <section><h3 className="font-semibold mb-3">Recent clicks</h3><div className="max-h-72 overflow-auto divide-y divide-analytics-border">{report.recent.map((e, i) => <div key={`${e.time}-${i}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="break-all">{e.page}</span><time className="text-analytics-muted">{new Date(e.time).toLocaleString()}</time></div>)}</div></section>
      <p className="text-xs text-analytics-muted">Impressions count once per page per browser session. Click rate is the share of exposed sessions that clicked in the selected period. A click opens WhatsApp; it does not confirm a sent message, enquiry, or purchase. Automated tests and local development are excluded.</p>
    </>}
  </div>;
}