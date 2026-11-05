import { describe, it, expect } from "vitest";
import { summarizeCta, whatsappEnquiryUrl } from "../src/lib/cta-analytics";
import type { VisitorEvent } from "../src/lib/visitor-tracker";

describe("WhatsApp CTA", () => {
  it("opens the selected WhatsApp destination with an encoded enquiry", () => {
    const url = new URL(whatsappEnquiryUrl("+91 77738 96496", "/products/sofa") ?? "https://invalid.test");
    expect(url.host).toBe("wa.me"); expect(url.pathname).toBe("/917773896496");
    expect(url.searchParams.get("text")).toContain("/products/sofa");
  });
  it("does not create a destination for missing or invalid numbers", () => {
    expect(whatsappEnquiryUrl("", "/")).toBeNull();
    expect(whatsappEnquiryUrl("123", "/")).toBeNull();
  });
  it("counts sessions rather than repeat clicks for conversion", () => {
    const event = (type: VisitorEvent["type"], session: string): VisitorEvent => ({ type, session, time: "2026-11-05T12:00:00Z", page: "/" });
    const report = summarizeCta([event("cta_impression", "a"), event("cta_impression", "b"), event("cta_click", "a"), event("cta_click", "a"), event("cta_click", "unknown")], 7, new Date("2026-11-05T13:00:00Z"));
    expect(report.clicks).toBe(3); expect(report.rate).toBe(50); expect(report.sessions).toBe(2);
  });
  it("filters unrelated, out-of-range and future activity with UTC buckets", () => {
    const report = summarizeCta([
      { type: "cta_click", time: "2026-10-29T23:59:59Z" },
      { type: "cta_click", time: "2026-11-06T00:00:00Z" },
      { type: "visit", time: "2026-11-05T12:00:00Z" },
      { type: "cta_click", time: "2026-10-30T00:00:00Z", page: "/collections" },
    ], 7, new Date("2026-11-05T13:00:00Z"));
    expect(report.clicks).toBe(1); expect(report.trend).toHaveLength(7);
    expect(report.trend[0]?.clicks).toBe(1); expect(report.rate).toBe(0);
  });
});