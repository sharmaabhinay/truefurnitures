import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { sendOrderConfirmationEmail } from "@/lib/email.functions";

// Razorpay webhook: https://razorpay.com/docs/webhooks/
// Signature: HMAC-SHA256(raw_body, webhook_secret) sent in X-Razorpay-Signature.
export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set");
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event: string = payload?.event ?? "";
        const paymentEntity = payload?.payload?.payment?.entity;
        const rzpOrderId: string | undefined = paymentEntity?.order_id;
        const rzpPaymentId: string | undefined = paymentEntity?.id;

        // We only need to react to successful captures. Ignore other events (authorized/failed/refund handled elsewhere).
        if (event !== "payment.captured" || !rzpOrderId || !rzpPaymentId) {
          return new Response("ok", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: orders, error } = await supabaseAdmin
          .from("orders")
          .select("id, total, deposit_paid, status")
          .eq("razorpay_order_id", rzpOrderId);
        if (error) {
          console.error("[razorpay-webhook] lookup failed", error);
          return new Response("Lookup failed", { status: 500 });
        }
        if (!orders || orders.length === 0) {
          // Unknown order — acknowledge so Razorpay stops retrying.
          return new Response("ok", { status: 200 });
        }

        const nowIso = new Date().toISOString();
        const confirmedIds: string[] = [];
        for (const row of orders as Array<{ id: string; total: number; deposit_paid: number; status: string }>) {
          if (row.status === "confirmed" || row.status === "in_production" || row.status === "shipped" || row.status === "delivered") {
            continue; // already advanced; idempotent no-op
          }
          const total = Number(row.total) || 0;
          const deposit = Math.round(total * 0.2);
          const balance = Math.max(0, total - deposit);
          const { error: uerr } = await supabaseAdmin
            .from("orders")
            .update({
              deposit_paid: deposit,
              balance_due: balance,
              status: "confirmed",
              razorpay_payment_id: rzpPaymentId,
              paid_at: nowIso,
            })
            .eq("id", row.id);
          if (uerr) console.error("[razorpay-webhook] update failed", row.id, uerr);
          else confirmedIds.push(row.id);
        }

        for (const id of confirmedIds) {
          try {
            await sendOrderConfirmationEmail({ data: { orderId: id } });
          } catch (e) {
            console.error("[razorpay-webhook] email failed", id, e);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});