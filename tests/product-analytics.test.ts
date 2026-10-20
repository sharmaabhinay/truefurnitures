import { describe, expect, it } from "vitest";
import { aggregateProductAnalytics, analyticsWindow, matchesProduct } from "../src/lib/product-analytics";

const product = { id: "sofa-1", name: "Real sofa", slug: "real-sofa" };
const now = new Date("2026-10-19T23:00:00Z");
describe("product analytics", () => {
  it("includes legacy time-only activity", () => {
    const result = aggregateProductAnalytics(product, [{ type: "product_view", time: "2026-10-18T10:00:00Z", item: "Real sofa", session: "a" }], [], [], "7d", now);
    expect(result.totals.views).toBe(1);
    expect(result.series.find(p => p.label === "2026-10-18")?.views).toBe(1);
  });
  it("uses seven UTC days, thirty UTC days and twelve calendar months", () => {
    expect(analyticsWindow("7d", now).labels).toHaveLength(7);
    expect(analyticsWindow("7d", now).labels[0]).toBe("2026-10-13");
    expect(analyticsWindow("30d", now).labels[0]).toBe("2026-09-20");
    expect(analyticsWindow("12m", now).labels[0]).toBe("2025-11");
  });
  it("counts a multi-line product checkout once and sums its revenue", () => {
    const orders = [1, 2].map(i => ({ id: String(i), sofa_id: "sofa-1", checkout_id: "checkout", total: 1000, created_at: "2026-10-18T10:00:00Z" }));
    const result = aggregateProductAnalytics(product, [], orders, [], "7d", now);
    expect(result.totals.orders).toBe(1);
    expect(result.totals.revenue).toBe(2000);
    expect(result.series.reduce((n, p) => n + p.orders, 0)).toBe(1);
  });
  it("attributes conversion only to matching sessions, not repeat adds or unlinked orders", () => {
    const events = ["product_view", "add_to_cart", "add_to_cart"].map(type => ({ type, sofaId: "sofa-1", session: "a", time: "2026-10-18T10:00:00Z" }));
    const orders = [{ id: "1", sofa_id: "sofa-1", checkout_session: "a", created_at: "2026-10-18T11:00:00Z" }, { id: "2", sofa_id: "sofa-1", created_at: "2026-10-18T11:00:00Z" }];
    const result = aggregateProductAnalytics(product, events, orders, [], "7d", now);
    expect(result.conversion.viewToCart).toBe(100);
    expect(result.conversion.cartToOrder).toBe(100);
    expect(aggregateProductAnalytics(product, events, orders.slice(1), [], "7d", now).conversion.cartToOrder).toBe(0);
  });
  it("excludes cancelled, refunded and trashed orders", () => {
    const orders = ["cancelled", "refunded", "confirmed"].map((status, i) => ({ id: String(i), sofa_id: "sofa-1", status, deleted_at: status === "confirmed" ? "deleted" : null, total: 500, created_at: "2026-10-18T10:00:00Z" }));
    const result = aggregateProductAnalytics(product, [], orders, [], "7d", now);
    expect(result.totals.orders).toBe(0);
    expect(result.totals.revenue).toBe(0);
  });
  it("matches alternate cart identifiers but never overrides a different product ID", () => {
    expect(matchesProduct({ product_id: "different", name: "Real sofa" }, "sofa-1", "real-sofa", "Real sofa")).toBe(false);
    const result = aggregateProductAnalytics(product, [], [], [{ items: [{ product_id: "sofa-1", quantity: 2 }, { slug: "real-sofa", quantity: 1 }] }], "7d", now);
    expect(result.totals.activeCarts).toBe(1);
    expect(result.totals.cartUnits).toBe(3);
  });
});