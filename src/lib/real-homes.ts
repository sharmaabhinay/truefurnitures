import { z } from "zod";
export const homeSubmissionInput = z.object({
  orderId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  locality: z.string().trim().min(2).max(80),
  caption: z.string().trim().min(3).max(500),
  consent: z.literal(true, { error: "Please agree to publish your photos and locality." }),
  images: z.array(z.string().max(7_000_000)).min(1).max(3),
});
export function eligibleHomeOrder(order: Record<string, unknown> | null, userId: string) {
  return !!order && order['user_id'] === userId && order['status'] === "delivered" && !order['deleted_at'];
}
export function imageBytes(dataUrl: string) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw new Error("Choose a JPG, PNG or WebP photo.");
  const binary = atob(match[2]);
  if (binary.length > 5 * 1024 * 1024) throw new Error("Each photo must be under 5 MB.");
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  const webp = binary.slice(0, 4) === "RIFF" && binary.slice(8, 12) === "WEBP";
  if (!(match[1] === "jpeg" && jpg || match[1] === "png" && png || match[1] === "webp" && webp)) throw new Error("This file is not a valid photo.");
  return { bytes, mime: `image/${match[1]}` };
}
export type HomeStory = { id: string; locality: string; caption: string; sofaName: string; images: string[]; createdAt: string; status: string };
export function homeStory(row: Record<string, unknown>): HomeStory {
  const value = (key: string) => typeof row[key] === "string" ? row[key] as string : "";
  return { id: value("id"), locality: value("locality"), caption: value("caption"), sofaName: value("sofa_name"), images: Array.isArray(row['images']) ? row['images'].filter((url): url is string => typeof url === "string" && url.startsWith("https://")) : [], createdAt: value("created_at"), status: value("status") };
}