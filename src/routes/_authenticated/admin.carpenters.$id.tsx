import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { COL, fsGet, fsList } from "@/lib/db/firestore";
import { formatINR, formatDate } from "@/lib/format";
import { ACard, AEmpty, dark } from "@/components/admin/ui";
import type { Carpenter } from "@/components/admin/carpenter-manager";

export const Route = createFileRoute("/_authenticated/admin/carpenters/$id")({
  ssr: false,
  component: CarpenterDetail,
  head: () => ({
    meta: [
      { title: "Carpenter Profile · True Furniture's Admin" },
      { name: "description", content: "Craftsman profile, assigned orders and payout summary." },
    ],
  }),
});

type OrderRow = {
  id: string;
  order_number?: string;
  status?: string;
  total?: number;
  created_at?: string;
  assigned_craftsman?: string | null;
};

function CarpenterDetail() {
  const { id } = Route.useParams();

  const { data: c, isLoading } = useQuery({
    queryKey: ["admin-carpenter", id],
    queryFn: () => fsGet<Carpenter>(COL.carpenters, id),
  });

  const label = c ? `${c.full_name}${c.city ? ` · ${c.city}` : ""}` : "";

  const { data: orders } = useQuery({
    enabled: Boolean(c),
    queryKey: ["admin-carpenter-orders", label],
    queryFn: async () => {
      const rows = await fsList<OrderRow>(COL.orders);
      return rows.filter(
        (o) => o.assigned_craftsman === label || o.assigned_craftsman === c?.full_name,
      );
    },
  });

  const list = orders ?? [];
  const delivered = list.filter((o) => o.status === "delivered");
  const active = list.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const rate = Number(c?.daily_rate ?? 0);
  const payoutTotal = rate * list.length;
  const payoutDone = rate * delivered.length;
  const payoutHold = rate * active.length;
  const payoutLeft = Math.max(0, payoutTotal - payoutDone);

  if (isLoading) return <div className="p-8 text-sm" style={{ color: dark.mute }}>Loading craftsman…</div>;
  if (!c) return <div className="p-8 text-sm" style={{ color: dark.mute }}>Carpenter not found.</div>;

  return (
    <div className="min-h-screen p-4 sm:p-8 space-y-5" style={{ background: dark.bg, color: dark.text }}>
      <Link to="/admin" search={{ p: "carpenters" }} className="text-[12px]" style={{ color: dark.accent }}>
        ← Back to carpenter team
      </Link>

      <ACard>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="h-16 w-16 rounded-full bg-cover bg-center flex items-center justify-center text-xl font-bold"
            style={{
              backgroundImage: c.photo_url ? `url(${c.photo_url})` : undefined,
              background: c.photo_url ? undefined : dark.accent,
              color: "#1a1a1a",
            }}
          >
            {!c.photo_url && (c.full_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold">{c.full_name}</h1>
            <div className="text-[12px]" style={{ color: dark.mute }}>
              {c.city}{c.area ? ` · ${c.area}` : ""} · {c.experience_years ?? 0} yrs · ⭐ {c.rating ?? 5}/5
            </div>
          </div>
        </div>

        <ul className="mt-4 grid gap-1 text-[12px] sm:grid-cols-2" style={{ color: dark.mute }}>
          <li>Phone: <a href={`tel:${c.phone}`} style={{ color: dark.text }}>{c.phone}</a></li>
          <li>Email: {c.email || "—"}</li>
          <li>Address / locality: {c.area ? `${c.area}, ${c.city}` : c.city}</li>
          <li>ID proof: {c.id_proof || "—"}</li>
          <li>Joined: {c.joined_on ? formatDate(c.joined_on) : "—"}</li>
          <li>Daily rate: {rate ? formatINR(rate) : "Not set"} · max {c.max_parallel_jobs ?? 1} parallel jobs</li>
          <li className="sm:col-span-2">Specialities: {(c.specialities ?? []).join(", ") || "—"}</li>
          <li className="sm:col-span-2">Notes: {c.notes || "—"}</li>
        </ul>
      </ACard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders assigned" value={String(list.length)} />
        <Stat label="Furniture crafted (delivered)" value={String(delivered.length)} />
        <Stat label="Currently active jobs" value={String(active.length)} />
        <Stat label="Rating" value={`${c.rating ?? 5}/5`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total payout" value={formatINR(payoutTotal)} />
        <Stat label="Payout done" value={formatINR(payoutDone)} />
        <Stat label="Payout left" value={formatINR(payoutLeft)} />
        <Stat label="On hold (active jobs)" value={formatINR(payoutHold)} />
      </div>

      <ACard>
        <h2 className="text-[14px] font-semibold mb-3">Assigned orders</h2>
        {list.length === 0 ? (
          <AEmpty icon="📦" text="No orders assigned to this craftsman yet." />
        ) : (
          <div className="space-y-2">
            {list.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-[12px]"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${dark.border}` }}
              >
                <span className="font-semibold" style={{ color: dark.text }}>#{o.order_number ?? o.id.slice(0, 6)}</span>
                <span style={{ color: dark.mute }}>{o.status ?? "—"}</span>
                <span style={{ color: dark.mute }}>{o.created_at ? formatDate(o.created_at) : ""}</span>
                <span className="ml-auto" style={{ color: dark.accent }}>{formatINR(Number(o.total ?? 0))}</span>
              </Link>
            ))}
          </div>
        )}
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
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/carpenters/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/admin/carpenters/$id"!</div>
}
