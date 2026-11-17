import { describe, expect, it } from "vitest";
import { MAX_LINE_QTY, findLine, productLines, sameLine, withQty } from "@/lib/cart-lines";
import type { CartItem } from "@/lib/cart";

function line(over: Partial<CartItem> = {}): CartItem {
  return {
    id: "l1",
    sofaId: "s1",
    slug: "malwa",
    name: "The Malwa",
    image: "",
    unitPrice: 40000,
    fabric: "Boucle",
    quantity: 1,
    ...over,
  };
}

describe("cart line matching", () => {
  it("matches the same sofa and fabric", () => {
    const items = [line()];
    expect(findLine(items, { sofaId: "s1", fabric: "Boucle" })).toBe(items[0]);
  });

  it("does not match a different fabric", () => {
    const items = [line()];
    expect(findLine(items, { sofaId: "s1", fabric: "Linen" })).toBeUndefined();
  });

  it("does not match another sofa", () => {
    const items = [line()];
    expect(findLine(items, { sofaId: "s2", fabric: "Boucle" })).toBeUndefined();
  });

  it("keeps configured size, colour and add-ons apart", () => {
    const configured = line({ id: "l2", size: "3-seater", color: "Sand", addons: ["Cup holder"] });
    expect(sameLine(configured, { sofaId: "s1", fabric: "Boucle", size: "3-seater", color: "Sand", addons: ["Cup holder"] })).toBe(true);
    expect(sameLine(configured, { sofaId: "s1", fabric: "Boucle", size: "2-seater", color: "Sand", addons: ["Cup holder"] })).toBe(false);
    expect(sameLine(configured, { sofaId: "s1", fabric: "Boucle", size: "3-seater", color: "Grey", addons: ["Cup holder"] })).toBe(false);
    expect(sameLine(configured, { sofaId: "s1", fabric: "Boucle", size: "3-seater", color: "Sand", addons: [] })).toBe(false);
  });

  it("treats a missing add-on list and an empty one as the same line", () => {
    const plain = line();
    expect(sameLine(plain, { sofaId: "s1", fabric: "Boucle", addons: [] })).toBe(true);
  });
});

describe("cart quantity steps", () => {
  it("plus adds one unit", () => {
    const items = [line({ quantity: 2 })];
    expect(withQty(items, "l1", 1)[0].quantity).toBe(3);
  });

  it("minus removes one unit", () => {
    const items = [line({ quantity: 3 })];
    expect(withQty(items, "l1", -1)[0].quantity).toBe(2);
  });

  it("minus on the last unit removes the line so Add to Cart can come back", () => {
    const items = [line({ quantity: 1 }), line({ id: "l2", quantity: 4 })];
    const next = withQty(items, "l1", -1);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("l2");
  });

  it("stops at the maximum quantity", () => {
    const items = [line({ quantity: MAX_LINE_QTY })];
    expect(withQty(items, "l1", 1)[0].quantity).toBe(MAX_LINE_QTY);
  });

  it("leaves the cart untouched for an unknown line", () => {
    const items = [line()];
    expect(withQty(items, "nope", 1)).toBe(items);
  });
});

describe("product-page saved cart builds", () => {
  it("finds a customiser build even when the product page uses a fabric label and no size", () => {
    const configured = line({ fabric: "boucle", size: "3-Seater", color: "Sand", addons: ["Hidden storage"] });
    expect(productLines([configured], "s1")).toEqual([configured]);
  });

  it("keeps multiple saved builds separate and excludes other sofas", () => {
    const first = line();
    const second = line({ id: "l2", fabric: "Velvet", quantity: 3 });
    expect(productLines([first, second, line({ id: "l3", sofaId: "s2" })], "s1")).toEqual([first, second]);
    expect(withQty([first, second], "l2", 1).map(item => item.quantity)).toEqual([1, 4]);
  });
});
