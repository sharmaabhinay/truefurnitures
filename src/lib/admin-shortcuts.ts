export const ADMIN_ACTIONS = [
  ["dashboard", "Dashboard"], ["orders", "Orders"], ["customers", "Customers"],
  ["products", "Products"], ["files", "File Manager"], ["notes", "Notes & Todos"],
  ["settings", "Settings"], ["analytics", "Sales Analytics"], ["cartInsights", "Cart Insights"],
  ["visitors", "Visitor Analytics"], ["bookings", "Quote Requests"], ["inbox", "Messages"],
  ["trash", "Trash"], ["reviews", "Reviews"], ["coupons", "Coupons"], ["blog", "Blog"],
  ["carpenters", "Carpenters"], ["carpenterRequests", "Carpenter Requests"],
  ["manufacturers", "Manufacturers"], ["designs", "Saved Designs"], ["showrooms", "Showrooms"],
  ["careers", "Careers"], ["campaigns", "Ad Campaigns"], ["subscribers", "Subscribers"],
  ["adminUsers", "Admin Users"], ["pageEditor", "Page editor"], ["invoice", "Download order invoice"],
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number][0];
export type Shortcut = { id: string; action: AdminAction; keys: string; enabled: boolean };
const keys = ["d", "o", "c", "p", "f", "n", "s", "g a", "g c", "g v", "g q", "g i", "g t", "g r", "g u", "g b", "g h", "g j", "g m", "g d", "g s", "g k", "g w", "g n", "g u a", "g e", "o i"];
export const DEFAULT_SHORTCUTS: Shortcut[] = ADMIN_ACTIONS.map(([action], i) => ({ id: action, action, keys: keys[i] ?? "", enabled: true }));
export const SHORTCUTS_CHANGED = "tf:admin-shortcuts-changed";
export const INVOICE_SHORTCUT = "tf:download-order-invoice";
export const shortcutStorageKey = (uid: string) => `tf_admin_shortcuts:${uid}`;

export function normalizeKeys(value: string): string {
  return value.trim().toLowerCase().replace(/\s*\+\s*/g, "+").replace(/\s+/g, " ");
}
export function validateShortcuts(rows: Shortcut[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!ADMIN_ACTIONS.some(([action]) => action === row.action)) return "Choose a valid action.";
    const key = normalizeKeys(row.keys);
    if (!/^(?:(?:(?:ctrl|alt|shift|meta)\+)*[a-z0-9])(?: (?:(?:ctrl|alt|shift|meta)\+)*[a-z0-9]){0,2}$/.test(key)) return "Use letters or numbers, optionally with ctrl+, alt+, shift+ or meta+. Separate up to three steps with spaces.";
    if (row.enabled && seen.has(key)) return `Duplicate shortcut: ${key.toUpperCase()}.`;
    if (row.enabled) seen.add(key);
  }
  return null;
}
export function loadShortcuts(uid: string): Shortcut[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(shortcutStorageKey(uid)) ?? "null");
    if (Array.isArray(stored) && stored.every((r) => r && typeof r.id === "string" && typeof r.keys === "string" && typeof r.enabled === "boolean") && !validateShortcuts(stored)) return stored;
  } catch { /* corrupted or unavailable storage uses defaults */ }
  return DEFAULT_SHORTCUTS.map((row) => ({ ...row }));
}
export function keyStroke(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey" | "shiftKey">): string {
  const key = event.key.toLowerCase();
  if (!/^[a-z0-9]$/.test(key)) return "";
  return [event.ctrlKey && "ctrl", event.altKey && "alt", event.shiftKey && "shift", event.metaKey && "meta", key].filter(Boolean).join("+");
}
export function matchShortcut(rows: Shortcut[], sequence: string, orderDetails: boolean) {
  const candidates = rows.filter((row) => row.enabled && (row.action !== "invoice" || orderDetails));
  return {
    exact: candidates.find((row) => normalizeKeys(row.keys) === sequence),
    prefix: candidates.some((row) => normalizeKeys(row.keys).startsWith(`${sequence} `)),
  };
}