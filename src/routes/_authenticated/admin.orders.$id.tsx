import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate, ORDER_STATUS_STEPS, statusIndex } from "@/lib/format";
import { getAuthUserDetails } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isStaff } = await supabase.rpc("has_role", { _user_id: user.id, _role: "staff" });
    if (!isAdmin && !isStaff) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Order — Admin · True Furniture's" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

const dark = {
  bg: "#0F0F13", card: "#16161D", border: "#2A2A38",
  text: "#E8E8F0", mute: "#888899", accent: "#C8A86B",
};

const CRAFTSMEN = [
  "Ramesh Verma (Master · Indore)",
  "Suresh Yadav (Senior · Indore)",
  "Kailash Patidar (Senior · Ujjain)",
  "Deepak Sharma (Ujjain)",
  "Ajay Chouhan (Apprentice · Indore)",
];

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getAuth = useServerFn(getAuthUserDetails);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["admin-order-profile", order?.user_id],
    enabled: !!order?.user_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", order!.user_id).maybeSingle();
      return data;
    },
  });

  const { data: auth } = useQuery({
    queryKey: ["admin-order-auth", order?.user_id],
    enabled: !!order?.user_id,
    queryFn: () => getAuth({ data: { userId: order!.user_id } }),
  });

  const { data: history } = useQuery({
    queryKey: ["admin-order-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_status_history")
        .select("id, status, note, created_at, changed_by")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("orders").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-order-history", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [statusNote, setStatusNote] = useState("");
  const advanceStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("orders").update({ status: newStatus } as any).eq("id", id);
      if (error) throw error;
      if (statusNote.trim()) {
        await supabase.from("order_status_history").insert({ order_id: id, status: newStatus, note: statusNote.trim() } as any);
      }
    },
    onSuccess: () => {
      setStatusNote("");
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-order-history", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div style={{ background: dark.bg, color: dark.mute, minHeight: "100vh" }} className="p-10 text-center">Loading…</div>;
  if (!order) return <div style={{ background: dark.bg, color: dark.text, minHeight: "100vh" }} className="p-10 text-center">Order not found. <Link to="/admin" style={{ color: dark.accent }}>Back</Link></div>;

  const snap = (order.sofa_snapshot ?? {}) as { name?: string; slug?: string; hero_image?: string };
  const fabric = (order.fabric_snapshot ?? {}) as { name?: string };
  const size = (order.size_snapshot ?? {}) as { label?: string };
  const addons = (order.addons_snapshot ?? []) as Array<{ name?: string; price?: number }>;
  const currentIdx = (order.status as string) === "cancelled" ? -1 : statusIndex(order.status as string);

  return (
    <div style={{ background: dark.bg, color: dark.text, minHeight: "100vh" }} className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/admin" className="text-xs uppercase tracking-widest" style={{ color: dark.mute }}>← Back to Admin</Link>

        <header className="mt-4 flex flex-wrap gap-4 items-start justify-between pb-6 border-b" style={{ borderColor: dark.border }}>
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: dark.mute }}>Order</p>
            <h1 className="text-3xl font-semibold mt-1">{order.order_number}</h1>
            <p className="text-sm mt-1" style={{ color: dark.mute }}>
              Placed {new Date(order.created_at).toLocaleString("en-IN")}
              {order.order_source && ` · via ${order.order_source}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">{formatINR(Number(order.total))}</div>
            <div className="text-[11px]" style={{ color: dark.mute }}>
              Deposit {formatINR(Number(order.deposit_paid))} · Balance {formatINR(Number(order.balance_due))}
            </div>
            {order.discount_code && (
              <div className="text-[11px] mt-1" style={{ color: dark.accent }}>Coupon {order.discount_code} (−{formatINR(Number(order.discount))})</div>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            {/* Configuration */}
            <Panel title="What was ordered">
              <div className="grid sm:grid-cols-[120px_1fr] gap-4">
                {snap.hero_image && <img src={snap.hero_image} alt="" className="w-full h-32 object-cover rounded" />}
                <div className="space-y-1 text-sm">
                  <div className="text-lg font-semibold">{snap.name ?? "Custom sofa"}</div>
                  {snap.slug && (
                    <Link to="/products/$slug" params={{ slug: snap.slug }} target="_blank" className="text-[11px]" style={{ color: dark.accent }}>View product page ↗</Link>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                    <Kv k="Size" v={size.label ?? "—"} />
                    <Kv k="Fabric" v={fabric.name ?? "—"} />
                    <Kv k="Subtotal" v={formatINR(Number(order.subtotal))} />
                    <Kv k="Discount" v={formatINR(Number(order.discount))} />
                  </div>
                </div>
              </div>
              {addons.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: dark.border }}>
                  <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: dark.mute }}>Add-ons</p>
                  <ul className="text-sm space-y-1">
                    {addons.map((a, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{a.name}</span>
                        <span style={{ color: dark.mute }}>{formatINR(Number(a.price ?? 0))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            {/* Status control + timeline */}
            <Panel title="Status & production timeline">
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={order.status}
                  onChange={(e) => advanceStatus.mutate(e.target.value)}
                  className="rounded-md px-3 py-2 text-sm"
                  style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                >
                  {ORDER_STATUS_STEPS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                  <option value="cancelled">Cancelled</option>
                </select>
                <input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note for this status change…"
                  className="flex-1 min-w-[200px] rounded-md px-3 py-2 text-sm"
                  style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                />
              </div>
              <ol className="relative">
                {ORDER_STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentIdx;
                  const rec = (history ?? []).find((h) => h.status === step.key);
                  return (
                    <li key={step.key} className="grid grid-cols-[24px_1fr] gap-4 pb-5 last:pb-0 relative">
                      {idx < ORDER_STATUS_STEPS.length - 1 && (
                        <span className="absolute left-[11px] top-6 bottom-0 w-px" style={{ background: done ? dark.accent : "rgba(200,168,107,0.15)" }} />
                      )}
                      <span className="block size-6 rounded-full mt-0.5" style={{ background: done ? dark.accent : "transparent", border: `2px solid ${done ? dark.accent : "rgba(200,168,107,0.3)"}` }} />
                      <div className={done ? "" : "opacity-50"}>
                        <div className="flex justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{step.label}</span>
                          {rec && <time className="text-[10px]" style={{ color: dark.mute }}>{new Date(rec.created_at).toLocaleString("en-IN")}</time>}
                        </div>
                        <p className="text-[12px]" style={{ color: dark.mute }}>{step.description}</p>
                        {rec?.note && <p className="text-[12px] italic mt-1">"{rec.note}"</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            {/* Notes */}
            <Panel title="Customer & admin notes">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: dark.mute }}>Customer notes</p>
                  <p className="text-sm whitespace-pre-wrap">{order.customer_notes || <span style={{ color: dark.mute }}>None</span>}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: dark.mute }}>Internal (admin only)</p>
                  <textarea
                    defaultValue={order.admin_notes ?? ""}
                    onBlur={(e) => e.target.value !== (order.admin_notes ?? "") && update.mutate({ admin_notes: e.target.value })}
                    rows={4}
                    className="w-full rounded-md px-3 py-2 text-sm"
                    style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
              </div>
            </Panel>
          </div>

          {/* SIDE */}
          <aside className="space-y-4">
            <Panel title="Customer">
              {order.user_id ? (
                <>
                  <Kv k="Name" v={profile?.full_name ?? "—"} />
                  <Kv k="Email" v={auth?.email ?? "—"} />
                  <Kv k="Phone" v={<a href={`tel:${order.phone}`} style={{ color: dark.accent }}>{order.phone}</a>} />
                  {profile?.phone && (
                    <Kv k="WhatsApp" v={<a href={`https://wa.me/91${profile.phone}`} target="_blank" rel="noreferrer" style={{ color: dark.accent }}>Open ↗</a>} />
                  )}
                  <Kv k="City" v={profile?.city ?? order.delivery_city ?? "—"} />
                  <Kv k="Signed up" v={auth?.created_at ? formatDate(auth.created_at) : "—"} />
                  <Kv k="Last login" v={auth?.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString("en-IN") : "Never"} />
                  <div className="pt-3 mt-3 border-t" style={{ borderColor: dark.border }}>
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: order.user_id }}
                      className="block text-center text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded"
                      style={{ background: dark.accent, color: dark.bg }}
                    >View full customer</Link>
                  </div>
                </>
              ) : (
                <p style={{ color: dark.mute }} className="text-sm">Guest order</p>
              )}
            </Panel>

            <Panel title="Delivery">
              <Kv k="City" v={order.delivery_city ?? "—"} />
              <div className="mt-2 py-1.5 border-b" style={{ borderColor: "rgba(42,42,56,0.4)" }}>
                <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: dark.mute }}>Address</div>
                <div className="text-sm whitespace-pre-wrap">{order.delivery_address ?? "—"}</div>
              </div>
              <div className="py-2">
                <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: dark.mute }}>Expected delivery</div>
                <input
                  type="date"
                  defaultValue={order.expected_delivery_date ?? ""}
                  onBlur={(e) => e.target.value !== order.expected_delivery_date && update.mutate({ expected_delivery_date: e.target.value || null })}
                  className="w-full rounded-md px-3 py-2 text-sm"
                  style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                />
              </div>
            </Panel>

            <Panel title="Assigned craftsman">
              <select
                value={order.assigned_craftsman ?? ""}
                onChange={(e) => update.mutate({ assigned_craftsman: e.target.value || null })}
                className="w-full rounded-md px-3 py-2 text-sm mb-2"
                style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
              >
                <option value="">— Unassigned —</option>
                {CRAFTSMEN.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                defaultValue={order.assigned_craftsman ?? ""}
                onBlur={(e) => e.target.value !== (order.assigned_craftsman ?? "") && update.mutate({ assigned_craftsman: e.target.value || null })}
                placeholder="Or enter a custom name…"
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
              />
            </Panel>

            <Panel title="Payment">
              <Kv k="Subtotal" v={formatINR(Number(order.subtotal))} />
              <Kv k="Discount" v={formatINR(Number(order.discount))} />
              <Kv k="Total" v={<span className="font-semibold">{formatINR(Number(order.total))}</span>} />
              <Kv k="Deposit paid" v={formatINR(Number(order.deposit_paid))} />
              <Kv k="Balance due" v={<span style={{ color: Number(order.balance_due) > 0 ? dark.accent : "#98e5b3" }}>{formatINR(Number(order.balance_due))}</span>} />
            </Panel>

            <Panel title="Order meta">
              <Kv k="Source" v={order.order_source ?? "website"} />
              <Kv k="Order ID" v={<span className="font-mono text-[10px]">{order.id}</span>} />
              <Kv k="Last updated" v={order.updated_at ? new Date(order.updated_at).toLocaleString("en-IN") : "—"} />
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg p-5" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: dark.mute }}>{title}</h2>
      {children}
    </section>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: "rgba(42,42,56,0.4)" }}>
      <span className="text-[11px] uppercase tracking-widest" style={{ color: dark.mute }}>{k}</span>
      <span className="text-sm text-right truncate max-w-[200px]">{v}</span>
    </div>
  );
}