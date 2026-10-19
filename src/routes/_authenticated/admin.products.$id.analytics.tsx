import { AdminBackLink } from "@/components/admin/back-link";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FiRefreshCw, FiArrowUpRight, FiDownload, FiEye, FiShoppingCart, FiBox, FiTrendingUp } from "react-icons/fi";
import { getProductAnalytics } from "@/lib/admin-data.functions";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ProductTrend, AudienceChart } from "@/components/admin/product-analytics-charts";
import type { AnalyticsRange } from "@/lib/product-analytics";

export const Route = createFileRoute("/_authenticated/admin/products/$id/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Product analytics — Admin · True Furniture's" },
      { name: "description", content: "Performance of a single True Furniture's sofa: views, cart adds, orders and conversion." },
      { property: "og:title", content: "Product Analytics — True Furniture's Admin" },
      { property: "og:description", content: "Views, cart adds, orders, revenue and conversion for one product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductAnalytics,
});


const RANGES = [{ id: "7d", label: "7 days" }, { id: "30d", label: "30 days" }, { id: "12m", label: "12 months" }] as const;

function Metric({ label, value, note, icon }: { label: string; value: string | number; note: string; icon: React.ReactNode }) {
  return <div className="tf-analytics-panel p-5 transition-colors hover:border-analytics-gold/60">
    <div className="flex items-center justify-between gap-2 text-xs text-analytics-muted"><span>{label}</span><span className="text-analytics-gold">{icon}</span></div>
    <div className="mt-3 break-words text-2xl font-semibold tabular-nums">{value}</div><p className="mt-2 text-xs text-analytics-muted">{note}</p>
  </div>;
}

