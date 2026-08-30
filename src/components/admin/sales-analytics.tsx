import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { COL, fsList } from "@/lib/db/firestore";
import { formatINR } from "@/lib/format";
import { ACard, AEmpty, AInput, AField, dark } from "@/components/admin/ui";
import { FiBarChart2 } from "react-icons/fi";

type OrderRow = {
  id: string;
  order_number?: string;
  status?: string;
  total?: number;
  created_at?: string;
  sofa_snapshot?: { name?: string; slug?: string } | null;
  fabric_snapshot?: { name?: string } | null;
  size_snapshot?: { name?: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending_deposit: "#C8A86B",
  confirmed: "#4CAF82",
  in_production: "#6C9BD1",
  quality_check: "#9B7BD4",
  shipped: "#4FB0C6",
  out_for_delivery: "#E0A458",
  delivered: "#4CAF82",
  cancelled: "#E2585A",
  refunded: "#E2585A",
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Order totals by status and best-selling configurations for a date range. */
export function SalesAnalytics() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sales-analytics"],
    queryFn: () => fsList<OrderRow>(COL.orders),
  });

  const orders = useMemo(() => {
    const start = new Date(`${from}T00:00:00`).getTime();
    const end = new Date(`${to}T23:59:59`).getTime();
    return (data ?? []).filter((o) => {
      const t = o.created_at ? new Date(o.created_at).getTime() : NaN;
      return !Number.isNaN(t) && t >= start && t <= end;
    });
  }, [data, from, to]);

  const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const avg = orders.length ? revenue / orders.length : 0;

  const byStatus = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const k = o.status ?? "unknown";
      const cur = m.get(k) ?? { count: 0, total: 0 };
      m.set(k, { count: cur.count + 1, total: cur.total + Number(o.total ?? 0) });
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [orders]);

  const topConfigs = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const label = [
        o.sofa_snapshot?.name ?? "Unknown sofa",
        o.fabric_snapshot?.name,
        o.size_snapshot?.name,
      ]
        .filter(Boolean)
        .join(" · ");
      const cur = m.get(label) ?? { count: 0, total: 0 };
      m.set(label, { count: cur.count + 1, total: cur.total + Number(o.total ?? 0) });
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  }, [orders]);

  const maxStatus = Math.max(1, ...byStatus.map(([, v]) => v.count));
  const maxConfig = Math.max(1, ...topConfigs.map(([, v]) => v.count));

  return (
    <div className="space-y-4">
      <ACard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44"><AField label="From"><AInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></AField></div>
          <div className="w-44"><AField label="To"><AInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></AField></div>
          <div className="flex gap-2">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => { setFrom(isoDaysAgo(d)); setTo(new Date().toISOString().slice(0, 10)); }}
                className="cursor-pointer rounded-md px-3 py-2 text-[12px]"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${dark.border}`, color: dark.text }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </ACard>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders in range" value={String(orders.length)} />
        <Stat label="Revenue" value={formatINR(revenue)} />
        <Stat label="Average order value" value={formatINR(Math.round(avg))} />
      </div>

      <ACard>
        <h2 className="text-[14px] font-semibold mb-3">Orders by status</h2>
        {isLoading && <div className="text-[13px]" style={{ color: dark.mute }}>Loading…</div>}
        {!isLoading && byStatus.length === 0 && <AEmpty icon={<FiBarChart2 />} text="No orders in this date range." />}
        <div className="space-y-2">
          {byStatus.map(([status, v]) => (
            <div key={status}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span style={{ color: dark.text }}>{status.replace(/_/g, " ")}</span>
                <span style={{ color: dark.mute }}>{v.count} · {formatINR(v.total)}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${(v.count / maxStatus) * 100}%`, background: STATUS_COLORS[status] ?? dark.accent }}
                />
              </div>
            </div>
          ))}
        </div>
      </ACard>

      <ACard>
        <h2 className="text-[14px] font-semibold mb-3">Top-selling configurations</h2>
        {!isLoading && topConfigs.length === 0 && <AEmpty icon={<FiBarChart2 />} text="No configurations sold in this range." />}
        <div className="space-y-2">
          {topConfigs.map(([label, v]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span style={{ color: dark.text }}>{label}</span>
                <span style={{ color: dark.mute }}>{v.count} sold · {formatINR(v.total)}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-2 rounded-full" style={{ width: `${(v.count / maxConfig) * 100}%`, background: dark.accent }} />
              </div>
            </div>
          ))}
        </div>
      </ACard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <ACard>
      <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>{label}</div>
      <div className="text-[20px] font-semibold mt-1">{value}</div>
    </ACard>
  );
}
