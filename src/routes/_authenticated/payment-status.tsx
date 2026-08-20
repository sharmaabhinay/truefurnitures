import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FiCheckCircle, FiAlertTriangle, FiClock, FiRefreshCw, FiMessageCircle } from "react-icons/fi";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsGet } from "@/lib/db/firestore";
import { formatINR, estimatedDelivery } from "@/lib/format";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { toast } from "sonner";

const searchSchema = z.object({
  orders: z.string().min(1),
  status: z.enum(["success", "failed", "pending"]).optional(),
  reason: z.string().max(300).optional(),
});

export const Route = createFileRoute("/_authenticated/payment-status")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Payment Status — True Furniture's" },
      { name: "description", content: "Check whether your booking deposit went through and retry it if the payment is pending or failed." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Payment Status — True Furniture's" },
      { property: "og:description", content: "Deposit payment status for your bespoke sofa order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentStatusPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  deposit_paid: number;
  balance_due: number;
  status: string;
  delivery_city: string | null;
  phone: string | null;
  sofa_snapshot: { name?: string; image?: string; quantity?: number } | null;
  fabric_snapshot: { name?: string } | null;
};

function PaymentStatusPage() {
  const { orders: ordersParam, status: statusParam, reason } = Route.useSearch();
  const navigate = useNavigate();
  const createRzp = useServerFn(createRazorpayOrder);
  const verifyRzp = useServerFn(verifyRazorpayPayment);
  const [retrying, setRetrying] = useState(false);

  const orderIds = useMemo(
    () => String(ordersParam).split(",").map((s) => s.trim()).filter(Boolean),
    [ordersParam],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["payment-status-orders", orderIds.join(",")],
    enabled: orderIds.length > 0,
    queryFn: async (): Promise<OrderRow[]> => {
      const rows = await Promise.all(orderIds.map((id) => fsGet<OrderRow>(COL.orders, id)));
      return rows.filter((r): r is OrderRow => !!r);
    },
  });

  const orders = data ?? [];
  const total = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const dueNow = orders.reduce((s, o) => {
    const d = Math.round(Number(o.total || 0) * 0.2);
    return s + Math.max(0, d - Number(o.deposit_paid || 0));
  }, 0);

  const allPaid = orders.length > 0 && dueNow <= 0;
  // Truth comes from the order records; the search param is only a hint.
  const state: "success" | "failed" | "pending" = allPaid
    ? "success"
    : statusParam === "failed"
      ? "failed"
      : "pending";

  const retry = async () => {
    if (retrying || dueNow <= 0) return;
    setRetrying(true);
    const first = orders[0];
    try {
      await openRazorpayCheckout({
        createRzp,
        verifyRzp,
        orderIds,
        city: first?.delivery_city ?? undefined,
        prefill: { contact: first?.phone ?? undefined },
        onSuccess: () => {
          toast.success("Payment received! Your order is confirmed.");
          setRetrying(false);
          refetch();
          navigate({ to: "/payment-status", search: { orders: orderIds.join(","), status: "success" } });
        },
        onDismiss: () => {
          toast.info("Payment cancelled. You can retry anytime.");
          setRetrying(false);
          refetch();
        },
        onError: (err) => {
          console.error(err);
          const msg = err instanceof Error ? err.message : "Payment failed";
          toast.error(msg);
          setRetrying(false);
          refetch();
          navigate({ to: "/payment-status", search: { orders: orderIds.join(","), status: "failed", reason: msg } });
        },
      });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not start payment";
      toast.error(msg);
      setRetrying(false);
      navigate({ to: "/payment-status", search: { orders: orderIds.join(","), status: "failed", reason: msg } });
    }
  };

  const tone =
    state === "success"
      ? { ring: "border-emerald-200", bg: "bg-emerald-50", fg: "text-emerald-800", Icon: FiCheckCircle }
      : state === "failed"
        ? { ring: "border-red-200", bg: "bg-red-50", fg: "text-red-800", Icon: FiAlertTriangle }
        : { ring: "border-amber-200", bg: "bg-amber-50", fg: "text-amber-900", Icon: FiClock };

  const headline =
    state === "success"
      ? "Payment successful"
      : state === "failed"
        ? "Payment failed"
        : "Payment pending";

  const blurb =
    state === "success"
      ? "Your 20% booking deposit is received and your build slot is locked in. The balance is due on delivery."
      : state === "failed"
        ? reason || "The payment didn't go through. No deposit has been charged — you can safely retry."
        : "We haven't received your deposit yet. If money was debited, it will auto-reconcile within a few minutes — otherwise retry below.";

  const firstId = orderIds[0];

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        {isLoading ? (
          <div className="tf-skeleton h-96" />
        ) : orders.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-10 text-center bg-white">
            <p className="text-[color:var(--brand-dark)]/60 mb-6">We couldn't find those orders.</p>
            <Link to="/dashboard" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors cursor-pointer">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <section className={`border ${tone.ring} ${tone.bg} p-8 text-center animate-in fade-in duration-500`}>
              <tone.Icon className={`mx-auto size-12 ${tone.fg}`} aria-hidden />
              <h1 className={`font-display text-3xl sm:text-4xl mt-4 ${tone.fg}`}>{headline}</h1>
              <p className="mt-3 text-sm text-[color:var(--brand-dark)]/70 max-w-xl mx-auto">{blurb}</p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {state === "success" ? (
                  <>
                    {firstId && (
                      <Link
                        to="/orders/$id/receipt"
                        params={{ id: firstId }}
                        className="px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors cursor-pointer"
                      >
                        View Receipt
                      </Link>
                    )}
                    <Link to="/dashboard" className="px-6 py-4 border border-[color:var(--brand-dark)] text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors cursor-pointer">
                      Track Order
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={retry}
                      disabled={retrying || dueNow <= 0}
                      className="px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
                    >
                      <FiRefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
                      {retrying ? "Opening…" : `Retry Payment · ${formatINR(dueNow)}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={isFetching}
                      className="px-6 py-4 border border-[color:var(--brand-dark)] text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isFetching ? "Checking…" : "Check Again"}
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white border border-[color:var(--brand-dark)]/10 p-6 mt-8">
              <h2 className="font-display text-lg mb-4">Order{orders.length > 1 ? "s" : ""}</h2>
              <div className="divide-y divide-[color:var(--brand-dark)]/10">
                {orders.map((o) => {
                  const deposit = Math.round(Number(o.total || 0) * 0.2);
                  const paid = Number(o.deposit_paid || 0) >= deposit;
                  return (
                    <div key={o.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="size-16 shrink-0 bg-[color:var(--brand-muted)] overflow-hidden">
                        {o.sofa_snapshot?.image ? <img src={o.sofa_snapshot.image} alt="" loading="lazy" className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Order {o.order_number}</p>
                        <p className="font-display text-base truncate">{o.sofa_snapshot?.name ?? "Custom Piece"}</p>
                        <p className="text-xs text-[color:var(--brand-dark)]/55 capitalize">
                          {o.fabric_snapshot?.name}{o.sofa_snapshot?.quantity ? ` · Qty ${o.sofa_snapshot.quantity}` : ""}{o.delivery_city ? ` · ${o.delivery_city}` : ""}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-widest ${paid ? "text-emerald-700" : "text-amber-700"}`}>
                          {paid ? "✓ Deposit paid" : "Deposit pending"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-display">{formatINR(Number(o.total))}</p>
                        <p className="text-[10px] text-[color:var(--brand-dark)]/50 uppercase tracking-widest">Deposit {formatINR(deposit)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 bg-[color:var(--brand-muted)]/60 p-4 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Order total</span><span>{formatINR(total)}</span></div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase tracking-widest">{allPaid ? "Deposit paid" : "Due now (20%)"}</span>
                  <span className="font-display text-base">{formatINR(allPaid ? total - orders.reduce((s, o) => s + Number(o.balance_due || 0), 0) : dueNow)}</span>
                </div>
                <div className="text-[10px] text-[color:var(--brand-dark)]/60 pt-1">Estimated delivery by {estimatedDelivery(30)}.</div>
              </div>
            </section>

            <p className="mt-6 text-center text-xs text-[color:var(--brand-dark)]/60 inline-flex w-full items-center justify-center gap-2">
              <FiMessageCircle className="size-4" aria-hidden />
              Money debited but still pending? <Link to="/messages" className="underline cursor-pointer">Message us</Link> and we'll reconcile it.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
