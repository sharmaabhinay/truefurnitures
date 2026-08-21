import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { sendOrderConfirmationEmail, sendDepositStatusNotification } from "@/lib/email.functions";

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

        const { adminGetDoc, adminSetDoc, adminQuery } = await import(
          "@/lib/firebase-admin.server"
        );

        // Idempotency: Razorpay retries the same event id, so the event id doubles as
        // the payment_events document id — a repeat delivery finds the existing doc.
        const eventId =
          request.headers.get("x-razorpay-event-id") ??
          `${event}:${rzpPaymentId ?? "none"}:${rzpOrderId ?? "none"}`;
        const eventDocId = eventId.replace(/\//g, "_");

        const existing = await adminGetDoc("payment_events", eventDocId);
        if (existing && existing['status'] !== "received") {
          console.log("[razorpay-webhook] duplicate event ignored", eventId);
          return new Response("ok (duplicate)", { status: 200 });
        }
        await adminSetDoc("payment_events", eventDocId, {
          event_id: eventId,
          event_type: event || "unknown",
          razorpay_order_id: rzpOrderId ?? null,
          razorpay_payment_id: rzpPaymentId ?? null,
          amount: paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : null,
          currency: paymentEntity?.currency ?? null,
          status: "received",
          created_at: new Date().toISOString(),
          payload: JSON.stringify(payload).slice(0, 20000),
        });

        const markEvent = async (status: string, patch: Record<string, unknown> = {}) => {
          await adminSetDoc("payment_events", eventDocId, { status, ...patch });
        };

        // Failed/pending payments: notify the customer with a retry link.
        if ((event === "payment.failed" || event === "payment.authorized") && rzpOrderId) {
          try {
            const failedOrders = (await adminQuery("orders", [
              { field: "razorpay_order_id", value: rzpOrderId },
            ])) as Array<Record<string, unknown> & { id: string }>;
            for (const row of failedOrders) {
              await sendDepositStatusNotification({
                data: {
                  orderId: row.id,
                  state: event === "payment.failed" ? "failed" : "pending",
                  reason: (paymentEntity?.error_description as string | undefined) ?? null,
                },
              });
            }
          } catch (e) {
            console.error("[razorpay-webhook] failure notification failed", e);
          }
          await markEvent("notified");
          return new Response("ok", { status: 200 });
        }

        // We only need to react to successful captures. Other events are logged only.
        if (event !== "payment.captured" || !rzpOrderId || !rzpPaymentId) {
          await markEvent("ignored");
          return new Response("ok", { status: 200 });
        }


        let orders: Array<Record<string, unknown> & { id: string }> = [];
        try {
          orders = (await adminQuery("orders", [
            { field: "razorpay_order_id", value: rzpOrderId },
          ])) as Array<Record<string, unknown> & { id: string }>;
        } catch (error) {
          console.error("[razorpay-webhook] lookup failed", error);
          await markEvent("failed", { error: String(error) });
          return new Response("Lookup failed", { status: 500 });
        }
        if (orders.length === 0) {
          // Unknown order — acknowledge so Razorpay stops retrying.
          await markEvent("order_not_found");
          return new Response("ok", { status: 200 });
        }

        const nowIso = new Date().toISOString();
        const confirmedIds: string[] = [];
        for (const row of orders) {
          const status = String(row['status'] ?? "");
          if (["confirmed", "in_production", "shipped", "delivered"].includes(status)) {
            continue; // already advanced; idempotent no-op
          }
          const total = Number(row['total']) || 0;
          const deposit = Math.round(total * 0.2);
          const balance = Math.max(0, total - deposit);
          try {
            await adminSetDoc("orders", row.id, {
              deposit_paid: deposit,
              balance_due: balance,
              status: "confirmed",
              razorpay_payment_id: rzpPaymentId,
              paid_at: nowIso,
              updated_at: nowIso,
            });
            confirmedIds.push(row.id);
          } catch (uerr) {
            console.error("[razorpay-webhook] update failed", row.id, uerr);
          }
        }

        for (const id of confirmedIds) {
          try {
            await sendOrderConfirmationEmail({ data: { orderId: id } });
          } catch (e) {
            console.error("[razorpay-webhook] email failed", id, e);
          }
        }

        await markEvent(confirmedIds.length > 0 ? "processed" : "already_processed", {
          order_id: orders[0]?.id ?? null,
        });

        return new Response("ok", { status: 200 });
      },
    },
  },
});