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

export const STATUS_META: Record<string, { label: string; tone: "neutral" | "positive" | "warning" | "danger" | "info" }> = {
  pending_deposit: { label: "Deposit Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "info" },
  in_production: { label: "In Production", tone: "info" },
  quality_check: { label: "Quality Check", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  out_for_delivery: { label: "Out for Delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "positive" },
  cancellation_requested: { label: "Cancellation Requested", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
  refund_requested: { label: "Refund Requested", tone: "warning" },
  refunded: { label: "Refunded", tone: "danger" },
};

export function canUserCancel(status: string): boolean {
  return status === "pending_deposit" || status === "confirmed";
}

export function canUserRequestRefund(status: string): boolean {
  // Once a deposit is paid & build has progressed, a refund request replaces a hard cancel.
  return [
    "in_production",
    "quality_check",
    "shipped",
    "out_for_delivery",
    "delivered",
  ].includes(status);
}