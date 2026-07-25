import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(p), "utf8");

describe("admin route navigation smoke", () => {
  it("customer detail and order detail route files exist", () => {
    expect(existsSync("src/routes/_authenticated/admin.customers.$id.tsx")).toBe(true);
    expect(existsSync("src/routes/_authenticated/admin.orders.$id.tsx")).toBe(true);
  });

  it("route files declare the expected createFileRoute paths", () => {
    expect(read("src/routes/_authenticated/admin.customers.$id.tsx")).toContain(
      'createFileRoute("/_authenticated/admin/customers/$id")'
    );
    expect(read("src/routes/_authenticated/admin.orders.$id.tsx")).toContain(
      'createFileRoute("/_authenticated/admin/orders/$id")'
    );
  });

  it("admin dashboard navigates customer rows to /admin/customers/$id", () => {
    const src = read("src/routes/_authenticated/admin.index.tsx");
    expect(src).toMatch(
      /navigate\(\{\s*to:\s*["']\/admin\/customers\/\$id["'],\s*params:\s*\{\s*id:\s*[^}]+\}\s*\}\)/
    );
  });

  it("admin dashboard navigates order rows to /admin/orders/$id", () => {
    const src = read("src/routes/_authenticated/admin.index.tsx");
    const matches = src.match(
      /navigate\(\{\s*to:\s*["']\/admin\/orders\/\$id["'],\s*params:\s*\{\s*id:\s*[^}]+\}\s*\}\)/g
    );
    expect(matches && matches.length).toBeGreaterThanOrEqual(1);
  });

  it("admin parent renders an Outlet so nested detail pages can mount", () => {
    const src = read("src/routes/_authenticated/admin.tsx");
    expect(src).toContain("<Outlet />");
  });

  it("generated route tree registers admin detail routes", () => {
    const tree = read("src/routeTree.gen.ts");
    expect(tree).toContain("/admin/customers/$id");
    expect(tree).toContain("/admin/orders/$id");
  });
});