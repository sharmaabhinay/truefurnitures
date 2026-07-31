import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

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
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sofas")
      .select(
        "slug, name, tagline, description, full_description, features, dimensions, materials, base_price, sale_price, delivery_days, lead_time_days, hero_image",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `No published sofa found for slug '${slug}'.` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { sofa: data },
    };
  },
});