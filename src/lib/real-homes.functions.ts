import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import { staffOnly } from "./admin-data.functions";
import { homeSubmissionInput, eligibleHomeOrder, imageBytes, homeStory } from "./real-homes";

export const listRealHomes = createServerFn({ method: "GET" }).handler(async () => {
  const { adminQuery } = await import("./firebase-admin.server");
  const rows = await adminQuery("real_homes", [{ field: "status", value: "approved" }], { limit: 100 });
  return rows.map(homeStory).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
export const myHomeSubmissions = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).handler(async ({ context }) => {
  const { adminQuery } = await import("./firebase-admin.server");
  const [orders, submissions] = await Promise.all([
    adminQuery("orders", [{ field: "user_id", value: context.userId }]),
    adminQuery("real_homes", [{ field: "user_id", value: context.userId }]),
  ]);
  return { orders: orders.filter(order => eligibleHomeOrder(order, context.userId)).map(order => ({ id: order.id, number: String(order['order_number']), name: String((order['sofa_snapshot'] as { name?: string } | null)?.name ?? "Custom sofa") })), submissions: submissions.map(homeStory) };
});
export const submitRealHome = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth])
  .inputValidator(input => homeSubmissionInput.parse(input)).handler(async ({ data, context }) => {
    const { adminGetDoc, adminSetDoc } = await import("./firebase-admin.server");
    const order = await adminGetDoc("orders", data.orderId);
    if (!eligibleHomeOrder(order, context.userId)) throw new Error("Choose one of your delivered sofa orders.");
    const photos = data.images.map(imageBytes);
    const cloud = process.env['CLOUDINARY_CLOUD_NAME']; const key = process.env['CLOUDINARY_API_KEY']; const secret = process.env['CLOUDINARY_API_SECRET'];
    if (!cloud || !key || !secret) throw new Error("Photo uploads are temporarily unavailable.");
    const id = crypto.randomUUID(); const folder = `real-homes/${context.userId}/${id}`;
    const images: string[] = [];
    for (const photo of photos) {
      const timestamp = Math.floor(Date.now() / 1000);
      const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`folder=${folder}&timestamp=${timestamp}${secret}`));
      const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      const form = new FormData(); form.append("file", new Blob([photo.bytes], { type: photo.mime }), "room-photo");
      form.append("api_key", key); form.append("timestamp", String(timestamp)); form.append("signature", signature); form.append("folder", folder);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
      const json = await response.json() as { secure_url?: string };
      if (!response.ok || !json.secure_url?.startsWith("https://res.cloudinary.com/")) throw new Error("Photo upload failed. Please try again.");
      images.push(json.secure_url.replace("/upload/", "/upload/f_auto,q_auto,w_1800/"));
    }
    await adminSetDoc("real_homes", id, { user_id: context.userId, order_id: data.orderId, locality: data.locality, caption: data.caption,
      sofa_name: (order?.['sofa_snapshot'] as { name?: string } | null)?.name ?? "Custom sofa", images, status: "pending", consent: true, created_at: new Date().toISOString() });
    return { id };
  });
export const listHomeModeration = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).handler(async ({ context }) => {
  await staffOnly(context.role, context.userId);
  const { adminQuery } = await import("./firebase-admin.server");
  return (await adminQuery("real_homes", [], { limit: 200 })).map(homeStory).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
export const moderateHome = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth])
  .inputValidator(input => z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await staffOnly(context.role, context.userId);
    const { adminGetDoc, adminSetDoc } = await import("./firebase-admin.server");
    if (!await adminGetDoc("real_homes", data.id)) throw new Error("Submission not found.");
    await adminSetDoc("real_homes", data.id, { status: data.status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() });
    return { ok: true };
  });