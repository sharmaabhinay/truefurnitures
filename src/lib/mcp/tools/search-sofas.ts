import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_sofas",
  title: "Search sofas",
  description:
    "Search the published True Furniture's sofa catalogue by name or keyword. Returns slug, name, tagline, base price and lead time.",
  inputSchema: {
    query: z.string().trim().optional().describe("Optional keyword to match against sofa name or tagline."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum results to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("sofas")
      .select("slug, name, tagline, base_price, sale_price, lead_time_days, is_featured")
      .eq("is_published", true)
      .order("sort_order")
      .limit(limit ?? 10);
    if (query) request = request.or(`name.ilike.%${query}%,tagline.ilike.%${query}%`);

    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { sofas: data ?? [] },
    };
  },
});