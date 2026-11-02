import { describe, it, expect } from "vitest";
import { evaluateCoupon, allocateCouponDiscount, type CouponRule } from "../src/lib/coupon-rules";
const coupon: CouponRule = { code: "OFFER", active: true, discount_type: "percent", discount_value: 10, applies_to: "products", product_ids: ["eligible"] };
const lines = [{ sofaId: "eligible", lineTotal: 10000 }, { sofaId: "other", lineTotal: 20000 }];
describe("Coupon eligibility", () => {
  it("rejects an offer already availed by the customer", () => { expect(evaluateCoupon(coupon, lines, { priorUses: 1 }).ok).toBe(false); });
  it("rejects a non-eligible product", () => { expect(evaluateCoupon(coupon, [lines[1]], { priorUses: 0 }).ok).toBe(false); });
  it("discounts only the eligible sofa", () => { const result = evaluateCoupon(coupon, lines, { priorUses: 0 }); expect(result).toMatchObject({ ok: true, discount: 1000, eligibleSubtotal: 10000 }); expect(allocateCouponDiscount(lines, 1000, ["eligible"])).toEqual([1000, 0]); });
  it("rejects exhausted total usage", () => { expect(evaluateCoupon({ ...coupon, max_uses: 2, uses_count: 2 }, lines, { priorUses: 0 }).ok).toBe(false); });
  it("enforces minimum order amount", () => { expect(evaluateCoupon({ ...coupon, min_order_amount: 30001 }, lines, { priorUses: 0 }).ok).toBe(false); });
  it("supports category eligibility", () => { expect(evaluateCoupon({ ...coupon, applies_to: "categories", category_ids: ["sectional"] }, [{ sofaId: "eligible", categoryId: "sectional", lineTotal: 10000 }], { priorUses: 0 })).toMatchObject({ ok: true, discount: 1000 }); });
});