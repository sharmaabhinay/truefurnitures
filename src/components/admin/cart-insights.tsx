import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type React from "react";
import { FiRefreshCw, FiShoppingCart, FiCheckCircle, FiTrendingUp, FiUsers } from "react-icons/fi";
import { getAdminCartInsights } from "@/lib/admin-data.functions";
import { AButton, ACard, dark } from "@/components/admin/ui";

function Stat({ label, value, note, icon }: { label: string; value: string | number; note: string; icon: React.ReactNode }) {
  return (
    <ACard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: dark.mute }}>{label}</div>
          <div className="mt-1 text-2xl font-semibold" style={{ color: dark.text }}>{value}</div>
          <div className="mt-1 text-[11px]" style={{ color: dark.mute }}>{note}</div>
        </div>
        <span className="text-lg" style={{ color: dark.accent }}>{icon}</span>
      </div>
    </ACard>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <ACard>
      <div className="mb-4 text-[13px] font-semibold">{title}</div>
      {rows.length === 0 ? <div className="text-[12px]" style={{ color: dark.mute }}>No data yet.</div> : rows.map(([name, value]) => (
        <div key={name} className="flex items-center gap-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[12px]">{name}</span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full" style={{ background: dark.field }}>
            <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: dark.accent }} />
          </div>
          <span className="w-8 text-right text-[12px]" style={{ color: dark.mute }}>{value}</span>
        </div>
      ))}
    </ACard>
  );
}

export function CartInsights() {
  const load = useServerFn(getAdminCartInsights);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-cart-insights"],
    queryFn: () => load(),
    staleTime: 0,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold">Cart funnel</div>
          <div className="text-[11px]" style={{ color: dark.mute }}>Unique cart visitors compared with completed checkout sessions.</div>
        </div>
        <AButton variant="ghost" onClick={() => void refetch()} disabled={isFetching}>
          <span className="inline-flex items-center gap-2"><FiRefreshCw className={isFetching ? "animate-spin" : ""} /> Refresh</span>
        </AButton>
      </div>
      {error && <ACard><div className="text-[12px]" style={{ color: dark.danger }}>Cart insights could not be loaded. Try refreshing.</div></ACard>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Added to cart" value={isLoading ? "—" : (data?.cartVisitors ?? 0)} note={`${data?.addEvents ?? 0} total add actions`} icon={<FiUsers />} />
        <Stat label="Completed checkout" value={isLoading ? "—" : (data?.completedCheckouts ?? 0)} note="excluding cancelled and refunded" icon={<FiCheckCircle />} />
        <Stat label="Conversion rate" value={isLoading ? "—" : `${data?.conversionRate ?? 0}%`} note="checkout sessions ÷ cart visitors" icon={<FiTrendingUp />} />
        <Stat label="Active customer carts" value={isLoading ? "—" : (data?.activeCarts ?? 0)} note="currently holding at least one item" icon={<FiShoppingCart />} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Breakdown title="Most added products" rows={data?.productAdds ?? []} />
        <Breakdown title="Products in completed checkouts" rows={data?.productOrders ?? []} />
      </div>
    </div>
  );
}