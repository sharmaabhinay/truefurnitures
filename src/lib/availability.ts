/** Product publishing window helpers (draft / scheduled / published). */
export type ProductSchedule = {
  is_published?: boolean | null;
  status?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  [key: string]: unknown;
};

/** True when the product should be visible on the storefront right now. */
export function isProductLive(p: ProductSchedule, now: Date = new Date()): boolean {
  if (p.status === "draft") return false;
  if (p.is_published === false) return false;
  const t = now.getTime();
  if (p.available_from && t < new Date(p.available_from).getTime()) return false;
  if (p.available_to && t > new Date(`${p.available_to}T23:59:59`).getTime()) return false;
  return true;
}

/** Label shown in the admin product grid. */
export function productStatusLabel(p: ProductSchedule): { label: string; color: string } {
  if (p.status === "draft" || p.is_published === false) return { label: "Draft", color: "#888899" };
  if (!isProductLive(p)) {
    const upcoming = p.available_from && new Date(p.available_from).getTime() > Date.now();
    return { label: upcoming ? "Scheduled" : "Expired", color: "#C8A86B" };
  }
  return { label: "Live", color: "#4CAF82" };
}
