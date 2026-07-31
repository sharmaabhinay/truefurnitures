import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_designs",
  title: "List my saved designs",
  description:
    "List the signed-in customer's saved sofa configurations from the 3D designer, including the chosen options and share token.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Maximum designs to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("saved_designs")
      .select("name, config, share_token, created_at, sofa:sofas(slug, name)")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { designs: data ?? [] },
    };
  },
});