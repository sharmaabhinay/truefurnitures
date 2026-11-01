import { adminGetDoc, adminQuery } from "./firebase-admin.server";
import { evaluateCoupon, type CouponRule, type CouponLine } from "./coupon-rules";

export async function checkCustomerCoupon(code: string, userId: string, lines: CouponLine[], supplied?: CouponRule & { id: string }) {
  const rows = supplied ? [supplied] : await adminQuery("coupons", [{ field: "code", value: code.toUpperCase() }], { limit: 1 });
  const coupon = (rows[0] ?? null) as (CouponRule & { id: string }) | null;
  if (!coupon) return { ok: false as const, error: "Invalid or inactive coupon" };
  const orders = await adminQuery("orders", [{ field: "user_id", value: userId }]);
  // Trashing an order must not reset a customer's redeemed offer.
  const prior = new Set(orders.filter(o => String(o['discount_code'] ?? '').toUpperCase() === code.toUpperCase() && !['cancelled', 'refunded'].includes(String(o['status']))).map(o => String(o['checkout_id'] ?? o.id)));
  const products = await Promise.all(lines.map(l => adminGetDoc("sofas", l.sofaId)));
  if (products.some(p => !p || p['deleted_at'] || p['is_published'] === false)) return { ok: false as const, error: "A sofa in your cart is no longer available." };
  const checked = lines.map((l, i) => ({ ...l, categoryId: String(products[i]?.['category_id'] ?? '') }));
  const result = evaluateCoupon(coupon, checked, { priorUses: prior.size });
  return result.ok ? { ...result, coupon } : result;
}
