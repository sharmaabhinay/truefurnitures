import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aggregateProductAnalytics, matchesProduct } from "@/lib/product-analytics";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: string };

/**
 * Staff check. The custom claim is authoritative when present, but many admins
 * are only recorded in the `user_roles` collection, so fall back to that.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Per-worker cache: admin screens poll and several panels read the same
// collections, and every Firestore document read counts against the daily
// quota. Identical reads within a minute are shared.
const readCache = new Map<string, { at: number; data: Promise<Row[]> }>();
// Last successful result per read, served (flagged as stale) when Firestore is
// temporarily unavailable so admins see real saved data instead of an error.
const lastGood = new Map<string, { at: number; rows: Row[] }>();
const READ_TTL_MS = 60_000;
const STALE_MAX_MS = 6 * 60 * 60_000;

export type ReadMeta = { staleSince?: string };

function friendlyReadError(col: string, e: unknown): string {
  const msg = String((e as Error)?.message ?? e);
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(msg)) return `The database's daily read limit was reached while loading ${col}. Data will load again automatically once the limit resets.`;
  if (/PERMISSION_DENIED|UNAUTHENTICATED|403|401|Firebase auth failed|Invalid character/i.test(msg)) return `The server could not access ${col} — the database credentials need checking.`;
  if (/UNAVAILABLE|DEADLINE|503|504|fetch failed|timeout/i.test(msg)) return `The database was slow to respond while loading ${col}. Please try again.`;
  return `Unable to read ${col}. Please try again.`;
}

async function safeQuery(
  q: (col: string, filters?: any[]) => Promise<any[]>,
  col: string,
  filters: Array<{ field: string; op?: string; value: unknown }> = [],
  meta?: ReadMeta,
): Promise<Row[]> {
  const key = `${col}|${JSON.stringify(filters)}`;
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.data;
  const data = (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rows = (await q(col, filters)) as Row[];
        lastGood.set(key, { at: Date.now(), rows });
        return rows;
      } catch (e) {
        lastError = e;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 700));
      }
    }
    console.error(`[admin] ${col} read failed`, lastError);
    readCache.delete(key);
    const stale = lastGood.get(key);
    if (stale && Date.now() - stale.at < STALE_MAX_MS) {
      if (meta) meta.staleSince = new Date(stale.at).toISOString();
      return stale.rows;
    }
    throw new Error(friendlyReadError(col, lastError));
  })();
  readCache.set(key, { at: Date.now(), data });
  return data;
}

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
      safeQuery(adminQuery, "orders"),
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
  .validator((d) => z.object({ userId: z.string().min(1) }).parse(d))
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
  .validator((d) => z.object({ productId: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery, adminGetDoc, adminListUsers } = await import("@/lib/firebase-admin.server");
    const id = data.productId;
    const [sofa, carts, profiles, authUsers] = await Promise.all([
      adminGetDoc("sofas", id).catch(() => null),
      safeQuery(adminQuery, "carts"),
      adminQuery("profiles").catch(() => []),
      adminListUsers().catch(() => []),
    ]);
    const slug = sofa ? String((sofa as Row)["slug"] ?? "") : "";
    const name = String(sofa?.["name"] ?? "");
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
        .filter((it) => it && matchesProduct(it, id, slug, name))
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
        lastAdded: times.length ? (times.sort().at(-1) ?? null) : (String(c["updated_at"] ?? "") || null),
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
      safeQuery(adminQuery, "visitors"),
      safeQuery(adminQuery, "orders"),
      safeQuery(adminQuery, "carts"),
    ]);

    const additions = (events as Row[]).filter((e) => e["type"] === "add_to_cart");
    const visitorKeys = new Set(
      additions.map((e) => String(e["session"] ?? `${e["ua"] ?? "anon"}|${String(e["time"] ?? "").slice(0, 10)}`)),
    );
    // Only compare like with like: checkouts placed after cart tracking began.
    const trackingStart = additions
      .map((e) => String(e["time"] ?? e["created_at"] ?? ""))
      .filter(Boolean)
      .sort()[0] ?? "";
    const validOrders = (orders as Row[]).filter(
      (o) =>
        !o["deleted_at"] &&
        !["cancelled", "refunded"].includes(String(o["status"] ?? "")) &&
        (!trackingStart || String(o["created_at"] ?? "") >= trackingStart),
    );
    const checkoutKeys = new Set(
      validOrders.map((o) => String(
        o["checkout_id"] ?? `${o["user_id"] ?? "guest"}|${String(o["created_at"] ?? "").slice(0, 16)}`,
      )),
    );
    // A checkout counts as converted when it is linked to a tracked cart session;
    // older orders without a session link count once per checkout.
    const convertedVisitorKeys = new Set<string>();
    for (const o of validOrders) {
      const session = String(o["checkout_session"] ?? "");
      if (session && visitorKeys.has(session)) convertedVisitorKeys.add(session);

    }
    const conversionBase = visitorKeys.size;
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
      conversionRate: conversionBase ? Math.round((convertedVisitorKeys.size / conversionBase) * 1000) / 10 : 0,
      productAdds: Array.from(productAdds.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      productOrders: Array.from(productOrders.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      updatedAt: new Date().toISOString(),
    };
  });

/** Full performance picture for one product (staff only). */
export const getProductAnalytics = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .validator((d) =>
    z.object({
      productId: z.string().min(1),
      range: z.enum(["7d", "30d", "12m"]).default("30d"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery, adminGetDoc } = await import("@/lib/firebase-admin.server");
    const id = data.productId;
    // Read the shared collection: a created_at-only filter excludes legacy
    // time-only records and timestamp-valued records before normalization.
    const [sofa, events, orders, carts] = await Promise.all([
      adminGetDoc("sofas", id),
      safeQuery(adminQuery, "visitors"),
      safeQuery(adminQuery, "orders"),
      safeQuery(adminQuery, "carts"),
    ]);
    if (!sofa) throw new Error("Product not found");
    return aggregateProductAnalytics(sofa, events, orders, carts, data.range);
  });

/** Staff-only manufacturer list, read with admin credentials. */
export const listAdminManufacturers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery } = await import("@/lib/firebase-admin.server");
    const rows = await adminQuery("manufacturers");
    return rows.filter((r) => !r["deleted_at"]) as Row[];
  });

