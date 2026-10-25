import { expect, it } from "vitest";
import { canUploadToFolder } from "../src/lib/upload-access";

it("keeps File Manager uploads staff-only", () => {
  expect(canUploadToFolder("user", "file-manager/photos")).toBe(false);
  expect(canUploadToFolder("staff", "file-manager/photos")).toBe(true);
  expect(canUploadToFolder("admin", "file-manager/photos")).toBe(true);
});
it("preserves signed-in customer order-reference uploads", () => {
  expect(canUploadToFolder("user", "orders/references")).toBe(true);
  expect(canUploadToFolder("user", "orders/references/other")).toBe(false);
});