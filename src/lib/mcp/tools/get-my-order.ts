import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

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
    const supabase = supabaseForUser(ctx);
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, subtotal, discount, total, deposit_paid, balance_due, delivery_city, delivery_address, expected_delivery_date, customer_notes, sofa_snapshot, fabric_snapshot, size_snapshot, addons_snapshot, created_at",
      )
      .eq("order_number", order_number)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!order) {
      return {
        content: [{ type: "text", text: `No order '${order_number}' found for your account.` }],
        isError: true,
      };
    }

    const { data: history } = await supabase
      .from("order_status_history")
      .select("status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at");

    const result = { ...order, timeline: history ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: { order: result },
    };
  },
});