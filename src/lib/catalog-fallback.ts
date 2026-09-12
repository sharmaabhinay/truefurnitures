import { COL, fsList, where } from "@/lib/db/firestore";
import { isProductLive } from "@/lib/availability";

/**
 * Browser-side fallback for catalogue reads.
 *
 * The primary source is the server function (admin Firestore over REST). If the
 * server credentials are missing or the REST call fails, that function returns
 * an empty result, which used to render an empty catalogue and blank product
 * pages. These helpers re-read the same data with the browser Firestore SDK so
 * the storefront still shows products.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: string; slug: string; base_price: number };

export async function clientPublishedSofas<T = Row>(): Promise<T[]> {
  if (typeof window === "undefined") return [];
  try {
    const rows = await fsList<Row>(COL.sofas, where("is_published", "==", true));
    return rows
      .filter((r) => isProductLive(r) && Boolean(r.slug) && Number(r.base_price) > 0)
      .sort((a, b) => Number(a['sort_order'] ?? 0) - Number(b['sort_order'] ?? 0)) as unknown as T[];
  } catch {
    return [];
  }
}

export async function clientPublishedSofa<T = Row>(slug: string): Promise<T | null> {
  const rows = await clientPublishedSofas<Row>();
  return (rows.find((r) => r.slug === slug) ?? null) as T | null;
}