/** Staff-only create/update of a manufacturer record. */
export const saveAdminManufacturer = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .validator((d: unknown) =>
    z
      .object({ id: z.string().optional(), data: z.record(z.string(), z.unknown()) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await staffOnly(context.role, context.userId);
    const { adminSetDoc, adminAddDoc } = await import("@/lib/firebase-admin.server");
    const payload = { ...data.data, updated_at: new Date().toISOString() };
    if (data.id) {
      await adminSetDoc("manufacturers", data.id, payload);
      return { id: data.id };
    }
    const id = await adminAddDoc("manufacturers", {
      ...payload,
      created_at: new Date().toISOString(),
    });
    return { id };
  });

/**
 * Tolerant product matching for activity records. Older events stored only a
 * slug or the product name, newer ones carry the document id.
 */
function eventMatchesProduct(e: Row, id: string, slug: string, name: string) {
  return matchesProduct(e, id, slug, name);
}

/**
 * Per-product headline counts for the admin product grid, read with admin
 * credentials so browser Firestore rules never blank them out.
 */
export const getAdminProductStats = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    await staffOnly(context.role, context.userId);
    const { adminQuery } = await import("@/lib/firebase-admin.server");
    const [sofas, events, orders, carts] = await Promise.all([
      safeQuery(adminQuery, "sofas"),
      safeQuery(adminQuery, "visitors"),
      safeQuery(adminQuery, "orders"),
      safeQuery(adminQuery, "carts"),
    ]);

    const liveOrders = (orders as Row[]).filter((o) => !o["deleted_at"] && !["cancelled", "refunded"].includes(String(o["status"] ?? "")));
    const liveCarts = (carts as Row[]).filter((c) => !c["deleted_at"]);

    const stats: Record<
      string,
      { orders: number; cartUnits: number; cartCustomers: number; impressions: number; views: number; addToCart: number }
    > = {};

    for (const s of sofas as Row[]) {
      const id = s.id;
      const slug = String(s["slug"] ?? "");
      const name = String(s["name"] ?? "");

      const mine = (events as Row[]).filter((e) => eventMatchesProduct(e, id, slug, name));
      const countType = (t: string) => mine.filter((e) => String(e["type"] ?? "") === t).length;

      const orderCount = liveOrders.filter((o) => {
        const snap = (o["sofa_snapshot"] ?? {}) as Record<string, unknown>;
        return matchesProduct(o, id, slug, name);
      }).length;

      let cartUnits = 0;
      let cartCustomers = 0;
      for (const c of liveCarts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = Array.isArray(c["items"]) ? (c["items"] as any[]) : [];
        const qty = items
          .filter((it) => it && matchesProduct(it, id, slug, name))
          .reduce((n, it) => n + Math.max(0, Number(it.quantity) || 0), 0);
        if (qty > 0) { cartUnits += qty; cartCustomers += 1; }
      }

      stats[id] = {
        orders: orderCount,
        cartUnits,
        cartCustomers,
        impressions: countType("impression"),
        views: countType("product_view"),
        addToCart: countType("add_to_cart"),
      };
    }

    return stats;
  });
