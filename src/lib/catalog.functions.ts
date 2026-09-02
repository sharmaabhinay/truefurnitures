import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductLive } from "@/lib/availability";

/**
 * Public catalogue reads served from the server (admin Firestore over REST).
 * The browser SDK takes several seconds to open its channel on a cold load,
 * which made /collections and product pages look empty. Reading server-side
 * lets SSR ship the products with the HTML.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogSofa = Record<string, any> & {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  base_price: number;
  hero_image: string | null;
};

async function published(): Promise<CatalogSofa[]> {
  const { adminQuery } = await import("@/lib/firebase-admin.server");
  const rows = (await adminQuery("sofas", [{ field: "is_published", value: true }])) as CatalogSofa[];
  return rows
    .filter((r) => isProductLive(r) && Boolean(r.slug) && Number(r.base_price) > 0)
    .sort((a, b) => Number(a['sort_order'] ?? 0) - Number(b['sort_order'] ?? 0));
}

export const listPublishedSofas = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await published();
  } catch {
    return [] as CatalogSofa[];
  }
});

export const getPublishedSofa = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const rows = await published();
      return rows.find((r) => r.slug === data.slug) ?? null;
    } catch {
      return null;
    }
  });
