import { describe, expect, it } from "vitest";
import { defaults, moveSection, normalizeLayout, safeImage } from "../src/lib/page-layout";
describe("admin page arrangements", () => {
  it("moves a home section from bottom to top without losing sections", () => {
    const rows = defaults("home");
    const next = moveSection(rows, "faqs", "hero");
    expect(next[0]?.type).toBe("faqs");
    expect(next.map(s => s.id).sort()).toEqual(rows.map(s => s.id).sort());
    expect(rows[0]?.type).toBe("hero");
  });
  it("keeps new sections and their order on product pages", () => {
    const rows = normalizeLayout([{ id: "new", type: "text", title: "Custom section", enabled: true }, ...defaults("product")], "product");
    expect(rows[0]).toEqual({ id: "new", type: "text", title: "Custom section", enabled: true });
    expect(rows[1]?.type).toBe("main");
  });
  it("retains hidden and removed sections rather than resetting defaults", () => {
    expect(normalizeLayout([{ id: "faqs", type: "faqs", enabled: false }], "home")).toEqual([{ id: "faqs", type: "faqs", enabled: false }]);
    expect(normalizeLayout([], "home")).toEqual([]);
  });
  it("rejects unknown and duplicate sections", () => {
    expect(normalizeLayout([{ id: "x", type: "unknown" }, { id: "a", type: "faqs" }, { id: "a", type: "faqs" }], "home").map(s => s.id)).toEqual(["a"]);
  });
  it("disallows script and protocol-relative image URLs", () => {
    expect(safeImage("javascript:alert(1)")).toBeUndefined();
    expect(safeImage("//other.example/image.jpg")).toBeUndefined();
    expect(safeImage("/media/sofa.jpg")).toBe("/media/sofa.jpg");
  });
});