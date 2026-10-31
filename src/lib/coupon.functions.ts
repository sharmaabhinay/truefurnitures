import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";
import { evaluateCoupon, type CouponCheck, type CouponRule } from "./coupon-rules";

const input = z.object({
  code: z.string().trim().min(1).max(40),
  lines: z.array(z.object({ sofaId: z.string().max(200), lineTotal: z.number().min(0) })).min(1).max(50),
});

export type CouponValidation = CouponCheck & { coupon?: CouponRule & { id: string } };

/** Server-side coupon check: reads the coupon, the customer's past orders and sofa categories. */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((v: unknown) => input.parse(v))
  .handler(async ({ data, context }): Promise<CouponValidation> => {
    const { adminQuery, adminGetDoc } = await import("./firebase-admin.server");
    const code = data.code.toUpperCase();
    try {
      const rows = await adminQuery("coupons", [{ field: "code", value: code }], { limit: 1 });
      const coupon = (rows[0] ?? null) as (CouponRule & { id: string }) | null;
      if (!coupon) return { ok: false, error: "Invalid or inactive coupon" };
      const orders = await adminQuery("orders", [{ field: "user_id", value: context.userId }]);
      const checkouts = new Set(
        orders
          .filter((o) => String(o["discount_code"] ?? "").toUpperCase() === code && !o["deleted_at"] && !["cancelled", "refunded"].includes(String(o["status"])))
          .map((o) => String(o["checkout_id"] ?? o["id"])),
      );
      const ids = [...new Set(data.lines.map((l) => l.sofaId))];
      const cats = new Map<string, string | null>();
      if (coupon.applies_to === "categories") {
        await Promise.all(ids.map(async (id) => {
          const s = await adminGetDoc("sofas", id).catch(() => null);
          cats.set(id, s ? String((s as Record<string, unknown>)["category_id"] ?? "") || null : null);
        }));
      }
      const lines = data.lines.map((l) => ({ ...l, categoryId: cats.get(l.sofaId) ?? null }));
      const result = evaluateCoupon(coupon, lines, { priorUses: checkouts.size });
      return result.ok ? { ...result, coupon } : result;
    } catch (e) {
      console.error("[coupon] validate failed", e);
      return { ok: false, error: "Coupon could not be checked right now. Please try again." };
    }
  });
