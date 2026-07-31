import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminGetDoc, myRows, pick, type Row } from "../firestore";

const FIELDS = ["name", "config", "share_token", "created_at"] as const;

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
    try {
      const rows = await myRows(ctx, "saved_designs");
      const recent = rows
        .sort((a, b) => String(b['created_at'] ?? "").localeCompare(String(a['created_at'] ?? "")))
        .slice(0, limit ?? 10);
      // Firestore has no joins, so the sofa summary is fetched per design.
      const designs = await Promise.all(
        recent.map(async (d) => {
          const sofaId = d['sofa_id'] ? String(d['sofa_id']) : "";
          const sofa = sofaId ? ((await adminGetDoc("sofas", sofaId)) as Row | null) : null;
          return {
            ...pick(d, FIELDS),
            sofa: sofa ? { slug: sofa['slug'], name: sofa['name'] } : null,
          };
        }),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(designs) }],
        structuredContent: { designs },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
