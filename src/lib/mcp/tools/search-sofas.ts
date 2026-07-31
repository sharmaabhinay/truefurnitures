import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminQuery, pick, type Row } from "../firestore";

const FIELDS = ["slug", "name", "tagline", "base_price", "sale_price", "lead_time_days", "is_featured"] as const;

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
    try {
      const rows = (await adminQuery("sofas", [{ field: "is_published", value: true }])) as Row[];
      const q = query?.toLowerCase();
      const matched = rows
        .filter((r) =>
          !q
            ? true
            : `${r['name'] ?? ""} ${r['tagline'] ?? ""}`.toLowerCase().includes(q),
        )
        .sort((a, b) => Number(a['sort_order'] ?? 0) - Number(b['sort_order'] ?? 0))
        .slice(0, limit ?? 10)
        .map((r) => pick(r, FIELDS));
      return {
        content: [{ type: "text", text: JSON.stringify(matched) }],
        structuredContent: { sofas: matched },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
