import { expect, it } from "vitest";
import { invoiceAmounts, invoiceQrPayload } from "../src/lib/order-invoice";
it("uses recorded amounts without inventing tax or changing the balance", () => {
  expect(invoiceAmounts({ id: "1", subtotal: 68000, discount: 3000, total: 65000, deposit_paid: 13000, balance_due: 52000 })).toEqual({ subtotal: 68000, discount: 3000, total: 65000, paid: 13000, balance: 52000, refund: 0 });
});
it("QR contains an order reference without customer or payment data", () => {
  expect(invoiceQrPayload({ id: "1", order_number: "TF-123", phone: "private", delivery_address: "secret", razorpay_payment_id: "sensitive" })).toBe("True Furniture order: TF-123");
});