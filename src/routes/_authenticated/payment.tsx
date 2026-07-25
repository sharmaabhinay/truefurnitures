import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PaymentMethods } from "@/components/payment-methods";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, estimatedDelivery } from "@/lib/format";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { toast } from "sonner";

const searchSchema = z.object({
  orders: z.string().min(1),
});

export const Route = createFileRoute("/_authenticated/payment")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Complete Payment — True Furniture's" },
      { name: "description", content: "Pay your 20% booking deposit securely via UPI, cards, netbanking or wallets." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Complete Payment — True Furniture's" },
      { property: "og:description", content: "Secure deposit payment for your bespoke sofa order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentPage,
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
  expected_delivery_date: string | null;
  sofa_snapshot: { name?: string; image?: string; quantity?: number } | null;
  fabric_snapshot: { name?: string } | null;
};

function PaymentPage() {
  const { orders: ordersParam } = Route.useSearch();
  const navigate = useNavigate();
  const createRzp = useServerFn(createRazorpayOrder);
  const verifyRzp = useServerFn(verifyRazorpayPayment);
  const [processing, setProcessing] = useState(false);

  const orderIds = useMemo(
    () => String(ordersParam).split(",").map((s: string) => s.trim()).filter(Boolean),
    [ordersParam],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-orders", orderIds.join(",")],
    enabled: orderIds.length > 0,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, deposit_paid, balance_due, status, delivery_city, phone, expected_delivery_date, sofa_snapshot, fabric_snapshot")
        .in("id", orderIds);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const orders = data ?? [];
  const total = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const deposit = orders.reduce((s, o) => {
    const d = Math.round(Number(o.total || 0) * 0.2);
    return s + Math.max(0, d - Number(o.deposit_paid || 0));
  }, 0);
  const balance = total - deposit;
  const allPaid = orders.length > 0 && orders.every((o) => o.status !== "pending_deposit");

  const pay = async () => {
    if (processing) return;
    setProcessing(true);
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
          navigate({ to: "/dashboard" });
        },
        onDismiss: () => {
          toast.info("Payment cancelled. You can complete it anytime from your dashboard.");
          setProcessing(false);
          refetch();
        },
        onError: (err) => {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Payment failed");
          setProcessing(false);
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not start payment");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        <div className="mb-8">
          <span className="tf-chip mb-4">Step 2 of 2</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 text-balance">Complete your payment</h1>
          <p className="text-[color:var(--brand-dark)]/60 mt-2 max-w-2xl">
            Pay a 20% booking deposit to lock in your build slot. The balance is due on delivery.
          </p>
        </div>

        {isLoading ? (
          <div className="tf-skeleton h-96" />
        ) : orders.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-10 text-center bg-white">
            <p className="text-[color:var(--brand-dark)]/60 mb-6">We couldn't find those orders.</p>
            <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">Browse Collections</Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <PaymentMethods />

              <section className="bg-white border border-[color:var(--brand-dark)]/10 p-6">
                <h2 className="font-display text-lg mb-4">Your Order{orders.length > 1 ? "s" : ""}</h2>
                <div className="divide-y divide-[color:var(--brand-dark)]/10">
                  {orders.map((o) => (
                    <div key={o.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="size-16 shrink-0 bg-[color:var(--brand-muted)] overflow-hidden">
                        {o.sofa_snapshot?.image ? <img src={o.sofa_snapshot.image} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Order {o.order_number}</p>
                        <p className="font-display text-base truncate">{o.sofa_snapshot?.name ?? "Custom Piece"}</p>
                        <p className="text-xs text-[color:var(--brand-dark)]/55 capitalize">
                          {o.fabric_snapshot?.name}{o.sofa_snapshot?.quantity ? ` · Qty ${o.sofa_snapshot.quantity}` : ""}{o.delivery_city ? ` · ${o.delivery_city}` : ""}
                        </p>
                        {o.status !== "pending_deposit" && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">✓ Deposit paid</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-display">{formatINR(Number(o.total))}</p>
                        <p className="text-[10px] text-[color:var(--brand-dark)]/50 uppercase tracking-widest">Deposit {formatINR(Math.round(Number(o.total) * 0.2))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[color:var(--brand-muted)]/50 border border-[color:var(--brand-dark)]/10 p-6 text-sm text-[color:var(--brand-dark)]/70">
                <p className="font-display text-base text-[color:var(--brand-dark)] mb-1">Reserve · Pay Later</p>
                Your card is charged only the 20% deposit today. The remaining balance is collected on delivery — cash, UPI, or card at the doorstep.
              </section>
            </div>

            <aside className="bg-white border border-[color:var(--brand-dark)]/10 p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-display text-xl mb-4">Payment Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Order total</span><span>{formatINR(total)}</span></div>
                <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Delivery</span><span>Free</span></div>
              </div>
              <div className="bg-[color:var(--brand-muted)]/60 p-3 mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold uppercase tracking-widest">Pay Now (20%)</span>
                  <span className="font-display text-lg">{formatINR(deposit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[color:var(--brand-dark)]/60">Balance on delivery</span>
                  <span>{formatINR(balance)}</span>
                </div>
                <div className="text-[10px] text-[color:var(--brand-dark)]/60 pt-1">Estimated delivery by {estimatedDelivery(30)}.</div>
              </div>

              {allPaid ? (
                <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 text-sm text-center">
                  Deposit received. Track your order in your dashboard.
                  <Link to="/dashboard" className="mt-3 block text-[10px] font-bold uppercase tracking-widest underline">Go to Dashboard →</Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pay}
                  disabled={processing || deposit <= 0}
                  className="mt-6 w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 10V7a6 6 0 1112 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/></svg>
                  {processing ? "Opening…" : `Pay ${formatINR(deposit)} Securely`}
                </button>
              )}
              <Link to="/dashboard" className="mt-3 block text-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)]">
                Pay Later — Save for Dashboard
              </Link>
              <p className="mt-4 text-[10px] text-[color:var(--brand-dark)]/50 text-center">Secured by Razorpay · 256-bit SSL · PCI DSS</p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}