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
