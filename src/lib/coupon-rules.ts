/** Pure coupon rules shared by the cart, checkout and the server check. */
export type CouponRule = {
  code: string;
  active?: boolean;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount?: number | null;
  max_order_amount?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  applies_to?: "all" | "products" | "categories";
  product_ids?: string[];
  category_ids?: string[];
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  uses_count?: number | null;
};

export type CouponLine = { sofaId: string; categoryId?: string | null; lineTotal: number };

export type CouponCheck =
  | { ok: true; discount: number; eligibleSofaIds: string[] | null; eligibleSubtotal: number }
  | { ok: false; error: string };

export function eligibleLines(c: CouponRule, lines: CouponLine[]): CouponLine[] {
  if (c.applies_to === "products") return lines.filter((l) => (c.product_ids ?? []).includes(l.sofaId));
  if (c.applies_to === "categories") return lines.filter((l) => !!l.categoryId && (c.category_ids ?? []).includes(l.categoryId));
  return lines;
}

export function discountOn(c: Pick<CouponRule, "discount_type" | "discount_value" | "max_discount_amount">, eligibleSubtotal: number): number {
  if (eligibleSubtotal <= 0) return 0;
  let d = c.discount_type === "percent"
    ? Math.round((eligibleSubtotal * Number(c.discount_value)) / 100)
    : Math.min(eligibleSubtotal, Number(c.discount_value));
  if (c.max_discount_amount && c.max_discount_amount > 0) d = Math.min(d, Number(c.max_discount_amount));
  return Math.max(0, d);
}

export function evaluateCoupon(
  c: CouponRule | null,
  lines: CouponLine[],
  ctx: { priorUses: number; now?: Date },
): CouponCheck {
  const now = ctx.now ?? new Date();
  if (!c || c.active === false) return { ok: false, error: "Invalid or inactive coupon" };
  if (c.valid_from && new Date(c.valid_from) > now) return { ok: false, error: "This coupon isn't active yet" };
  if (c.valid_until && new Date(c.valid_until) < now) return { ok: false, error: "This coupon has expired" };
  if (c.max_uses && Number(c.uses_count ?? 0) >= c.max_uses) return { ok: false, error: "This offer has reached its usage limit" };
  const perUser = c.max_uses_per_user ?? 1;
  if (perUser > 0 && ctx.priorUses >= perUser) return { ok: false, error: "You've already used this offer." };
  const eligible = eligibleLines(c, lines);
  if (!eligible.length) return { ok: false, error: "This coupon isn't valid for the sofas in your cart." };
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const min = Number(c.min_order_amount ?? 0);
  if (subtotal < min) return { ok: false, error: `Minimum order ₹${min.toLocaleString("en-IN")} required for this coupon` };
  if (c.max_order_amount && subtotal > c.max_order_amount) return { ok: false, error: "Your order is above this coupon's maximum value" };
  const eligibleSubtotal = eligible.reduce((n, l) => n + l.lineTotal, 0);
  const restricted = c.applies_to === "products" || c.applies_to === "categories";
  return { ok: true, discount: discountOn(c, eligibleSubtotal), eligibleSofaIds: restricted ? [...new Set(eligible.map((l) => l.sofaId))] : null, eligibleSubtotal };
}
