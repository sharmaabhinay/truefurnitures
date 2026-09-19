import { AdminBackLink } from "@/components/admin/back-link";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductAnalytics } from "@/lib/admin-data.functions";
import { formatDate } from "@/lib/format";

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

const dark = {
  bg: "#0F0F13",
  card: "#16161D",
  border: "#2A2A38",
  text: "#E8E8F0",
  mute: "#888899",
  accent: "#C8A86B",
};

const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "12m", label: "12 months" },
] as const;

type Range = (typeof RANGES)[number]["id"];

function Card({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>{label}</div>
      <div className="mt-1 text-[20px] font-semibold">{value}</div>
      {note && <div className="mt-1 text-[11px]" style={{ color: dark.mute }}>{note}</div>}
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <div className="mb-3 text-[13px] font-semibold">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[12px]" style={{ color: dark.mute }}>No data yet.</div>
      ) : rows.map(([name, value]) => (
        <div key={name} className="flex items-center gap-3 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px]">{name}</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: "#22222E" }}>
            <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: dark.accent }} />
          </div>
          <span className="w-8 text-right text-[12px]" style={{ color: dark.mute }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

type Point = { label: string; views: number; carts: number; orders: number };

function Chart({ series }: { series: Point[] }) {
  const w = 720;
  const h = 220;
  const pad = 28;
  const max = Math.max(1, ...series.flatMap((p) => [p.views, p.carts, p.orders]));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = (key: keyof Point) =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(Number(p[key])).toFixed(1)}`).join(" ");
  const lines: Array<[keyof Point, string, string]> = [
    ["views", dark.accent, "Views"],
    ["carts", "#5AA9E6", "Cart adds"],
    ["orders", "#6FCF97", "Orders"],
  ];
  return (
    <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="text-[13px] font-semibold">Trend</div>
        {lines.map(([, color, label]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: dark.mute }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} /> {label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Product trend chart">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={dark.border} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={dark.border} />
        {lines.map(([key, color]) => (
          <path key={key} d={path(key)} fill="none" stroke={color} strokeWidth={2} />
        ))}
        <text x={pad} y={pad - 10} fill={dark.mute} fontSize="10">{max}</text>
        <text x={pad} y={h - 8} fill={dark.mute} fontSize="10">{series[0]?.label ?? ""}</text>
        <text x={w - pad - 50} y={h - 8} fill={dark.mute} fontSize="10">{series[series.length - 1]?.label ?? ""}</text>
      </svg>
    </div>
  );
}

function ProductAnalytics() {
  const { id } = Route.useParams();
  const [range, setRange] = useState<Range>("30d");
  const load = useServerFn(getProductAnalytics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-analytics", id, range],
    queryFn: () => load({ data: { productId: id, range } }),
    staleTime: 0,
  });

  const t = data?.totals;
  const c = data?.conversion;

  return (
    <div className="min-h-screen p-5" style={{ background: dark.bg, color: dark.text }}>
      <div className="mx-auto max-w-5xl space-y-4">
        <AdminBackLink label="← Back" fallbackPanel="products" />

        <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>Product analytics</div>
            <h1 className="text-[20px] font-semibold">{data?.product.name ?? "Product"}</h1>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className="rounded-lg px-3 py-1.5 text-[12px]"
                style={{
                  border: `1px solid ${range === r.id ? dark.accent : dark.border}`,
                  color: range === r.id ? dark.accent : dark.mute,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 text-[13px]" style={{ background: dark.card, border: `1px solid ${dark.border}`, color: "#E05050" }}>
            Analytics could not be loaded.
          </div>
        )}
        {isLoading && <div className="text-[13px]" style={{ color: dark.mute }}>Loading…</div>}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Impressions" value={t!.impressions} note="seen in listings" />
              <Card label="Product views" value={t!.views} note={`${t!.uniqueViewers} unique viewers`} />
              <Card label="3D views" value={t!.views3d} note="opened the configurator" />
              <Card label="Added to cart" value={t!.addToCart} note={`${t!.cartSessions} sessions`} />
              <Card label="Active carts" value={t!.activeCarts} note={`${t!.cartUnits} units waiting`} />
              <Card label="Orders" value={t!.orders} note="excluding cancelled/refunded" />
              <Card label="Revenue" value={`₹${t!.revenue.toLocaleString("en-IN")}`} note="from valid orders" />
              <Card label="View → order" value={`${c!.viewToOrder}%`} note={`view→cart ${c!.viewToCart}% · cart→order ${c!.cartToOrder}%`} />
            </div>

            <Chart series={data.series as Point[]} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Bars title="Devices" rows={data.devices as [string, number][]} />
              <Bars title="Browsers" rows={data.browsers as [string, number][]} />
              <Bars title="Cities" rows={data.cities as [string, number][]} />
              <Bars title="Top pages" rows={data.pages as [string, number][]} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/admin/products/$id/orders" params={{ id }} className="rounded-lg px-3 py-2 text-[12px]" style={{ border: `1px solid ${dark.border}`, color: dark.accent }}>
                View orders for this product
              </Link>
              <Link to="/admin/products/$id/carts" params={{ id }} className="rounded-lg px-3 py-2 text-[12px]" style={{ border: `1px solid ${dark.border}`, color: dark.accent }}>
                View customers holding it in cart
              </Link>
            </div>

            <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
              <div className="mb-3 text-[13px] font-semibold">Recent activity</div>
              {data.recent.length === 0 ? (
                <div className="text-[12px]" style={{ color: dark.mute }}>No activity recorded yet.</div>
              ) : data.recent.map((r, i) => (
                <div key={`${r.time}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]" style={{ borderTop: i ? `1px solid ${dark.border}` : undefined }}>
                  <span>{r.type.replace(/_/g, " ")}</span>
                  <span style={{ color: dark.mute }}>{r.page || "—"}{r.city ? ` · ${r.city}` : ""}</span>
                  <span style={{ color: dark.mute }}>{r.time ? formatDate(r.time) : "—"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
