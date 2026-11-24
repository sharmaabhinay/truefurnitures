import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiArrowRight, FiBarChart2, FiMapPin, FiPackage } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";

export type DashboardMetric = { label: string; value: string | number; icon: ReactNode; detail: string };
export type DashboardAction = { key: string; label: string; icon: ReactNode; onClick: () => void };
type RecentOrder = { id: string; order_number: string; created_at: string; delivery_city?: string | null; total: number; status: string; sofa_snapshot?: { name?: string } };

export function DashboardOverview({ metrics, days, locations, recent, actions, loading, error, onRetry, onOrders }: {
  metrics: DashboardMetric[];
  days: { label: string; count: number; iso: string }[];
  locations: [string, number][];
  recent: RecentOrder[];
  actions: DashboardAction[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOrders: () => void;
}) {
  const maxLocation = Math.max(1, ...locations.map(([, count]) => count));
  return (
    <section className="tf-dashboard" aria-label="Store overview" aria-busy={loading}>
      <div className="tf-dashboard-heading">
        <div><p className="tf-dashboard-eyebrow">YOUR STORE AT A GLANCE</p><h1>Store overview</h1><p className="tf-dashboard-subtitle">Orders, customers and the details that matter.</p></div>
        <Button onClick={onOrders} className="tf-admin-primary"><FiPackage /> Manage orders <FiArrowRight /></Button>
      </div>
      {error && <div role="alert" className="tf-dashboard-error"><span>Store data couldn’t be loaded. Your totals are unavailable.</span><Button variant="outline" onClick={onRetry}>Try again</Button></div>}
      <div className="tf-dashboard-metrics">
        {metrics.map((metric, index) => <article className="tf-dashboard-metric" data-tone={index % 4} key={metric.label}>
          <div className="tf-dashboard-metric-top"><span>{metric.label}</span><span className="tf-dashboard-metric-icon" aria-hidden="true">{metric.icon}</span></div>
          <div className="tf-dashboard-value">{loading || error ? "—" : metric.value}</div>
          <p>{loading ? "Loading…" : error ? "Unavailable" : metric.detail}</p>
        </article>)}
      </div>
      <div className="tf-dashboard-middle">
        <section className="tf-dashboard-section" aria-label="Order activity">
          <div className="tf-dashboard-section-title"><div><h2>Order activity</h2><p>Last 7 days</p></div><FiBarChart2 aria-hidden="true" /></div>
          {error || loading ? <div className="tf-dashboard-chart-empty">{loading ? "Loading activity…" : "Activity unavailable"}</div> : <div className="tf-dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 14, right: 12, left: -24, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--analytics-border)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--analytics-muted)", fontSize: 11 }} dy={8} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--analytics-muted)", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "var(--analytics-field)" }} content={({ active, payload, label }) => active && payload?.length ? <div className="tf-dashboard-tooltip"><strong>{label}</strong><p>{String(payload[0]?.value ?? 0)} orders</p></div> : null} />
                <Bar dataKey="count" name="Orders" fill="var(--analytics-gold)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            {days.every(day => day.count === 0) && <p className="tf-dashboard-chart-note">No orders in the last 7 days</p>}
          </div>}
        </section>
        <section className="tf-dashboard-section" aria-label="Quick actions"><div className="tf-dashboard-section-title"><div><h2>Quick actions</h2><p>Keep your store moving</p></div></div><div className="tf-dashboard-actions">
          {actions.map(action => <Button key={action.key} variant="ghost" onClick={action.onClick} className="tf-dashboard-action"><span aria-hidden="true">{action.icon}</span><span>{action.label}</span><FiArrowRight aria-hidden="true" /></Button>)}
        </div></section>
      </div>
      <section className="tf-dashboard-section tf-dashboard-recent" aria-label="Recent orders">
        <div className="tf-dashboard-section-title"><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><Button variant="ghost" size="sm" onClick={onOrders}>View all <FiArrowRight /></Button></div>
        {loading || error || !recent.length ? <p className="tf-dashboard-empty">{loading ? "Loading orders…" : error ? "Orders unavailable" : "No orders yet."}</p> : <div className="tf-dashboard-order-list">{recent.map(order => <Link key={order.id} to="/admin/orders/$id" params={{ id: order.id }} className="tf-dashboard-order">
          <span className="tf-dashboard-order-icon" aria-hidden="true"><FiPackage /></span>
          <span className="tf-dashboard-order-name"><strong>{order.order_number}</strong><span>{order.sofa_snapshot?.name ?? "Custom sofa"}</span></span>
          <span className="tf-dashboard-order-date">{order.delivery_city ?? "—"}<span>{formatDate(order.created_at)}</span></span>
          <strong className="tf-dashboard-order-total">{formatINR(Number(order.total))}</strong>
          <span className="tf-dashboard-status" data-status={order.status}>{order.status.replaceAll("_", " ")}</span>
          <FiArrowRight className="tf-dashboard-order-arrow" aria-hidden="true" />
        </Link>)}</div>}
      </section>
      <section className="tf-dashboard-section" aria-label="Top locations"><div className="tf-dashboard-section-title"><div><h2>Top locations</h2><p>Orders by delivery city</p></div><FiMapPin aria-hidden="true" /></div>
        {loading || error || !locations.length ? <p className="tf-dashboard-empty">{loading ? "Loading locations…" : error ? "Locations unavailable" : "No orders with a delivery city yet."}</p> : <div className="tf-dashboard-locations">{locations.map(([city, count]) => <div className="tf-dashboard-location" key={city}><div><span><FiMapPin aria-hidden="true" />{city}</span><strong>{count}</strong></div><progress max={maxLocation} value={count} aria-label={`${city}: ${count} orders`} /></div>)}</div>}
      </section>
    </section>
  );
}
