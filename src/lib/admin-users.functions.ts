import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

/** Fetch a single user's Firebase Auth + profile details (admin/staff only). */
export const getAuthUserDetails = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    if (context.role !== "admin" && context.role !== "staff") {
      throw new Response("Forbidden", { status: 403 });
    }

    const { adminLookupUser } = await import("@/lib/firebase-admin.server");
    const auth = await adminLookupUser(data.userId);
    if (!auth) throw new Response("Not found", { status: 404 });

    return {
      id: auth.uid,
      email: auth.email,
      phone: auth.phone,
      created_at: auth.createdAt,
      last_sign_in_at: auth.lastLoginAt,
      email_confirmed_at: auth.emailVerified ? auth.createdAt : null,
      provider: auth.provider,
      user_metadata: {},
    };
  });

/** List every registered user merged with their profile + role (admin only). */
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });

    const { adminListUsers, adminQuery } = await import("@/lib/firebase-admin.server");
    const [authUsers, profiles, roleDocs] = await Promise.all([
      adminListUsers(),
      adminQuery("profiles"),
      adminQuery("user_roles"),
    ]);

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roleDocs) {
      const uid = String(r["user_id"] ?? r.id);
      const list = rolesByUser.get(uid) ?? [];
      if (typeof r["role"] === "string") list.push(r["role"] as string);
      rolesByUser.set(uid, list);
    }

    return authUsers.map((u) => {
      const profile = profileById.get(u.uid);
      return {
        id: u.uid,
        email: u.email ?? (profile?.["email"] as string | null) ?? null,
        full_name: (profile?.["full_name"] as string | null) ?? null,
        created_at: u.createdAt,
        last_sign_in_at: u.lastLoginAt,
        roles: rolesByUser.get(u.uid) ?? [],
      };
    });
  });

/** Grant or revoke the admin/staff role for a user (admin only). Updates both
 * the Firebase custom claim and the `user_roles` Firestore doc. */
export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetUserId: z.string().min(1),
        role: z.enum(["admin", "staff", "user"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });

    const { setUserRole, adminSetDoc, adminQuery } = await import("@/lib/firebase-admin.server");
    await setUserRole(data.targetUserId, data.role);

    if (data.role === "user") {
      const { adminDeleteDoc } = await import("@/lib/firebase-admin.server");
      const existing = await adminQuery("user_roles", [{ field: "user_id", value: data.targetUserId }]);
      for (const doc of existing) {
        await adminDeleteDoc("user_roles", doc.id);
      }
    } else {
      await adminSetDoc("user_roles", data.targetUserId, {
        user_id: data.targetUserId,
        role: data.role,
        roles: [data.role],
      });
    }

    return { success: true as const };
  });

const ROLE = z.enum(["admin", "staff"]);

/** List only the accounts that carry an admin/staff role (admin only). */
export const listAdminTeam = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });

    const { adminListUsers, adminQuery } = await import("@/lib/firebase-admin.server");
    const [authUsers, roleDocs] = await Promise.all([adminListUsers(), adminQuery("user_roles")]);

    const byUid = new Map(authUsers.map((u) => [u.uid, u]));
    return roleDocs
      .map((d) => {
        const uid = String(d["user_id"] ?? d.id);
        const role = String(d["role"] ?? "user");
        if (role !== "admin" && role !== "staff") return null;
        const u = byUid.get(uid);
        return {
          uid,
          role: role as "admin" | "staff",
          email: u?.email ?? ((d["email"] as string | null) ?? null),
          name: (d["name"] as string | null) ?? null,
          created_at: u?.createdAt ?? null,
          last_sign_in_at: u?.lastLoginAt ?? null,
          exists: !!u,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  });

/** Create a new admin/staff account (admin only). */
export const createAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        name: z.string().max(120).optional(),
        role: ROLE,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });

    const { adminCreateUser, setUserRole, adminSetDoc } = await import("@/lib/firebase-admin.server");
    const uid = await adminCreateUser(data.email, data.password, data.name);
    await setUserRole(uid, data.role);
    await adminSetDoc("user_roles", uid, {
      user_id: uid,
      role: data.role,
      roles: [data.role],
      email: data.email,
      name: data.name ?? null,
      created_at: new Date().toISOString(),
    });
    await adminSetDoc("profiles", uid, {
      id: uid,
      email: data.email,
      full_name: data.name ?? null,
      updated_at: new Date().toISOString(),
    });
    return { uid };
  });

/** Change an admin/staff member's role, name or password (admin only). */
export const updateAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) =>
    z
      .object({
        uid: z.string().min(1),
        role: ROLE.optional(),
        name: z.string().max(120).optional(),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });
    if (data.uid === context.userId && data.role && data.role !== "admin") {
      throw new Response("You cannot remove your own admin access", { status: 400 });
    }

    const { setUserRole, adminSetDoc, adminSetPassword } = await import("@/lib/firebase-admin.server");
    if (data.password) await adminSetPassword(data.uid, data.password);
    if (data.role) await setUserRole(data.uid, data.role);

    const patch: Record<string, unknown> = { user_id: data.uid, updated_at: new Date().toISOString() };
    if (data.role) {
      patch["role"] = data.role;
      patch["roles"] = [data.role];
    }
    if (data.name !== undefined) patch["name"] = data.name;
    await adminSetDoc("user_roles", data.uid, patch);
    return { success: true as const };
  });

/** Revoke access, and optionally delete the login entirely (admin only). */
export const removeAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d) =>
    z.object({ uid: z.string().min(1), deleteLogin: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    if (context.role !== "admin") throw new Response("Forbidden", { status: 403 });
    if (data.uid === context.userId) {
      throw new Response("You cannot remove your own account", { status: 400 });
    }

    const { setUserRole, adminDeleteDoc, adminDeleteUser } = await import("@/lib/firebase-admin.server");
    await setUserRole(data.uid, "user");
    await adminDeleteDoc("user_roles", data.uid);
    if (data.deleteLogin) await adminDeleteUser(data.uid);
    return { success: true as const };
  });
