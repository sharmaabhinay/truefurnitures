import { useState } from "react";
import { CartesianGrid, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import type { AnalyticsPoint } from "@/lib/product-analytics";
import { formatINR } from "@/lib/format";

const colors = { views: "var(--analytics-gold)", carts: "var(--analytics-blue)", orders: "var(--analytics-green)", revenue: "var(--analytics-green)" };
const names = { views: "Product views", carts: "Cart additions", orders: "Checkouts", revenue: "Revenue" };
const dateLabel = (value: string) => new Date(`${value}${value.length === 7 ? "-01" : ""}T00:00:00Z`).toLocaleDateString("en-IN", { day: value.length === 7 ? undefined : "numeric", month: "short", timeZone: "UTC" });

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number | string; name?: string; color?: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return <div role="status" className="tf-analytics-panel min-w-44 p-3 text-xs shadow-lg">
    <div className="mb-3 font-semibold">{typeof label === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(label) ? new Date(`${label}${label.length === 7 ? "-01" : ""}T00:00:00Z`).toLocaleDateString("en-IN", { day: label.length === 7 ? undefined : "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : label}</div>
    {payload.map(p => <div key={p.dataKey} className="my-1.5 flex items-center justify-between gap-6"><span className="text-analytics-muted">{p.name}</span><strong>{p.dataKey === "revenue" ? formatINR(Number(p.value)) : p.value}</strong></div>)}
  </div>;
}

export function ProductTrend({ series }: { series: AnalyticsPoint[] }) {
  const [mode, setMode] = useState<"activity" | "revenue">("activity");
  const [visible, setVisible] = useState({ views: true, carts: true, orders: true });
  return <section className="tf-analytics-panel min-w-0 p-4 sm:p-6" aria-label="Performance trend">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold">Performance over time</h2><p className="mt-1 text-xs text-analytics-muted">{series.length === 12 ? "Monthly" : "Daily"} totals · UTC</p></div>
      <div className="flex gap-1 rounded-md bg-analytics-field p-1">{(["activity", "revenue"] as const).map(m => <Button key={m} size="sm" variant="ghost" aria-pressed={mode === m} onClick={() => setMode(m)} className={mode === m ? "bg-analytics-surface text-analytics-text" : "text-analytics-muted"}>{m === "activity" ? "Activity" : "Revenue"}</Button>)}</div>
    </div>
    {mode === "activity" && <div className="mb-4 flex flex-wrap gap-2">{(["views", "carts", "orders"] as const).map(key => <Button key={key} size="sm" variant="ghost" onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))} aria-pressed={visible[key]} className={`${visible[key] ? "opacity-100" : "opacity-40"} text-analytics-muted`}><span className={`h-2 w-2 rounded-full ${key === "views" ? "bg-analytics-gold" : key === "carts" ? "bg-analytics-blue" : "bg-analytics-green"}`} />{names[key]}</Button>)}</div>}
    <div className="h-72 w-full sm:h-80" data-testid="product-trend">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} accessibilityLayer margin={{ top: 12, right: 12, bottom: 4, left: -20 }}>
          <CartesianGrid stroke="var(--analytics-border)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="label" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={32} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={value => mode === "revenue" ? `₹${Number(value) / 1000}k` : String(value)} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--analytics-muted)", strokeDasharray: "4 4" }} />
          {mode === "revenue" ? <Area type="monotone" dataKey="revenue" name="Revenue" stroke={colors.revenue} fill={colors.revenue} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} /> : (["views", "carts", "orders"] as const).map(key => visible[key] && <Line key={key} type="monotone" dataKey={key} name={names[key]} stroke={colors[key]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: "var(--analytics-surface)", strokeWidth: 2 }} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}

export function AudienceChart({ title, rows, color = "var(--analytics-blue)" }: { title: string; rows: [string, number][]; color?: string }) {
  return <section className="tf-analytics-panel min-w-0 p-5"><h2 className="mb-4 text-sm font-semibold">{title}</h2>
    {!rows.length ? <div className="flex h-40 items-center justify-center text-xs text-analytics-muted">No product-view data in this period</div> : <div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={rows.map(([name, count]) => ({ name, count }))} margin={{ left: 0, right: 25 }} accessibilityLayer><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--analytics-field)" }} /><Bar name="Product views" dataKey="count" fill={color} radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
  </section>;
}