import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminQuery, pick, type Row } from "../firestore";

const FIELDS = [
  "slug", "name", "tagline", "description", "full_description", "features", "dimensions",
  "materials", "base_price", "sale_price", "delivery_days", "lead_time_days", "hero_image",
] as const;

export default defineTool({
  name: "get_sofa",
  title: "Get sofa details",
  description:
    "Fetch the full detail of one published sofa by its slug: description, features, dimensions, materials, pricing and delivery time.",
  inputSchema: { slug: z.string().trim().min(1).describe("Sofa slug, e.g. 'aurora-three-seater'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      const rows = (await adminQuery(
        "sofas",
        [
          { field: "slug", value: slug },
          { field: "is_published", value: true },
        ],
        { limit: 1 },
      )) as Row[];
      const sofa = rows[0];
      if (!sofa) {
        return { content: [{ type: "text", text: `No published sofa found for slug '${slug}'.` }], isError: true };
      }
      const data = pick(sofa, FIELDS);
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
        structuredContent: { sofa: data },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
