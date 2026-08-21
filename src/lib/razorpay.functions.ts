import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

// Create a Razorpay order for the given order UUIDs (belonging to the caller).
// Sums their (balance-safe) deposit amounts and returns Razorpay order info + public key id.
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input) =>
    z.object({ orderIds: z.array(z.string().min(1)).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { adminGetDoc, adminSetDoc } = await import("@/lib/firebase-admin.server");
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");

    const fetched = await Promise.all(data.orderIds.map((id) => adminGetDoc("orders", id)));
    const rows = fetched.filter(
      (row): row is NonNullable<typeof row> => !!row && row['user_id'] === userId,
    );
    if (rows.length !== data.orderIds.length) throw new Error("Orders not found");

    const depositTotalRupees = rows.reduce((sum, r) => {
      const total = Number(r['total']) || 0;
      const paid = Number(r['deposit_paid']) || 0;
      const deposit = Math.round(total * 0.2);
      return sum + Math.max(0, deposit - paid);
    }, 0);
    if (depositTotalRupees <= 0) throw new Error("Nothing to pay");

    const amountPaise = Math.round(depositTotalRupees * 100);
    const receipt = `dep_${Date.now().toString(36)}`;

    const body = new URLSearchParams({
      amount: String(amountPaise),
      currency: "INR",
      receipt,
      "notes[user_id]": userId,
      "notes[order_ids]": data.orderIds.join(","),
    });

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Razorpay order create failed", res.status, text);
      throw new Error("Payment provider error");
    }
    const rp = (await res.json()) as { id: string; amount: number; currency: string };

    // Persist rzp order id on each order for tracking
    await Promise.all(
      rows.map((row) => adminSetDoc("orders", row.id, { razorpay_order_id: rp.id })),
    );

    return {
      keyId,
      razorpayOrderId: rp.id,
      amount: rp.amount,
      currency: rp.currency,
      orderIds: data.orderIds,
    };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input) =>
    z
      .object({
        razorpay_order_id: z.string().min(4),
        razorpay_payment_id: z.string().min(4),
        razorpay_signature: z.string().min(4),
        orderIds: z.array(z.string().min(1)).min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { adminGetDoc, adminSetDoc } = await import("@/lib/firebase-admin.server");
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay keys not configured");

    // Verify HMAC-SHA256 signature: sha256(order_id + "|" + payment_id, key_secret)
    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }

    // Load caller's matching orders, update deposit_paid + status
    const fetched = await Promise.all(data.orderIds.map((id) => adminGetDoc("orders", id)));
    const rows = fetched.filter(
      (row): row is NonNullable<typeof row> =>
        !!row &&
        row['user_id'] === userId &&
        row['razorpay_order_id'] === data.razorpay_order_id,
    );
    if (rows.length === 0) throw new Error("Order not found");

    const nowIso = new Date().toISOString();
    for (const r of rows) {
      const total = Number(r['total']) || 0;
      const deposit = Math.round(total * 0.2);
      const balance = Math.max(0, total - deposit);
      await adminSetDoc("orders", r.id, {
        deposit_paid: deposit,
        balance_due: balance,
        status: "confirmed",
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        paid_at: nowIso,
        updated_at: nowIso,
      });
    }

    // Send the Resend receipt email (non-fatal if it fails; webhook is a backstop).
    try {
      const { sendOrderConfirmationEmail, sendDepositStatusNotification } = await import(
        "@/lib/email.functions"
      );
      for (const r of rows) {
        await sendOrderConfirmationEmail({ data: { orderId: r.id } });
        await sendDepositStatusNotification({ data: { orderId: r.id, state: "paid" } });
      }
    } catch (e) {
      console.error("[razorpay] confirmation email failed", e);
    }

    return { ok: true, count: rows.length };
  });