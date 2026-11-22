import { describe, expect, it } from "vitest";
import { publicOrder, samePhone, trackingInput } from "../src/lib/order-tracking";
const order = { order_number: "TF-53433", status: "in_production", phone: "9876543210", user_id: "private-id", delivery_address: "Private address", admin_notes: "Staff only", total: 90000, created_at: "2026-11-01", progress_photos: [{ url: "https://res.cloudinary.com/example/photo.jpg", caption: "Frame being made", created_at: "2026-11-20" }] };
describe("Public order tracking", () => {
  it("shows exactly seven stages in delivery order", () => {
    const result = publicOrder(order, [], false);
    expect(result.steps.map(step => step.key)).toEqual(["pending_deposit", "confirmed", "in_production", "quality_check", "shipped", "out_for_delivery", "delivered"]);
    expect(result.steps[2]?.active).toBe(true); expect(result.steps[3]?.completed).toBe(false);
  });
  it("does not return private customer fields, internal history notes or workshop photos for an order number alone", () => {
    const result = publicOrder(order, [{ status: "confirmed", created_at: "2026-11-02", note: "Private staff note" }], false);
    expect(result.photos).toEqual([]);
    for (const key of ["phone", "user_id", "delivery_address", "admin_notes", "total"]) expect(result).not.toHaveProperty(key);
    expect(JSON.stringify(result)).not.toContain("Private staff note");
  });
  it("includes workshop updates after verification", () => {
    expect(publicOrder(order, [], true).photos[0]?.caption).toBe("Frame being made");
  });
  it("requires the full matching phone, accepting Indian country code formatting", () => {
    expect(samePhone("+91 98765 43210", "9876543210")).toBe(true);
    expect(samePhone("9876543210", "+91 98765 43210")).toBe(true);
    expect(samePhone("9876543210", "3210")).toBe(false);
    expect(samePhone(null, "")).toBe(false);
    expect(samePhone("9876543210", "9876543211")).toBe(false);
  });
  it("normalizes order numbers and rejects malformed lookup input", () => {
    expect(trackingInput.parse({ orderNumber: " tf-53433 " }).orderNumber).toBe("TF-53433");
    expect(trackingInput.safeParse({ orderNumber: "../orders" }).success).toBe(false);
  });
  it("does not turn cancelled orders into a completed delivery timeline", () => {
    expect(publicOrder({ ...order, status: "cancelled" }, [{ status: "confirmed", created_at: "2026-11-02" }], false).steps[6]?.completed).toBe(false);
  });
});