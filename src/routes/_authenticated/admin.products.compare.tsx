import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminBackLink } from "@/components/admin/back-link";
import { getProductAnalytics } from "@/lib/admin-data.functions";
import { COL, fsList } from "@/lib/db/firestore";

export const Route = createFileRoute("/_authenticated/admin/products/compare")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Compare products — Admin · True Furniture's" },
      { name: "description", content: "Compare analytics for multiple True Furniture's sofas side by side." },
      { property: "og:title", content: "Compare Product Analytics — True Furniture's Admin" },
      { property: "og:description", content: "Side-by-side views, carts, orders and conversion per sofa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Compare,
});

const dark = { bg: "#0F0F13", card: "#16161D", border: "#2A2A38", text: "#E8E8F0", mute: "#888899", accent: "#C8A86B" };
const COLORS = ["#C8A86B", "#5AA9E6", "#6FCF97", "#E07A8F", "#9B7BD4", "#E0A458"];
const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "12m", label: "12 months" },
] as const;
type Range = (typeof RANGES)[number]["id"];
type Metric = "views" | "carts" | "orders";

function Compare() {
  const [range, setRange] = useState<Range>("30d");
  const [selected, setSelected] = useState<string[]>([]);
  const [metric, setMetric] = useState<Metric>("views");
  const load = useServerFn(getProductAnalytics);

  const sofas = useQuery({
    queryKey: ["compare-sofas"],
    queryFn: async () => (await fsList<{ id: string; name?: string }>(COL.sofas)).map((s) => ({ id: s.id, name: s.name ?? s.id })),
  });

  const results = useQueries({
    queries: selected.map((id) => ({
      queryKey: ["product-analytics", id, range],
      queryFn: () => load({ data: { productId: id, range } }),
      staleTime: 30_000,
      retry: 2,
    })),
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? s : [...s, id]));

  const loaded = results.map((r, i) => ({ id: selected[i], q: r, color: COLORS[i % COLORS.length] }));

  const rows: Array<[string, (d: any) => string | number, boolean]> = [
    ["Impressions", (d) => d.totals.impressions, true],
    ["Product views", (d) => d.totals.views, true],
    ["Unique viewers", (d) => d.totals.uniqueViewers, true],
    ["3D views", (d) => d.totals.views3d, true],
    ["Added to cart", (d) => d.totals.addToCart, true],
    ["Active carts", (d) => d.totals.activeCarts, true],
    ["Orders", (d) => d.totals.orders, true],
    ["Revenue", (d) => d.totals.revenue, true],
    ["View → cart %", (d) => d.conversion.viewToCart, true],
    ["Cart → order %", (d) => d.conversion.cartToOrder, true],
    ["View → order %", (d) => d.conversion.viewToOrder, true],
  ];

  return (
    <div className="min-h-screen p-5" style={{ background: dark.bg, color: dark.text }}>
      <div className="mx-auto max-w-6xl space-y-4">
        <AdminBackLink label="← Back" fallbackPanel="products" />
        <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>Product analytics</div>
            <h1 className="text-[20px] font-semibold">Compare sofas</h1>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button key={r.id} type="button" onClick={() => setRange(r.id)} className="rounded-lg px-3 py-1.5 text-[12px]"
                style={{ border: `1px solid ${range === r.id ? dark.accent : dark.border}`, color: range === r.id ? dark.accent : dark.mute }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div className="mb-2 text-[12px]" style={{ color: dark.mute }}>Pick up to 6 sofas</div>
          {sofas.isLoading && <div className="text-[12px]" style={{ color: dark.mute }}>Loading sofas…</div>}
          {sofas.error && <div className="text-[12px]" style={{ color: "#E05050" }}>Sofas could not be loaded.</div>}
          <div className="flex flex-wrap gap-2">
            {(sofas.data ?? []).map((s) => {
              const idx = selected.indexOf(s.id);
              const on = idx >= 0;
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{ border: `1px solid ${on ? COLORS[idx % COLORS.length] : dark.border}`, color: on ? COLORS[idx % COLORS.length] : dark.mute }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {selected.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-[13px]" style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.mute }}>
            Select two or more sofas above to compare them.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium" style={{ color: dark.mute }}>Metric</th>
                    {loaded.map(({ id, q, color }) => (
                      <th key={id} className="p-3 text-right font-semibold" style={{ color }}>
                        {q.data?.product.name ?? sofas.data?.find((s) => s.id === id)?.name ?? "…"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, get]) => {
                    const vals = loaded.map(({ q }) => (q.data ? Number(get(q.data)) : null));
                    const best = Math.max(...vals.map((v) => v ?? -1));
                    return (
                      <tr key={label} style={{ borderTop: `1px solid ${dark.border}` }}>
                        <td className="p-3" style={{ color: dark.mute }}>{label}</td>
                        {loaded.map(({ id, q }, i) => {
                          const v = vals[i];
                          const isBest = v !== null && v > 0 && v === best && loaded.length > 1;
                          return (
                            <td key={id} className="p-3 text-right" style={{ color: isBest ? dark.accent : dark.text, fontWeight: isBest ? 600 : 400 }}>
                              {q.error ? "Error" : v === null ? "…" : label === "Revenue" ? `₹${v.toLocaleString("en-IN")}` : label.endsWith("%") ? `${v}%` : v}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TrendChart metric={metric} setMetric={setMetric} items={loaded.map(({ q, color, id }) => ({ id, color, series: (q.data?.series ?? []) as any[] }))} />
          </>
        )}
      </div>
    </div>
  );
}

function TrendChart({ metric, setMetric, items }: { metric: Metric; setMetric: (m: Metric) => void; items: { id: string; color: string; series: any[] }[] }) {
  const w = 720, h = 240, pad = 28;
  const len = Math.max(0, ...items.map((i) => i.series.length));
  const max = Math.max(1, ...items.flatMap((i) => i.series.map((p) => Number(p[metric] ?? 0))));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, len - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const first = items.find((i) => i.series.length)?.series;
  return (
    <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-2 text-[13px] font-semibold">Trend</div>
        {(["views", "carts", "orders"] as Metric[]).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)} className="rounded-lg px-2.5 py-1 text-[11px] capitalize"
            style={{ border: `1px solid ${metric === m ? dark.accent : dark.border}`, color: metric === m ? dark.accent : dark.mute }}>
            {m === "carts" ? "Cart adds" : m}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Comparison trend chart">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={dark.border} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={dark.border} />
        {items.map((it) => (
          <path key={it.id} fill="none" stroke={it.color} strokeWidth={2}
            d={it.series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(p[metric] ?? 0)).toFixed(1)}`).join(" ")} />
        ))}
        <text x={pad} y={pad - 10} fill={dark.mute} fontSize="10">{max}</text>
        <text x={pad} y={h - 8} fill={dark.mute} fontSize="10">{first?.[0]?.label ?? ""}</text>
        <text x={w - pad - 50} y={h - 8} fill={dark.mute} fontSize="10">{first?.[first.length - 1]?.label ?? ""}</text>
      </svg>
    </div>
  );
}
