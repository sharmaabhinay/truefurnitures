import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";
import { type CouponCheck, type CouponRule } from "./coupon-rules";

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
    try {
      const { checkCustomerCoupon } = await import("./coupon.server");
      return await checkCustomerCoupon(data.code, context.userId, data.lines);
    } catch {
      return { ok: false, error: "Coupon could not be checked right now. Please try again." };
    }
  });
