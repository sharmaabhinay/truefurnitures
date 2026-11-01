import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAiUsage } from "@/lib/ai-usage.functions";
import { AI_TOOLS, summarizeAiUsage } from "@/lib/ai-usage";
import { downloadCsv } from "@/lib/export";

export function AiUsage() {
  const read = useServerFn(getAiUsage);
  const [days, setDays] = useState<7 | 30 | 365>(30), [search, setSearch] = useState(""), [person, setPerson] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["ai-usage", days], queryFn: () => read({ data: { days } }), staleTime: 60000 });
  const report = useMemo(() => summarizeAiUsage(query.data ?? []), [query.data]);
  const people = report.people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="bg-background text-foreground p-4 sm:p-6 space-y-6 rounded-md">
    <div className="flex flex-wrap justify-between gap-3"><div className="flex gap-2">{([7, 30, 365] as const).map(n => <Button key={n} variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n === 365 ? "12 months" : `${n} days`}</Button>)}</div><div className="flex gap-2"><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw />Refresh</Button><Button variant="outline" disabled={!report.people.length} onClick={() => downloadCsv("ai-usage", report.people.map(p => ({ name: p.name, role: p.role, uses: p.attempts, minutes: (p.seconds / 60).toFixed(2), ...p.tools, last_used: p.last })))}><Download />Export</Button></div></div>
    {query.isPending ? <p>Loading AI usage…</p> : query.error ? <p role="alert" className="text-destructive">AI usage could not be loaded. Please refresh.</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Requests", report.total.attempts], ["People", report.total.users], ["Total hours", (report.total.seconds / 3600).toFixed(2)], ["Avg minutes / session", (report.total.seconds / Math.max(1, report.total.sessions) / 60).toFixed(2)], ["Failed / not connected", `${report.total.failures} / ${report.total.blocked}`]].map(([label, value]) => <div key={label} className="border border-border rounded-md p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-2">{value}</p></div>)}</div>
      {!report.total.attempts && <p className="text-muted-foreground">No AI requests recorded in this period.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{report.tools.map(t => <div key={t.task} className="border border-border p-4 rounded-md"><h3 className="font-semibold">{t.name}</h3><dl className="text-sm mt-3 space-y-2"><div>Requests: {t.attempts} · People: {t.users}</div><div>Minutes: {(t.seconds / 60).toFixed(2)}</div><div>Completed: {t.successes} · Failed: {t.failures} · Not connected: {t.blocked}</div></dl></div>)}</div>
      <section><h3 className="font-semibold mb-4">Requests over time</h3><div className="h-72 w-full"><ResponsiveContainer><LineChart data={report.days}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="day" stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" /><Tooltip contentStyle={{ background: "var(--background)", color: "var(--foreground)", borderColor: "var(--border)" }} />{Object.entries(AI_TOOLS).map(([task, label], i) => <Line key={task} dataKey={task} name={label} stroke={`var(--chart-${i + 1})`} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div></section>
      <section><h3 className="font-semibold mb-3">Usage by person</h3><input aria-label="Search AI users" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…" className="border border-input bg-background rounded-md p-2 mb-3 w-full sm:max-w-xs" /><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-border">{["Person", "Role", ...Object.values(AI_TOOLS), "Minutes", "Last used"].map(h => <th className="p-3 whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{people.map(p => <tr key={p.id} className="border-b border-border"><td className="p-3"><Button variant="link" onClick={() => setPerson(person === p.id ? null : p.id)}>{p.name}</Button></td><td className="p-3">{p.role}</td>{Object.keys(AI_TOOLS).map(t => <td key={t} className="p-3">{p.tools[t]}</td>)}<td className="p-3">{(p.seconds / 60).toFixed(2)}</td><td className="p-3 whitespace-nowrap">{new Date(p.last).toLocaleString()}</td></tr>)}</tbody></table></div></section>
      {person && <section className="border-t border-border pt-4"><h3 className="font-semibold mb-3">Selected person’s sessions</h3>{query.data?.filter(r => r.user_id === person && r.attempts > 0).map(r => <div className="flex flex-wrap gap-4 border-b border-border py-3 text-sm" key={r.id}><span>{AI_TOOLS[r.task]}</span><span>{new Date(r.started_at).toLocaleString()}</span><span>{r.attempts} requests · {(r.seconds / 60).toFixed(2)} minutes</span><span>{r.successes} completed / {r.failures} failed / {r.blocked} not connected</span></div>)}</section>}
      <p className="text-xs text-muted-foreground">Recorded from now onward. Time is measured while the tool is open and active, ending after two idle minutes. Guests are separate anonymous browser sessions. Missing-key attempts are not completed AI answers.</p>
    </>}
  </div>;
}
