import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: string };

function staffOnly(role: string | undefined) {
  if (role !== "admin" && role !== "staff") throw new Response("Forbidden", { status: 403 });
}

/**
 * Customer list built on the server so it never depends on the browser
 * Firestore SDK (slow cold start) and always includes freshly registered
 * users, even when their profile document lagged behind sign-up.
 */
export const listAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    staffOnly(context.role);
    const { adminQuery, adminListUsers } = await import("@/lib/firebase-admin.server");
    const [authUsers, profiles, orders] = await Promise.all([
      adminListUsers().catch(() => []),
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

    return Array.from(byId.values())
      .filter((p) => !p["deleted_at"])
      .map((p) => ({ ...p, ...(spent.get(p.id) ?? { count: 0, sum: 0 }) }))
      .sort(
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
    staffOnly(context.role);
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
    staffOnly(context.role);
    const { adminQuery } = await import("@/lib/firebase-admin.server");
    const rows = await adminQuery("newsletter_subscribers");
    return rows.sort(
      (a, b) =>
        new Date(String(b["created_at"] ?? 0)).getTime() -
        new Date(String(a["created_at"] ?? 0)).getTime(),
    );
  });
