import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: string };

/**
 * Staff check. The custom claim is authoritative when present, but many admins
 * are only recorded in the `user_roles` collection, so fall back to that.
 */
async function staffOnly(role: string | undefined, uid: string) {
  if (role === "admin" || role === "staff") return;
  const { adminGetDoc, adminQuery } = await import("@/lib/firebase-admin.server");
  const doc = await adminGetDoc("user_roles", uid).catch(() => null);
  const docRole = doc ? String((doc as Record<string, unknown>)["role"] ?? "") : "";
  if (docRole === "admin" || docRole === "staff") return;
  const rows = await adminQuery("user_roles", [{ field: "user_id", value: uid }]).catch(() => []);
  const ok = rows.some((r) => {
    const one = String((r as Record<string, unknown>)["role"] ?? "");
    const many = ((r as Record<string, unknown>)["roles"] as string[] | undefined) ?? [];
    return one === "admin" || one === "staff" || many.includes("admin") || many.includes("staff");
  });
  if (!ok) throw new Response("Forbidden", { status: 403 });
}

/**
 * Customer list built on the server so it never depends on the browser
 * Firestore SDK (slow cold start) and always includes freshly registered
 * users, even when their profile document lagged behind sign-up.
 */
export const listAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery, adminListUsers } = await import("@/lib/firebase-admin.server");
    const [authUsers, profiles, orders] = await Promise.all([
      adminListUsers(),
      adminQuery("profiles"),
      adminQuery("orders"),
    ]);

    const spent = new Map<string, { count: number; sum: number }>();
    for (const o of orders) {
      const uid = String(o["user_id"] ?? "");
      if (!uid) continue;
      const cur = spent.get(uid) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += Number(o["total"] ?? 0) || 0;
      spent.set(uid, cur);
    }

    const byId = new Map<string, Row>();
    for (const p of profiles) byId.set(p.id, { ...p } as Row);
    for (const u of authUsers) {
      const existing = byId.get(u.uid) ?? ({ id: u.uid } as Row);
      byId.set(u.uid, {
        ...existing,
        email: existing["email"] ?? u.email ?? null,
        created_at: existing["created_at"] ?? u.createdAt ?? null,
        last_login_at: existing["last_login_at"] ?? u.lastLoginAt ?? null,
      });
    }

    const merged: Row[] = Array.from(byId.values())
      .filter((p) => !p["deleted_at"])
      .map((p) => ({ ...p, ...(spent.get(p.id) ?? { count: 0, sum: 0 }) }));
    return merged.sort(
      (a, b) =>
        new Date(String(b["created_at"] ?? 0)).getTime() -
        new Date(String(a["created_at"] ?? 0)).getTime(),
    );
  });

/** Everything the customer detail page needs, fetched with admin credentials. */
export const getAdminCustomer = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery, adminGetDoc, adminLookupUser } = await import("@/lib/firebase-admin.server");
    const uid = data.userId;
    const byUser = [{ field: "user_id", value: uid }];

    const [profile, auth, orders, addresses, designs, roles, bookings, reviews, cart, sofas] =
      await Promise.all([
        adminGetDoc("profiles", uid).catch(() => null),
        adminLookupUser(uid).catch(() => null),
        adminQuery("orders", byUser).catch(() => []),
        adminQuery("user_addresses", byUser).catch(() => []),
        adminQuery("saved_designs", byUser).catch(() => []),
        adminQuery("user_roles", byUser).catch(() => []),
        adminQuery("showroom_bookings", byUser).catch(() => []),
        adminQuery("reviews", byUser).catch(() => []),
        adminGetDoc("carts", uid).catch(() => null),
        adminQuery("sofas").catch(() => []),
      ]);

    const sofaById = new Map(sofas.map((s) => [s.id, s]));
    const desc = (rows: Row[], field = "created_at") =>
      [...rows].sort(
        (a, b) => new Date(String(b[field] ?? 0)).getTime() - new Date(String(a[field] ?? 0)).getTime(),
      );

    const roleSet = new Set<string>();
    for (const r of roles) {
      if (typeof r["role"] === "string") roleSet.add(r["role"] as string);
      for (const rr of (r["roles"] as string[] | undefined) ?? []) roleSet.add(rr);
    }

    return {
      profile: (profile as Row | null) ?? null,
      auth: auth
        ? {
            id: auth.uid,
            email: auth.email,
            phone: auth.phone,
            created_at: auth.createdAt,
            last_sign_in_at: auth.lastLoginAt,
            email_confirmed_at: auth.emailVerified ? auth.createdAt : null,
            provider: auth.provider,
          }
        : null,
      orders: desc(orders as Row[]),
      addresses: desc(addresses as Row[]),
      designs: desc(designs as Row[]).map((d) => {
        const s = d["sofa_id"] ? sofaById.get(String(d["sofa_id"])) : null;
        return {
          ...d,
          sofa: s ? { name: s["name"], slug: s["slug"], hero_image: s["hero_image"] } : null,
        };
      }),
      roles: Array.from(roleSet),
      bookings: desc(bookings as Row[]),
      reviews: desc(reviews as Row[]),
      cart: (cart as Row | null) ?? null,
    };
  });

