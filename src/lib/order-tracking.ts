import { z } from "zod";
import { ORDER_STATUS_STEPS } from "./format";

export const trackingInput = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^TF-[A-Z0-9-]{3,40}$/, "Enter your order number, for example TF-53433."),
  phone: z.string().trim().max(20).default(""),
});
export function samePhone(saved: unknown, supplied: string): boolean {
  const normalize = (value: string) => value.replace(/\D/g, "").replace(/^(?:0091|91)(?=\d{10}$)/, "");
  const input = normalize(supplied);
  return typeof saved === "string" && input.length >= 10 && input === normalize(saved);
}
const text = (value: unknown) => typeof value === "string" ? value : "";
export function publicOrder(order: Record<string, unknown>, history: Record<string, unknown>[], verified: boolean) {
  const status = text(order['status']);
  const current = ORDER_STATUS_STEPS.findIndex(step => step.key === status);
  return {
    orderNumber: text(order['order_number']), status,
    expectedDelivery: text(order['expected_delivery_date']), verified,
    steps: ORDER_STATUS_STEPS.map((step, index) => {
      const record = history.find(row => row['status'] === step.key);
      return { ...step, completed: current >= index || !!record, active: current === index,
        date: text(record?.['created_at']) || (index === 0 ? text(order['created_at']) : "") };
    }),
    photos: verified && Array.isArray(order['progress_photos']) ? order['progress_photos'].flatMap((photo: unknown) => {
      if (!photo || typeof photo !== "object") return [];
      const row = photo as Record<string, unknown>;
      const url = text(row['url']);
      if (!url.startsWith("https://") && !url.startsWith("/assets/")) return [];
      return [{ url, caption: text(row['caption']), date: text(row['created_at']), video: /\/video\/|\.(mp4|webm|mov)(\?|$)/i.test(url) }];
    }) : [],
  };
}
export type TrackedOrder = ReturnType<typeof publicOrder>;