import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminQuery, myRows, pick, mcpUserId, type Row } from "../firestore";

const FIELDS = [
  "id", "order_number", "status", "subtotal", "discount", "total", "deposit_paid", "balance_due",
  "delivery_city", "delivery_address", "expected_delivery_date", "customer_notes",
  "sofa_snapshot", "fabric_snapshot", "size_snapshot", "addons_snapshot", "created_at",
] as const;

export default defineTool({
  name: "get_my_order",
  title: "Get my order",
  description:
    "Fetch one of the signed-in customer's own orders by order number, including the configured sofa, fabric, size, add-ons and its status history timeline.",
  inputSchema: { order_number: z.string().trim().min(1).describe("Order number, e.g. 'TF-1042'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      await mcpUserId(ctx); // rejects unverified tokens early
      const rows = await myRows(ctx, "orders", [{ field: "order_number", value: order_number }]);
      const order = rows[0];
      if (!order) {
        return {
          content: [{ type: "text", text: `No order '${order_number}' found for your account.` }],
          isError: true,
        };
      }
      const history = ((await adminQuery("order_status_history", [
        { field: "order_id", value: order.id },
      ])) as Row[])
        .sort((a, b) => String(a['created_at'] ?? "").localeCompare(String(b['created_at'] ?? "")))
        .map((h) => pick(h, ["status", "note", "created_at"]));
      const result = { ...pick(order, FIELDS), timeline: history };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: { order: result },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
