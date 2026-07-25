export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function estimatedDelivery(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export const ORDER_STATUS_STEPS = [
  { key: "pending_deposit", label: "Deposit Pending", description: "Awaiting your booking deposit." },
  { key: "confirmed", label: "Order Confirmed", description: "We have received your order and materials are being sourced." },
  { key: "in_production", label: "In Production", description: "Master craftsmen are hand-building your piece." },
  { key: "quality_check", label: "Quality Check", description: "Final inspection at the atelier." },
  { key: "shipped", label: "Shipped", description: "On its way to your city." },
  { key: "out_for_delivery", label: "Out for Delivery", description: "Our team is bringing it home today." },
  { key: "delivered", label: "Delivered", description: "Enjoy your new True Furniture's piece." },
] as const;

export type OrderStatusKey = (typeof ORDER_STATUS_STEPS)[number]["key"] | "cancelled";

export function statusIndex(status: string): number {
  return ORDER_STATUS_STEPS.findIndex((s) => s.key === status);
}