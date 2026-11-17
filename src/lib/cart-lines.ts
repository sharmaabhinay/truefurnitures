import type { CartItem } from "./cart";

/**
 * The fields that decide whether two cart lines are "the same configured sofa".
 * Kept apart from the provider so the rule can be unit-tested without React.
 */
export type CartLineMatch = {
  sofaId: string;
  fabric?: string;
  size?: string;
  color?: string;
  addons?: string[];
};

/**
 * A line matches when it is the same product configured exactly the same way:
 * same fabric, size, colour and add-ons. This is the single source of truth for
 * both "is this already in the cart?" and the merge done when adding.
 */
export function sameLine(item: CartItem, match: CartLineMatch): boolean {
  return (
    item.sofaId === match.sofaId &&
    item.fabric === match.fabric &&
    item.size === match.size &&
    item.color === match.color &&
    JSON.stringify(item.addons ?? []) === JSON.stringify(match.addons ?? [])
  );
}

export function findLine(items: CartItem[], match: CartLineMatch): CartItem | undefined {
  return items.find((item) => sameLine(item, match));
}

/** Product pages show saved builds without merging or changing their configuration. */
export function productLines(items: CartItem[], sofaId: string): CartItem[] {
  return items.filter((item) => item.sofaId === sofaId);
}

/** Highest quantity a single cart line may hold. */
export const MAX_LINE_QTY = 99;

/**
 * Apply a +/- step to one line. Dropping below 1 removes the line entirely, so
 * the storefront button can turn back into "Add to Cart".
 */
export function withQty(items: CartItem[], id: string, delta: number): CartItem[] {
  const line = items.find((i) => i.id === id);
  if (!line) return items;
  const next = line.quantity + delta;
  if (next < 1) return items.filter((i) => i.id !== id);
  if (next > MAX_LINE_QTY) return items;
  return items.map((i) => (i.id === id ? { ...i, quantity: next } : i));
}
