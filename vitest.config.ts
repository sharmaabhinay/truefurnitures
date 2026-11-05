import { defineConfig } from "vitest/config";

// Unit tests exercise server helpers directly, without the Start RPC transform.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { include: ["tests/**/*.test.ts"] },
});