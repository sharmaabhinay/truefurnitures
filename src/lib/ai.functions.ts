import { createServerFn } from "@tanstack/react-start";
import { aiInput, isAdminAi, type AiResult } from "./ai-contract";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";
import { isProductLive } from "@/lib/availability";

export const askCustomerAi = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => aiInput.parse(value))
  .handler(async ({ data }): Promise<AiResult> => {
    if (isAdminAi(data.task)) return { text: "", error: "This AI action requires staff access." };
    const key = process.env["GROQ_API_KEY"];
    const { generateAi } = await import("./ai.server");
    if (!key || key.trim() === "xyz") return generateAi(data, key);
    try {
      const { adminQuery } = await import("./firebase-admin.server");
      const rows = await adminQuery("sofas", [{ field: "is_published", value: true }]);
      const products = rows.filter((row) => isProductLive(row) && row["slug"] && Number(row["base_price"]) > 0)
        .filter((row) => data.task === "finder" || row["slug"] === data.slug);
      if (!products.length) return { text: "", error: "Product facts are unavailable. Please contact the team rather than rely on guessed information." };
      const facts = products.slice(0, 30).map((row) => ({
        name: row["name"], slug: row["slug"], base_price: row["base_price"],
        description: row["description"], dimensions: row["dimensions"], materials: row["materials"],
        features: row["features"], product_options: row["product_options"],
      }));
      return generateAi({ ...data, facts: JSON.stringify(facts).slice(0, 24000) }, key);
    } catch {
      return { text: "", error: "The product catalogue could not be read. AI will not invent product details." };
    }
  });

export const draftAdminAi = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((value: unknown) => aiInput.parse(value))
  .handler(async ({ data, context }): Promise<AiResult> => {
    const { staffOnly } = await import("./admin-data.functions");
    await staffOnly(context.role, context.userId);
    if (!isAdminAi(data.task)) return { text: "", error: "Choose an admin drafting action." };
    const key = process.env["GROQ_API_KEY"];
    const { generateAi } = await import("./ai.server");
    return generateAi(data, key);
  });