function ProductAnalytics() {
  const { id } = Route.useParams();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const load = useServerFn(getProductAnalytics);
  const { data, isPending, isFetching, refetch, error } = useQuery({
    queryKey: ["product-analytics", id, range], queryFn: () => load({ data: { productId: id, range } }),
    staleTime: 10_000, retry: 1, refetchInterval: 30_000, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const exportData = () => {
    if (!data) return;
    const csv = "Date,Product views,Cart additions,Checkouts,Revenue INR\n" + data.series.map(p => [p.label, p.views, p.carts, p.orders, p.revenue].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `${data.product.slug || id}-${range}-analytics.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="tf-analytics min-h-screen bg-analytics-canvas p-4 text-analytics-text sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminBackLink label="← Products" fallbackPanel="products" />
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-analytics-border pb-6">
        <div className="flex min-w-0 items-center gap-4">
          {data?.product.hero_image && <img src={data.product.hero_image} alt={data.product.name} className="h-16 w-16 shrink-0 rounded-md bg-analytics-field object-cover" />}
          <div className="min-w-0"><p className="mb-1 text-xs text-analytics-gold">Product performance</p><h1 className="break-words text-2xl font-semibold">{data?.product.name ?? "Product analytics"}</h1><p className="mt-2 text-xs text-analytics-muted">{data ? `${formatDate(data.period.from)} – ${formatDate(data.period.to)} · Updated ${new Date(data.updatedAt).toLocaleTimeString("en-IN")}` : "Loading saved activity…"}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-analytics-border bg-analytics-field p-1">{RANGES.map(r => <Button key={r.id} size="sm" variant="ghost" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={range === r.id ? "bg-analytics-surface text-analytics-gold" : "text-analytics-muted"}>{r.label}</Button>)}</div>
          <Button variant="ghost" size="icon" title="Refresh analytics" aria-label="Refresh analytics" onClick={() => void refetch()} disabled={isFetching} className="border border-analytics-border text-analytics-muted"><FiRefreshCw className={isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
          <Button variant="ghost" size="icon" title="Download analytics CSV" aria-label="Download analytics CSV" onClick={exportData} disabled={!data} className="border border-analytics-border text-analytics-muted"><FiDownload /></Button>
        </div>
      </header>
      {error && <div role="alert" className="rounded-md border border-analytics-danger/40 bg-analytics-surface p-4 text-sm text-analytics-danger">{data ? "Refresh failed. Showing the last successful results." : "Analytics are unavailable — this is not a zero-activity result."}<div className="mt-2 text-xs">Please refresh. If this continues, sign out and sign in again.</div></div>}
      {isPending && !error && <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="tf-analytics-panel h-36 animate-pulse motion-reduce:animate-none" />)}<span className="sr-only">Loading analytics</span></div>}
      {data && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Product views" value={data.totals.views} note={`${data.totals.uniqueViewers} tracked viewing sessions`} icon={<FiEye />} />
          <Metric label="Cart additions" value={data.totals.addToCart} note={`${data.totals.cartSessions} tracked cart sessions`} icon={<FiShoppingCart />} />
          <Metric label="Checkouts" value={data.totals.orders} note="Excludes cancelled / refunded" icon={<FiBox />} />
          <Metric label="Revenue" value={formatINR(data.totals.revenue)} note="Valid orders in selected period" icon={<FiTrendingUp />} />
          <Metric label="Listing impressions" value={data.totals.impressions} note="Seen in product listings" icon={<FiEye />} />
          <Metric label="3D views" value={data.totals.views3d} note="Opened the customiser" icon={<FiBox />} />
          <Metric label="Active customer carts" value={data.totals.activeCarts} note={`${data.totals.cartUnits} units currently waiting · all time`} icon={<FiShoppingCart />} />
          <Metric label="View → checkout" value={`${data.conversion.viewToOrder}%`} note="Matching tracked sessions only" icon={<FiTrendingUp />} />
        </div>
        <ProductTrend series={data.series} />
        <section className="border-y border-analytics-border py-5"><h2 className="mb-4 text-sm font-semibold">Session conversion</h2><div className="grid gap-5 sm:grid-cols-3">{[["View → cart", data.conversion.viewToCart, "text-analytics-gold"], ["Cart → checkout", data.conversion.cartToOrder, "text-analytics-blue"], ["View → checkout", data.conversion.viewToOrder, "text-analytics-green"]].map(([label, value, color]) => <div key={String(label)}><p className="text-xs text-analytics-muted">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}%</p></div>)}</div><p className="mt-4 text-xs text-analytics-muted">Attributed to matching session IDs; older orders without session links remain included in checkouts and revenue.</p></section>
        <div className="grid gap-4 lg:grid-cols-2"><AudienceChart title="Devices · product views" rows={data.devices} /><AudienceChart title="Browsers · product views" rows={data.browsers} color="var(--analytics-gold)" /></div>
        <div className="grid gap-6 lg:grid-cols-2">{([{ title: "Cities", rows: data.cities }, { title: "Top product pages", rows: data.pages }]).map(group => <section key={group.title} className="min-w-0"><h2 className="mb-3 text-sm font-semibold">{group.title}</h2>{!group.rows.length ? <p className="py-4 text-xs text-analytics-muted">No location data recorded in this period</p> : group.rows.map(([name, count]) => <div key={name} className="flex justify-between gap-4 border-b border-analytics-border py-3 text-xs"><span className="min-w-0 break-all text-analytics-muted">{name}</span><strong>{count}</strong></div>)}</section>)}</div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="ghost" className="border border-analytics-border text-analytics-gold"><Link to="/admin/products/$id/orders" params={{ id }}>Product orders <FiArrowUpRight /></Link></Button><Button asChild variant="ghost" className="border border-analytics-border text-analytics-gold"><Link to="/admin/products/$id/carts" params={{ id }}>Cart holders <FiArrowUpRight /></Link></Button><Button asChild variant="ghost" className="text-analytics-muted"><Link to="/admin/products/compare">Compare sofas <FiArrowUpRight /></Link></Button></div>
        <section><h2 className="mb-4 text-sm font-semibold">Recent activity</h2>{!data.recent.length ? <p className="text-xs text-analytics-muted">No recorded activity in this date range.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-analytics-muted"><tr><th className="pb-3 font-medium">Event</th><th className="pb-3 font-medium">Page / location</th><th className="pb-3 text-right font-medium">Date</th></tr></thead><tbody>{data.recent.map((r, i) => <tr key={`${r.time}-${i}`} className="border-t border-analytics-border transition-colors hover:bg-analytics-field"><td className="whitespace-nowrap py-3 pr-4 capitalize">{r.type.replace(/_/g, " ")}</td><td className="min-w-40 break-all py-3 pr-4 text-analytics-muted">{r.page || "—"}{r.city ? ` · ${r.city}` : ""}</td><td className="whitespace-nowrap py-3 text-right text-analytics-muted">{formatDate(r.time)}</td></tr>)}</tbody></table></div>}</section>
      </>}
    </div>
  </main>;
}