/** Newsletter / welcome-popup subscribers (staff only). */
export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery } = await import("@/lib/firebase-admin.server");
    const rows = await adminQuery("newsletter_subscribers");
    return rows.sort(
      (a, b) =>
        new Date(String(b["created_at"] ?? 0)).getTime() -
        new Date(String(a["created_at"] ?? 0)).getTime(),
    );
  });

/** Customers holding a specific product in their cart (staff only, admin credentials). */
export const listProductCartHolders = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery, adminGetDoc, adminListUsers } = await import("@/lib/firebase-admin.server");
    const id = data.productId;
    const [sofa, carts, profiles, authUsers] = await Promise.all([
      adminGetDoc("sofas", id).catch(() => null),
      adminQuery("carts").catch(() => []),
      adminQuery("profiles").catch(() => []),
      adminListUsers().catch(() => []),
    ]);
    const slug = sofa ? String((sofa as Row)["slug"] ?? "") : "";
    const byUid = new Map<string, Row>((profiles as Row[]).map((p) => [p.id, p]));
    const authById = new Map(authUsers.map((u) => [u.uid, u]));

    const holders = [] as Array<{
      uid: string;
      name: string;
      email: string;
      phone: string;
      quantity: number;
      lastAdded: string | null;
      lines: Array<{ quantity: number; fabric?: string; size?: string; color?: string }>;
    }>;

    for (const c of carts as Row[]) {
      if (c["deleted_at"]) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(c["items"]) ? (c["items"] as any[]) : [];
      const lines = items
        .filter((it) => it && (it.sofaId === id || (slug && it.slug === slug)))
        .map((it) => ({
          quantity: Math.max(0, Number(it.quantity) || 0),
          fabric: it.fabric,
          size: it.size,
          color: it.color,
          addedAt: typeof it.addedAt === "string" ? it.addedAt : undefined,
        }))
        .filter((l) => l.quantity > 0);
      if (!lines.length) continue;
      const prof = byUid.get(c.id) ?? ({} as Row);
      const au = authById.get(c.id);
      const times = lines.map((l) => l.addedAt).filter(Boolean) as string[];
      holders.push({
        uid: c.id,
        name: String(prof["full_name"] ?? prof["name"] ?? "Guest customer"),
        email: String(prof["email"] ?? au?.email ?? "—"),
        phone: String(prof["phone"] ?? "—"),
        quantity: lines.reduce((n, l) => n + l.quantity, 0),
        lastAdded: times.length ? times.sort().at(-1)! : (String(c["updated_at"] ?? "") || null),
        lines: lines.map(({ quantity, fabric, size, color }) => ({ quantity, fabric, size, color })),
      });
    }

    return {
      product: sofa ? { id, name: String((sofa as Row)["name"] ?? "Product") } : { id, name: "Product" },
      holders: holders.sort((a, b) => (b.lastAdded ?? "").localeCompare(a.lastAdded ?? "")),
    };
  });

/** Cart-to-checkout funnel calculated from shared events and order records. */
export const getAdminCartInsights = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery } = await import("@/lib/firebase-admin.server");
    const [events, orders, carts] = await Promise.all([
      adminQuery("visitors").catch(() => []),
      adminQuery("orders").catch(() => []),
      adminQuery("carts").catch(() => []),
    ]);

    const additions = (events as Row[]).filter((e) => e["type"] === "add_to_cart");
    const visitorKeys = new Set(
      additions.map((e) => String(e["session"] ?? `${e["ua"] ?? "anon"}|${String(e["time"] ?? "").slice(0, 10)}`)),
    );
    const validOrders = (orders as Row[]).filter(
      (o) => !o["deleted_at"] && !["cancelled", "refunded"].includes(String(o["status"] ?? "")),
    );
    const checkoutKeys = new Set(
      validOrders.map((o) => String(
        o["checkout_id"] ?? `${o["user_id"] ?? "guest"}|${String(o["created_at"] ?? "").slice(0, 16)}`,
      )),
    );
    const productAdds = new Map<string, number>();
    for (const e of additions) {
      const item = String(e["item"] ?? "Unknown product");
      productAdds.set(item, (productAdds.get(item) ?? 0) + 1);
    }
    const productOrders = new Map<string, number>();
    for (const o of validOrders) {
      const snapshot = (o["sofa_snapshot"] ?? {}) as Record<string, unknown>;
      const item = String(snapshot["name"] ?? "Unknown product");
      productOrders.set(item, (productOrders.get(item) ?? 0) + 1);
    }
    const activeCarts = (carts as Row[]).filter(
      (c) => !c["deleted_at"] && Array.isArray(c["items"]) && (c["items"] as unknown[]).some((i) => {
        const line = i as Record<string, unknown>;
        return Number(line["quantity"] ?? 0) > 0;
      }),
    ).length;

    return {
      cartVisitors: visitorKeys.size,
      addEvents: additions.length,
      completedCheckouts: checkoutKeys.size,
      activeCarts,
      conversionRate: visitorKeys.size ? Math.round((checkoutKeys.size / visitorKeys.size) * 1000) / 10 : 0,
      productAdds: Array.from(productAdds.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      productOrders: Array.from(productOrders.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  });
