import { z } from "zod";
import { isProductLive } from "./availability";

export const ROOM_PHOTO_MAX = 5 * 1024 * 1024;
export const ROOM_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const roomRequest = z.object({
  description: z.string().trim().min(10).max(2000),
  preferences: z.string().trim().max(1000),
  budget: z.number().positive().max(10000000).nullable(),
  sessionId: z.string().uuid(),
});
export const roomOutput = z.object({
  summary: z.string(),
  matches: z.array(z.object({ slug: z.string(), reason: z.string(), fabric: z.string().nullable(), colour: z.string().nullable(), size: z.string().nullable() })),
  cautions: z.array(z.string()),
});
export type RoomOutput = z.infer<typeof roomOutput>;
export type RoomProduct = { slug: string; name: string; base_price: number; hero_image: string | null; model_url: string | null; description: string; dimensions: unknown; fabrics: string[]; colours: string[]; sizes: { label: string; price: unknown; dimensions: unknown; seating: unknown }[] };
export type RoomResult = { summary: string; cautions: string[]; matches: (RoomOutput["matches"][number] & { product: RoomProduct })[] };
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const list = (v: unknown) => Array.isArray(v) ? v.map(record) : [];
const text = (v: unknown) => typeof v === "string" ? v : "";
export function catalogueForRoom(rows: Record<string, unknown>[]): RoomProduct[] {
  return rows.filter(row => row['is_published'] === true && !row['deleted_at'] && !row['is_deleted'] && row['status'] !== "trashed" && isProductLive(row) && text(row['slug']) && text(row['name']) && Number(row['base_price']) > 0).slice(0, 30).map(row => {
    const options = record(row['product_options']);
    return { slug: text(row['slug']), name: text(row['name']), base_price: Number(row['base_price']), hero_image: text(row['hero_image']) || null, model_url: text(row['model_url']) || null, description: text(row['description']).slice(0, 2500), dimensions: row['dimensions'] ?? null,
      fabrics: list(options['fabrics']).map(f => text(f['name'])).filter(Boolean),
      colours: list(options['colours']).map(c => text(c['label'])).filter(Boolean),
      sizes: list(options['sizes']).map(s => ({ label: text(s['label']), price: s['price'] ?? null, dimensions: s['dimensions'] ?? null, seating: s['seating'] ?? null })).filter(s => s.label),
    };
  });
}
export function groundRoomResult(output: RoomOutput, products: RoomProduct[]): RoomResult {
  const seen = new Set<string>();
  if (output.matches.length > 3) throw new Error("AI returned too many recommendations. No unverified recommendations were shown.");
  const matches = output.matches.map(match => {
    const product = products.find(p => p.slug === match.slug);
    if (!product || seen.has(match.slug)) throw new Error("AI returned an unverified sofa. No unverified recommendations were shown.");
    seen.add(match.slug);
    if ((match.fabric !== null && !product.fabrics.includes(match.fabric)) || (match.colour !== null && !product.colours.includes(match.colour)) || (match.size !== null && !product.sizes.some(s => s.label === match.size))) throw new Error("AI suggested an unavailable customization. No unverified recommendations were shown.");
    return { ...match, product };
  });
  return { summary: output.summary, cautions: output.cautions, matches };
}
export function validateRoomPhoto(mime: string, bytes: Uint8Array) {
  if (!ROOM_MIMES.includes(mime) || bytes.length === 0 || bytes.length > ROOM_PHOTO_MAX) throw new Error("Choose a JPG, PNG or WebP room photo up to 5 MB.");
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(mime === "image/png" && png || mime === "image/jpeg" && jpeg || mime === "image/webp" && webp)) throw new Error("This file is not a valid JPG, PNG or WebP photo.");
}