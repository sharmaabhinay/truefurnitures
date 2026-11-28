import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURES } from "../src/lib/brand";
import { DEFAULT_HEADER_CTA, DEFAULT_NAVIGATION, HEADER_ROTATION_MS, splitHeaderNavigation } from "../src/lib/site-navigation";

describe("header navigation", () => {
  it("rotates every three seconds", () => {
    expect(HEADER_ROTATION_MS).toBe(3000);
  });
  it("consolidates the four requested destinations without removing collections", () => {
    const result = splitHeaderNavigation(DEFAULT_NAVIGATION, DEFAULT_HEADER_CTA, DEFAULT_FEATURES);
    expect(result.primary.map(item => item.url)).toEqual(["/collections"]);
    expect(result.rotating.map(item => item.url)).toEqual(["/room-advisor", "/hire-carpenter", "/contact", "/design"]);
  });
  it("does not display disabled services or a disabled design action", () => {
    const result = splitHeaderNavigation(DEFAULT_NAVIGATION, DEFAULT_HEADER_CTA, { ...DEFAULT_FEATURES, design3d: false, hireCarpenter: false });
    expect(result.rotating.map(item => item.url)).toEqual(["/room-advisor", "/contact"]);
  });
  it("preserves custom navigation and does not duplicate design", () => {
    const result = splitHeaderNavigation([...DEFAULT_NAVIGATION, { id: "design", ...DEFAULT_HEADER_CTA }, { id: "about", label: "Atelier", url: "/about", enabled: true }], DEFAULT_HEADER_CTA, DEFAULT_FEATURES);
    expect(result.primary.map(item => item.url)).toEqual(["/collections", "/about"]);
    expect(result.rotating.filter(item => item.url === "/design")).toHaveLength(1);
  });
});