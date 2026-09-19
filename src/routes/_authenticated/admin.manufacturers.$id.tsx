import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { COL, fsList } from "@/lib/db/firestore";
import { listAdminManufacturers, saveAdminManufacturer } from "@/lib/admin-data.functions";
import { formatINR, formatDate } from "@/lib/format";
import { ACard, AEmpty, AButton, AField, AInput, AModal, dark } from "@/components/admin/ui";
import {
  ManufacturerModal,
  paidTotal,
  lastPaymentDate,
  type Manufacturer,
  type Deal,
  type Payment,
} from "@/components/admin/manufacturer-manager";

export const Route = createFileRoute("/_authenticated/admin/manufacturers/$id")({
  ssr: false,
  component: ManufacturerDetail,
  head: () => ({
    meta: [
      { title: "Manufacturer · True Furniture's Admin" },
      { name: "description", content: "Manufacturing partner profile, deals, payouts and assigned orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type OrderRow = {
  id: string;
  order_number?: string;
  status?: string;
  total?: number;
  created_at?: string;
  updated_at?: string;
  delivered_at?: string;
  manufacturer_id?: string | null;
  manufacturer_assigned_days?: number | null;
};

function daysBetween(a?: string, b?: string) {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
}

function ManufacturerDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Manufacturer> | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [pay, setPay] = useState<Payment>({ amount: 0, date: new Date().toISOString().slice(0, 10), note: "" });
  const [deal, setDeal] = useState<Deal>({ title: "", value: 0, start: "", end: "" });

  const loadList = useServerFn(listAdminManufacturers);
  const saveOne = useServerFn(saveAdminManufacturer);

  const { data: m, isLoading } = useQuery({
    queryKey: ["admin-manufacturer", id],
    queryFn: async () => {
      const rows = (await loadList()) as unknown as Manufacturer[];
      return rows.find((r) => r.id === id) ?? null;
    },
    staleTime: 0,
  });

  const { data: orders } = useQuery({
    enabled: Boolean(m),
    queryKey: ["admin-manufacturer-orders", id],
    queryFn: async () => {
      const rows = await fsList<OrderRow>(COL.orders);
      return rows.filter((o) => o.manufacturer_id === id);
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-manufacturer", id] });
    qc.invalidateQueries({ queryKey: ["admin-manufacturers"] });
  };

  const patch = async (payload: Partial<Manufacturer>) => {
    try {
      await saveOne({ data: { id, data: payload as Record<string, unknown> } });
      toast.success("Saved");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (isLoading) return <div className="p-8 text-sm" style={{ color: dark.mute }}>Loading manufacturer…</div>;
  if (!m) return <div className="p-8 text-sm" style={{ color: dark.mute }}>Manufacturer not found.</div>;

  const list = orders ?? [];
  const paid = paidTotal(m);
  const agreed = Number(m.payout_agreed ?? 0);
  const balance = Math.max(0, agreed - paid);
  const deals = m.deals ?? [];
  const lastDeal = [...deals].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")).at(-1);

  const durations = list
    .map((o) => ({
      assigned: Number(o.manufacturer_assigned_days ?? 0) || null,
      actual: daysBetween(o.created_at, o.delivered_at ?? (o.status === "delivered" ? o.updated_at : undefined)),
    }))
    .filter((d) => d.actual !== null);
  const avgActual = durations.length
    ? Math.round(durations.reduce((n, d) => n + (d.actual ?? 0), 0) / durations.length)
    : null;
  const delays = durations.filter((d) => d.assigned);
  const avgDelay = delays.length
    ? Math.round(delays.reduce((n, d) => n + ((d.actual ?? 0) - (d.assigned ?? 0)), 0) / delays.length)
    : null;

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: dark.bg, color: dark.text }}>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminBackLink label="← Back" fallbackPanel="manufacturers" />
          <div className="flex gap-2">
            <AButton variant="ghost" onClick={() => setDealOpen(true)}>Add deal</AButton>
            <AButton variant="ghost" onClick={() => setPayOpen(true)}>Log payment</AButton>
            <AButton onClick={() => setEditing(m)}>Edit details</AButton>
          </div>
        </div>

        <ACard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-semibold">{m.company}</h1>
              <div className="text-[12px]" style={{ color: dark.mute }}>
                {m.contact_name || "—"} · {m.location || "—"}
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: m.status === "ended" ? "#E0505022" : "#6FCF9722",
                color: m.status === "ended" ? dark.danger : "#6FCF97",
              }}
            >
              {m.status === "ended" ? `Ended ${m.ended_at || ""}` : "Active partner"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2 lg:grid-cols-3" style={{ color: dark.mute }}>
            <div>Phone: <span style={{ color: dark.text }}>{m.phone || "—"}</span></div>
            <div>Email: <span style={{ color: dark.text }}>{m.email || "—"}</span></div>
            <div>Partner since: <span style={{ color: dark.text }}>{m.partner_since || "—"}</span></div>
            <div>Specialities: <span style={{ color: dark.text }}>{m.specialities || "—"}</span></div>
            <div>Products delivered: <span style={{ color: dark.text }}>{m.products_delivered ?? 0}</span></div>
            <div>Last payment: <span style={{ color: dark.text }}>{lastPaymentDate(m) ?? "—"}</span></div>
          </div>
          {m.notes && <p className="mt-3 text-[12px]" style={{ color: dark.mute }}>{m.notes}</p>}
          {m.status === "ended" && m.end_reason && (
            <p className="mt-3 rounded-md p-3 text-[12px]" style={{ background: "#E0505011", color: dark.danger }}>
              Reason for ending: {m.end_reason}
            </p>
          )}
        </ACard>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Stat label="Total payout agreed" value={formatINR(agreed)} />
          <Stat label="Amount paid" value={formatINR(paid)} tone="#6FCF97" />
          <Stat label="Balance left" value={formatINR(balance)} tone={balance ? "#E0A050" : "#6FCF97"} />
          <Stat label="Orders assigned" value={String(list.length)} />
          <Stat label="Avg. days taken" value={avgActual === null ? "—" : `${avgActual}d`} />
          <Stat
            label="Avg. delay vs assigned"
            value={avgDelay === null ? "—" : `${avgDelay > 0 ? "+" : ""}${avgDelay}d`}
            tone={avgDelay !== null && avgDelay > 0 ? "#E05050" : "#6FCF97"}
          />
        </div>

        <ACard>
          <SectionTitle>Deals {lastDeal && <span style={{ color: dark.mute }}>· last: {lastDeal.title}</span>}</SectionTitle>
          {deals.length === 0 ? (
            <AEmpty text="No deals recorded yet." />
          ) : (
            <div className="space-y-2">
              {deals.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px]" style={{ background: dark.field }}>
                  <span>{d.title}</span>
                  <span style={{ color: dark.mute }}>{d.start || "—"} → {d.end || "ongoing"}</span>
                  <span style={{ color: dark.accent }}>{formatINR(Number(d.value) || 0)}</span>
                  <button
                    type="button"
                    className="text-[11px]"
                    style={{ color: dark.danger }}
                    onClick={() => void patch({ deals: deals.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </ACard>

        <ACard>
          <SectionTitle>Payments</SectionTitle>
          {(m.payments ?? []).length === 0 ? (
            <AEmpty text="No payments logged yet." />
          ) : (
            <div className="space-y-2">
              {(m.payments ?? []).map((p, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px]" style={{ background: dark.field }}>
                  <span>{p.date}</span>
                  <span style={{ color: dark.mute }}>{p.note || "—"}</span>
                  <span style={{ color: "#6FCF97" }}>{formatINR(Number(p.amount) || 0)}</span>
                  <button
                    type="button"
                    className="text-[11px]"
                    style={{ color: dark.danger }}
                    onClick={() => void patch({ payments: (m.payments ?? []).filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </ACard>

        <ACard>
          <SectionTitle>Assigned orders</SectionTitle>
          {list.length === 0 ? (
            <AEmpty text="No orders assigned to this manufacturer yet." />
          ) : (
            <div className="space-y-2">
              {list.map((o) => {
                const actual = daysBetween(o.created_at, o.delivered_at ?? (o.status === "delivered" ? o.updated_at : undefined));
                return (
                  <Link
                    key={o.id}
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px]"
                    style={{ background: dark.field }}
                  >
                    <span style={{ color: dark.accent }}>#{o.order_number ?? o.id.slice(0, 6)}</span>
                    <span style={{ color: dark.mute }}>{o.created_at ? formatDate(o.created_at) : "—"}</span>
                    <span>{o.status ?? "—"}</span>
                    <span style={{ color: dark.mute }}>
                      assigned {o.manufacturer_assigned_days ?? "—"}d · took {actual === null ? "—" : `${actual}d`}
                    </span>
                    <span>{formatINR(Number(o.total ?? 0))}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </ACard>
      </div>

      <ManufacturerModal
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (next) => {
          await patch(next);
          setEditing(null);
        }}
      />

      <AModal open={payOpen} onClose={() => setPayOpen(false)} title="Log a payment">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Amount (₹)">
            <AInput type="number" value={String(pay.amount)} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} />
          </AField>
          <AField label="Date">
            <AInput type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
          </AField>
        </div>
        <AField label="Note"><AInput value={pay.note ?? ""} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></AField>
        <div className="flex justify-end gap-2 pt-2">
          <AButton variant="ghost" onClick={() => setPayOpen(false)}>Cancel</AButton>
          <AButton
            onClick={async () => {
              if (!pay.amount) return toast.error("Enter an amount");
              await patch({ payments: [...(m.payments ?? []), pay] });
              setPay({ amount: 0, date: new Date().toISOString().slice(0, 10), note: "" });
              setPayOpen(false);
            }}
          >
            Save payment
          </AButton>
        </div>
      </AModal>

      <AModal open={dealOpen} onClose={() => setDealOpen(false)} title="Add a deal">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Title"><AInput value={deal.title} onChange={(e) => setDeal({ ...deal, title: e.target.value })} /></AField>
          <AField label="Value (₹)"><AInput type="number" value={String(deal.value)} onChange={(e) => setDeal({ ...deal, value: Number(e.target.value) })} /></AField>
          <AField label="Start"><AInput type="date" value={deal.start ?? ""} onChange={(e) => setDeal({ ...deal, start: e.target.value })} /></AField>
          <AField label="End"><AInput type="date" value={deal.end ?? ""} onChange={(e) => setDeal({ ...deal, end: e.target.value })} /></AField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <AButton variant="ghost" onClick={() => setDealOpen(false)}>Cancel</AButton>
          <AButton
            onClick={async () => {
              if (!deal.title.trim()) return toast.error("Add a deal title");
              await patch({ deals: [...deals, deal] });
              setDeal({ title: "", value: 0, start: "", end: "" });
              setDealOpen(false);
            }}
          >
            Save deal
          </AButton>
        </div>
      </AModal>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-[13px] font-semibold">{children}</div>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <ACard>
      <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: dark.mute }}>{label}</div>
      <div className="mt-1 text-[18px] font-semibold" style={{ color: tone ?? dark.text }}>{value}</div>
    </ACard>
  );
}
