import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string; // client-side line id
  sofaId: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  fabric: string;
  quantity: number;
  size?: string;
  color?: string;
  colorHex?: string;
  addons?: string[];
};

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tf_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      add: (input) => {
        setItems((cur) => {
          const existing = cur.find(
            (i) =>
              i.sofaId === input.sofaId &&
              i.fabric === input.fabric &&
              i.size === input.size &&
              i.color === input.color &&
              JSON.stringify(i.addons ?? []) === JSON.stringify(input.addons ?? []),
          );
          if (existing) {
            return cur.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + (input.quantity ?? 1) } : i,
            );
          }
          return [
            ...cur,
            {
              id: crypto.randomUUID(),
              quantity: input.quantity ?? 1,
              sofaId: input.sofaId,
              slug: input.slug,
              name: input.name,
              image: input.image,
              unitPrice: input.unitPrice,
              fabric: input.fabric,
              size: input.size,
              color: input.color,
              colorHex: input.colorHex,
              addons: input.addons,
            },
          ];
        });
      },
      remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
      setQty: (id, qty) =>
        setItems((cur) =>
          cur.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)),
        ),
      clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.quantity * i.unitPrice, 0),
    };
  }, [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}