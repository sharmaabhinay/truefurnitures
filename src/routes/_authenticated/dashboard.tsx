import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import {
  formatINR,
  formatDate,
  ORDER_STATUS_STEPS,
  statusIndex,
  STATUS_META,
  canUserCancel,
  canUserRequestRefund,
} from "@/lib/format";

type Order = {
  id: string;
  order_number: string;
  sofa_snapshot: { name?: string; slug?: string } | null;
  fabric_snapshot: { name?: string } | null;
  size_snapshot: { label?: string } | null;
  total: number;
  deposit_paid: number;
  balance_due: number;
  status: string;
  expected_delivery_date: string | null;
  delivery_city: string | null;
  created_at: string;
  cancellation_reason?: string | null;
  refund_reason?: string | null;
  refund_amount?: number | null;
};

type HistoryRow = { id: string; order_id: string; status: string; note: string | null; created_at: string };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Orders — True Furniture's" },
      { name: "description", content: "Track your bespoke sofa order from production to delivery." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, sofa_snapshot, fabric_snapshot, size_snapshot, total, deposit_paid, balance_due, status, expected_delivery_date, delivery_city, created_at, cancellation_reason, refund_reason, refund_amount")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const orderIds = orders?.map((o) => o.id) ?? [];
  const { data: history } = useQuery({
    queryKey: ["order-history", orderIds.join(",")],
    enabled: orderIds.length > 0,
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("id, order_id, status, note, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });

  const qc = useQueryClient();
  const requestAction = useMutation({
    mutationFn: async ({ orderId, action, reason }: { orderId: string; action: "cancel" | "refund"; reason: string }) => {
      const { error } = await supabase.rpc("request_order_action", {
        _order_id: orderId,
        _action: action,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "cancel" ? "Cancellation submitted." : "Refund request submitted.");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit request"),
  });

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="mb-10">
          <span className="tf-chip mb-4">Your Atelier</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 text-balance">Track every stitch.</h1>
          <p className="text-[color:var(--brand-dark)]/60 mt-2">Follow your bespoke pieces from confirmation to delivery.</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[0, 1].map((i) => <div key={i} className="tf-skeleton h-48" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-10 text-center">
            <p className="text-[color:var(--brand-dark)]/60 mb-6">You don't have any orders yet.</p>
            <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((o) => {
              const currentIdx = o.status === "cancelled" ? -1 : statusIndex(o.status);
              const rows = (history ?? []).filter((h) => h.order_id === o.id);
              return (
                <article key={o.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-6 sm:p-8 animate-fade-up">
                  <header className="flex flex-wrap justify-between items-start gap-4 mb-6 pb-6 border-b border-[color:var(--brand-dark)]/10">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Order {o.order_number}</p>
                      <h2 className="font-display text-xl sm:text-2xl mt-1">{o.sofa_snapshot?.name ?? "Custom Piece"}</h2>
                      <p className="text-xs text-[color:var(--brand-dark)]/50 mt-1">
                        Placed {formatDate(o.created_at)}
                        {o.delivery_city && ` · ${o.delivery_city}`}
                        {o.fabric_snapshot?.name && ` · ${o.fabric_snapshot.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={o.status} />
                      <p className="font-display text-lg">{formatINR(Number(o.total))}</p>
                      <p className="text-xs text-[color:var(--brand-dark)]/50">
                        Balance due {formatINR(Number(o.balance_due))}
                      </p>
                      {o.expected_delivery_date && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mt-2">
                          ETA {formatDate(o.expected_delivery_date)}
                        </p>
                      )}
                    </div>
                  </header>

                  {o.status === "pending_deposit" && (
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-amber-50 border border-amber-200 p-4">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-900">Deposit pending</p>
                        <p className="text-sm text-amber-900/80 mt-1">
                          Pay {formatINR(Math.round(Number(o.total) * 0.2))} to confirm your build slot.
                        </p>
                      </div>
                      <Link
                        to="/payment"
                        search={{ orders: o.id }}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 10V7a6 6 0 1112 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/></svg>
                        Complete Payment
                      </Link>
                    </div>
                  )}

                  {o.status === "cancelled" ? (
                    <div className="bg-red-50 text-red-800 p-4 text-sm">
                      This order was cancelled.
                      {o.cancellation_reason && <div className="mt-1 italic">Reason: {o.cancellation_reason}</div>}
                    </div>
                  ) : o.status === "refunded" ? (
                    <div className="bg-red-50 text-red-800 p-4 text-sm">
                      Refunded {o.refund_amount ? `· ${formatINR(Number(o.refund_amount))}` : ""}
                      {o.refund_reason && <div className="mt-1 italic">Reason: {o.refund_reason}</div>}
                    </div>
                  ) : (
                    <ol className="relative">
                      {ORDER_STATUS_STEPS.map((step, idx) => {
                        const done = idx <= currentIdx;
                        const active = idx === currentIdx;
                        const rec = rows.find((r) => r.status === step.key);
                        return (
                          <li key={step.key} className="grid grid-cols-[24px_1fr] gap-4 pb-6 last:pb-0 relative">
                            {idx < ORDER_STATUS_STEPS.length - 1 && (
                              <span className={`absolute left-[11px] top-6 bottom-0 w-px ${done ? "bg-[color:var(--brand-accent)]" : "bg-[color:var(--brand-dark)]/15"}`} />
                            )}
                            <div className="relative">
                              <span className={`block size-6 rounded-full border-2 ${done ? "bg-[color:var(--brand-accent)] border-[color:var(--brand-accent)]" : "border-[color:var(--brand-dark)]/20 bg-white"}`}>
                                {done && <svg viewBox="0 0 24 24" className="size-full p-1 text-[color:var(--brand-dark)]" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>}
                              </span>
                            </div>
                            <div className={`min-w-0 ${active ? "" : done ? "" : "opacity-50"}`}>
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-semibold">{step.label}</p>
                                {rec && <time className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">{formatDate(rec.created_at)}</time>}
                              </div>
                              <p className="text-xs text-[color:var(--brand-dark)]/60 mt-1">{step.description}</p>
                              {rec?.note && <p className="text-xs italic text-[color:var(--brand-dark)]/50 mt-1">"{rec.note}"</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {(o.status === "cancellation_requested" || o.status === "refund_requested") && (
                    <div className="mt-6 bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                      {o.status === "cancellation_requested" ? "Cancellation requested — our team will confirm shortly." : "Refund request received — our team will review and get back within 2 business days."}
                      {(o.cancellation_reason || o.refund_reason) && (
                        <div className="mt-1 italic">Reason: {o.cancellation_reason || o.refund_reason}</div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-[color:var(--brand-dark)]/10 flex flex-wrap gap-3">
                    <Link
                      to="/orders/$id/receipt"
                      params={{ id: o.id }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-[color:var(--brand-dark)]/20 text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      View Receipt
                    </Link>
                    {canUserCancel(o.status) && (
                      <ActionButton
                        label="Cancel Order"
                        prompt="Tell us why you're cancelling (optional):"
                        confirm="Cancel this order? This cannot be undone."
                        pending={requestAction.isPending}
                        onSubmit={(reason) => requestAction.mutate({ orderId: o.id, action: "cancel", reason })}
                        tone="danger"
                      />
                    )}
                    {canUserRequestRefund(o.status) && (
                      <ActionButton
                        label="Request Refund"
                        prompt="Please share the reason for your refund request:"
                        confirm=""
                        pending={requestAction.isPending}
                        onSubmit={(reason) => requestAction.mutate({ orderId: o.id, action: "refund", reason })}
                        tone="warning"
                        requireReason
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral" as const };
  const toneClass = {
    neutral: "bg-neutral-100 text-neutral-700",
    positive: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  }[meta.tone];
  return (
    <span className={`inline-block mb-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${toneClass}`}>{meta.label}</span>
  );
}

function ActionButton({
  label,
  prompt,
  confirm,
  pending,
  onSubmit,
  tone,
  requireReason,
}: {
  label: string;
  prompt: string;
  confirm: string;
  pending: boolean;
  onSubmit: (reason: string) => void;
  tone: "danger" | "warning";
  requireReason?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const toneClass = tone === "danger"
    ? "border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600"
    : "border-amber-300 text-amber-800 hover:bg-amber-600 hover:text-white hover:border-amber-600";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={`inline-flex items-center gap-2 px-4 py-2.5 border text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-60 ${toneClass}`}
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-2">{label}</h3>
            {confirm && <p className="text-sm text-neutral-600 mb-3">{confirm}</p>}
            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">{prompt}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-neutral-300 p-2 text-sm"
              placeholder="Reason…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-600">Back</button>
              <button
                type="button"
                disabled={pending || (requireReason && !reason.trim())}
                onClick={() => { onSubmit(reason.trim()); setOpen(false); setReason(""); }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60 ${tone === "danger" ? "bg-red-600" : "bg-amber-600"}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}