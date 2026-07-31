import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { myRows, pick } from "../firestore";

const FIELDS = [
  "order_number", "status", "total", "deposit_paid", "balance_due",
  "delivery_city", "expected_delivery_date", "created_at",
] as const;

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description:
    "List the signed-in customer's own sofa orders with status, totals, deposit paid, balance due and expected delivery date.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Maximum orders to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      const rows = await myRows(ctx, "orders");
      const orders = rows
        .sort((a, b) => String(b['created_at'] ?? "").localeCompare(String(a['created_at'] ?? "")))
        .slice(0, limit ?? 10)
        .map((r) => pick(r, FIELDS));
      return {
        content: [{ type: "text", text: JSON.stringify(orders) }],
        structuredContent: { orders },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
