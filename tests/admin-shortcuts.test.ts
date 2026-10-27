import { expect, it } from "vitest";
import { DEFAULT_SHORTCUTS, matchShortcut, normalizeKeys, validateShortcuts } from "../src/lib/admin-shortcuts";
it.each([["o", "orders"], ["c", "customers"], ["p", "products"], ["d", "dashboard"], ["f", "files"], ["n", "notes"], ["s", "settings"]])("%s opens %s", (keys, action) => {
  expect(matchShortcut(DEFAULT_SHORTCUTS, keys, false).exact?.action).toBe(action);
});
it("reserves O then I for order invoice on order details only", () => {
  expect(matchShortcut(DEFAULT_SHORTCUTS, "o", true).prefix).toBe(true);
  expect(matchShortcut(DEFAULT_SHORTCUTS, "o i", true).exact?.action).toBe("invoice");
  expect(matchShortcut(DEFAULT_SHORTCUTS, "o i", false).exact).toBeUndefined();
});
it("allows customised keys but rejects duplicates", () => {
  expect(normalizeKeys(" ALT + O ")).toBe("alt+o");
  expect(validateShortcuts([{ id: "1", action: "orders", keys: "alt+o", enabled: true }])).toBeNull();
  expect(validateShortcuts([...DEFAULT_SHORTCUTS, { id: "new", action: "files", keys: "O", enabled: true }])).toContain("Duplicate");
});
it("provides a valid distinct shortcut for every admin action", () => {
  expect(validateShortcuts(DEFAULT_SHORTCUTS)).toBeNull();
  for (const row of DEFAULT_SHORTCUTS) {
    expect(matchShortcut(DEFAULT_SHORTCUTS, row.keys, true).exact?.action).toBe(row.action);
  }
});
it("allows an unfinished shortcut to be disabled without blocking save", () => {
  expect(validateShortcuts([{ id: "draft", action: "orders", keys: "", enabled: false }])).toBeNull();
  expect(validateShortcuts([{ id: "draft", action: "orders", keys: "", enabled: true }])).not.toBeNull();
});