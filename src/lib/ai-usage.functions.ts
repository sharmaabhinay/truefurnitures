import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import type { AiUsageRow } from "./ai-usage";

export const openAiSession = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ task: z.enum(["finder", "question", "description", "reply"]), guestId: z.string().uuid() }).parse(v))
  .handler(async ({ data }) => {
    const { verifyIdToken, adminGetDoc, adminSetDoc } = await import("./firebase-admin.server");
    const bearer = getRequest().headers.get("authorization");
    const user = bearer?.startsWith("Bearer ") ? await verifyIdToken(bearer.slice(7)) : null;
    if (data.task === "description" || data.task === "reply") {
      if (!user) throw new Error("Staff sign-in required");
      const { staffOnly } = await import("./admin-data.functions");
      await staffOnly(user.role, user.uid);
    }
    const profile = user ? await adminGetDoc("profiles", user.uid) : null;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await adminSetDoc("ai_usage", id, { task: data.task, user_id: user?.uid ?? `guest:${data.guestId}`, name: profile?.['full_name'] ?? user?.email ?? "Guest", role: user?.role ?? (user ? "user" : "guest"), started_at: now, last_seen: now, seconds: 0, attempts: 0, successes: 0, failures: 0, blocked: 0, closed: false });
    return { id };
  });

/** Opaque session IDs grant only bounded timing updates, never reads or identity changes. */
export const updateAiSession = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), close: z.boolean() }).parse(v))
  .handler(async ({ data }) => {
    const { adminTransaction } = await import("./firebase-admin.server");
    await adminTransaction(async tx => {
      const row = await tx.get("ai_usage", data.id);
      if (!row || row['closed']) return;
      const gap = Math.max(0, (Date.now() - Date.parse(String(row['last_seen']))) / 1000);
      tx.set("ai_usage", data.id, { seconds: Number(row['seconds'] ?? 0) + Math.min(120, Math.round(gap)), last_seen: new Date().toISOString(), closed: data.close || gap > 120 });
    });
    return { ok: true };
  });

export const getAiUsage = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((v: unknown) => z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(365)]) }).parse(v))
  .handler(async ({ data, context }) => {
    const { staffOnly } = await import("./admin-data.functions");
    await staffOnly(context.role, context.userId);
    const { adminQuery } = await import("./firebase-admin.server");
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    return await adminQuery("ai_usage", [{ field: "started_at", op: "GREATER_THAN_OR_EQUAL", value: since }]) as unknown as AiUsageRow[];
  });