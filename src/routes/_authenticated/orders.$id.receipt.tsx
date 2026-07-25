import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate, STATUS_META } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders/$id/receipt")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order Receipt — True Furniture's" },
      { name: "description", content: "Your bespoke sofa order receipt and tax invoice." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceiptPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  discount_code: string | null;
  total: number;
  deposit_paid: number;
  balance_due: number;
  refund_amount: number | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  expected_delivery_date: string | null;
  delivery_city: string | null;
  delivery_address: string | null;
  phone: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  sofa_snapshot: { name?: string; image?: string; quantity?: number } | null;
  fabric_snapshot: { name?: string } | null;
  size_snapshot: { label?: string } | null;
  addons_snapshot: Array<{ name?: string; price?: number }> | null;
  user_id: string;
};

function ReceiptPage() {
  const { id } = Route.useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as OrderRow | null;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["receipt-profile", order?.user_id],
    enabled: !!order?.user_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", order!.user_id).maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-white p-10 text-center text-sm text-neutral-500">Loading receipt…</div>;
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-white p-10 text-center">
        <p className="text-neutral-600 mb-6">Receipt not available.</p>
        <Link to="/dashboard" className="underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  const meta = STATUS_META[order.status] ?? { label: order.status, tone: "neutral" as const };
  const paidBadge = order.paid_at ? "PAID" : order.status === "cancelled" ? "CANCELLED" : "UNPAID";
  const addons = order.addons_snapshot ?? [];
  const gst = Math.round(Number(order.subtotal || 0) * 0.18 * 100) / 100;
  const preTax = Math.max(0, Number(order.subtotal || 0) - gst);

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white text-neutral-900 py-8 print:py-0">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .receipt-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      {/* Top action bar */}
      <div className="no-print max-w-3xl mx-auto px-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/dashboard" className="text-xs font-bold uppercase tracking-widest text-neutral-600 hover:text-neutral-900">← Back to dashboard</Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Receipt sheet */}
      <article className="receipt-sheet max-w-3xl mx-auto bg-white border border-neutral-200 shadow-sm p-8 sm:p-12">
        <header className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-neutral-200">
          <div>
            <p className="font-display text-3xl tracking-tight">True Furniture's</p>
            <p className="text-xs text-neutral-500 mt-1">Bespoke sofas · Indore & Ujjain</p>
            <p className="text-xs text-neutral-500">GSTIN: 23AAAAA0000A1Z5 · +91 77738 96496</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Tax Invoice / Receipt</p>
            <p className="font-mono text-lg mt-1">{order.order_number}</p>
            <p className="text-xs text-neutral-500">Issued {formatDate(order.paid_at ?? order.created_at)}</p>
            <span
              className={`inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                paidBadge === "PAID" ? "bg-emerald-100 text-emerald-800" :
                paidBadge === "CANCELLED" ? "bg-red-100 text-red-800" :
                "bg-amber-100 text-amber-800"
              }`}
            >
              {paidBadge}
            </span>
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-6 py-6 border-b border-neutral-200 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Billed to</p>
            <p className="font-medium">{profile?.full_name ?? "Customer"}</p>
            {order.phone && <p className="text-neutral-600">{order.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Deliver to</p>
            <p className="whitespace-pre-wrap text-neutral-700">
              {order.delivery_address ?? "—"}
              {order.delivery_city ? `\n${order.delivery_city}` : ""}
            </p>
            {order.expected_delivery_date && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-2">
                ETA {formatDate(order.expected_delivery_date)}
              </p>
            )}
          </div>
        </section>

        <section className="py-6 border-b border-neutral-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">Order details</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-3">
                  <p className="font-medium">{order.sofa_snapshot?.name ?? "Custom sofa"}</p>
                  <p className="text-xs text-neutral-500">
                    {[order.size_snapshot?.label, order.fabric_snapshot?.name].filter(Boolean).join(" · ") || "Custom configuration"}
                    {order.sofa_snapshot?.quantity ? ` · Qty ${order.sofa_snapshot.quantity}` : ""}
                  </p>
                </td>
                <td className="py-3 text-right font-mono">{formatINR(Number(order.subtotal) - addons.reduce((s, a) => s + Number(a.price ?? 0), 0))}</td>
              </tr>
              {addons.map((a, i) => (
                <tr key={i}>
                  <td className="py-3 pl-4 text-neutral-600">+ {a.name}</td>
                  <td className="py-3 text-right font-mono">{formatINR(Number(a.price ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="py-6 border-b border-neutral-200">
          <dl className="space-y-2 text-sm max-w-sm ml-auto">
            <Row k="Subtotal (incl. GST)" v={formatINR(Number(order.subtotal))} />
            <Row k="Taxable value" v={formatINR(preTax)} muted />
            <Row k="GST @ 18% (incl.)" v={formatINR(gst)} muted />
            {Number(order.discount) > 0 && (
              <Row k={`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`} v={`− ${formatINR(Number(order.discount))}`} />
            )}
            <div className="border-t border-neutral-300 pt-2 mt-2">
              <Row k="Order Total" v={formatINR(Number(order.total))} strong />
            </div>
            <Row k="Deposit paid" v={formatINR(Number(order.deposit_paid))} />
            <Row k="Balance on delivery" v={formatINR(Number(order.balance_due))} />
            {order.refund_amount ? (
              <Row k="Refund issued" v={`− ${formatINR(Number(order.refund_amount))}`} />
            ) : null}
          </dl>
        </section>

        <section className="py-6 text-xs text-neutral-600 space-y-2">
          <p><span className="font-bold uppercase tracking-widest text-neutral-500">Status:</span> {meta.label}</p>
          {order.razorpay_payment_id && (
            <p><span className="font-bold uppercase tracking-widest text-neutral-500">Payment ref:</span> <span className="font-mono">{order.razorpay_payment_id}</span></p>
          )}
          {order.razorpay_order_id && (
            <p><span className="font-bold uppercase tracking-widest text-neutral-500">Razorpay order:</span> <span className="font-mono">{order.razorpay_order_id}</span></p>
          )}
          {order.paid_at && (
            <p><span className="font-bold uppercase tracking-widest text-neutral-500">Paid on:</span> {new Date(order.paid_at).toLocaleString("en-IN")}</p>
          )}
          {order.refunded_at && (
            <p><span className="font-bold uppercase tracking-widest text-neutral-500">Refunded on:</span> {new Date(order.refunded_at).toLocaleString("en-IN")}</p>
          )}
        </section>

        <footer className="pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
          Thank you for choosing True Furniture's. Every piece is hand-built by master craftsmen in Indore & Ujjain.
          <br />For support, WhatsApp us at +91 77738 96496 · support@truefurnitures.in
        </footer>
      </article>
    </div>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-neutral-500 text-xs" : ""} ${strong ? "text-base font-semibold" : ""}`}>
      <dt>{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}