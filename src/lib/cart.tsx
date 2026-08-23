import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsGet, fsSet } from "@/lib/db/firestore";

export type AppliedCoupon = {
  code: string;
  discount_type: "percent" | "flat";
  discount_value: number;
  min_order_amount: number;
};

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
  /** ISO timestamp of when this line was first added. */
  addedAt?: string;
};


type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  coupon: AppliedCoupon | null;
  applyCoupon: (c: AppliedCoupon) => void;
  removeCoupon: () => void;
  discount: number;
  total: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tf_cart_v1";
const COUPON_KEY = "tf_coupon_v1";

/** Stable identity of a configured line, used when merging carts across devices. */
function lineKey(i: CartItem) {
  return [i.sofaId, i.fabric, i.size ?? "", i.color ?? "", (i.addons ?? []).join("|")].join("::");
}

function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const out = new Map<string, CartItem>();
  for (const item of [...a, ...b]) {
    const key = lineKey(item);
    const existing = out.get(key);
    if (existing) existing.quantity = Math.max(existing.quantity, item.quantity);
    else out.set(key, { ...item });
  }
  return [...out.values()];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncedUid, setSyncedUid] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const rawC = localStorage.getItem(COUPON_KEY);
      if (rawC) setCoupon(JSON.parse(rawC));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [items, coupon, hydrated]);

  // Pull the signed-in user's cart and merge it with whatever is on this device.
  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await fsGet<{ items?: CartItem[]; coupon?: AppliedCoupon | null }>(COL.carts, user.uid);
        if (cancelled) return;
        if (remote?.items?.length) setItems((cur) => mergeCarts(cur, remote.items ?? []));
        if (remote?.coupon) setCoupon((cur) => cur ?? remote.coupon!);
      } catch {
        /* offline / rules — keep the local cart */
      } finally {
        if (!cancelled) setSyncedUid(user.uid);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, user]);

  // Push every change back so other devices see the same cart.
  useEffect(() => {
    if (!hydrated || !user || syncedUid !== user.uid) return;
    const t = setTimeout(() => {
      void fsSet(COL.carts, user.uid, { items, coupon, updated_at: new Date().toISOString() }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [items, coupon, hydrated, user, syncedUid]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
    let discount = 0;
    if (coupon && subtotal >= coupon.min_order_amount) {
      discount = coupon.discount_type === "percent"
        ? Math.round((subtotal * coupon.discount_value) / 100)
        : Math.min(subtotal, coupon.discount_value);
    }
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
              addedAt: new Date().toISOString(),
            },
          ];

        });
      },
      remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
      setQty: (id, qty) =>
        setItems((cur) =>
          cur.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)),
        ),
      clear: () => { setItems([]); setCoupon(null); },
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal,
      coupon,
      applyCoupon: (c) => setCoupon(c),
      removeCoupon: () => setCoupon(null),
      discount,
      total: Math.max(0, subtotal - discount),
    };
  }, [items, coupon, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}