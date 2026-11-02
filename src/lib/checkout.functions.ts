import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import { allocateCouponDiscount, type CouponRule } from "./coupon-rules";

export const placeCheckoutOrders = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((v: unknown) => z.object({ code: z.string().max(40).nullable(), checkoutId: z.string().uuid(), orders: z.array(z.record(z.string(), z.unknown())).min(1).max(50) }).parse(v))
  .handler(async ({ data, context }) => {
    const { adminTransaction, adminQuery } = await import("./firebase-admin.server");
    const { checkCustomerCoupon } = await import("./coupon.server");
    return adminTransaction(async tx => {
      const receiptId = `${context.userId}_${data.checkoutId}`;
      const receipt = await tx.get("checkout_receipts", receiptId);
      if (receipt) return receipt['order_ids'] as string[];
      const lines = data.orders.map(o => ({ sofaId: String(o['sofa_id']), lineTotal: Number(o['subtotal']) }));
      if (lines.some(l => !Number.isFinite(l.lineTotal) || l.lineTotal < 0)) throw new Error("Invalid order value");
      let discounts = lines.map(() => 0);
      if (data.code) {
        const found = await adminQuery("coupons", [{ field: "code", value: data.code.toUpperCase() }], { limit: 1 });
        const id = found[0]?.id;
        if (!id) throw new Error("Invalid or inactive coupon");
        const locked = await tx.get("coupons", id);
        if (!locked) throw new Error("Coupon unavailable");
        const result = await checkCustomerCoupon(data.code, context.userId, lines, locked as CouponRule & { id: string });
        if (!result.ok) throw new Error(result.error);
        discounts = allocateCouponDiscount(lines, result.discount, result.eligibleSofaIds);
        tx.set("coupons", id, { uses_count: Number(locked['uses_count'] ?? 0) + 1 });
      }
      const now = new Date().toISOString();
      const orderIds = data.orders.map((o, i) => {
        const id = crypto.randomUUID();
        const total = (lines[i]?.lineTotal ?? 0) - (discounts[i] ?? 0);
        tx.set("orders", id, { ...o, user_id: context.userId, checkout_id: data.checkoutId, discount_code: data.code?.toUpperCase() ?? null, discount: discounts[i] ?? 0, total, balance_due: total - Math.round(total * .2), deposit_paid: 0, status: "pending_deposit", created_at: now });
        tx.set("order_status_history", crypto.randomUUID(), { order_id: id, user_id: context.userId, status: "pending_deposit", note: "Order placed", created_at: now });
        return id;
      });
      tx.set("checkout_receipts", receiptId, { user_id: context.userId, order_ids: orderIds, created_at: now });
      return orderIds;
    });
  });
