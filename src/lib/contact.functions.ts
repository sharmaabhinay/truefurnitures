import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/),
  email: z.string().trim().max(200).email().or(z.literal("")),
  message: z.string().trim().max(2000),
});

/**
 * Public contact form. Saved on the server so the request never depends on the
 * visitor's browser keeping a live database connection open.
 */
export const submitContactRequest = createServerFn({ method: "POST" })
  .validator((data) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { adminAddDoc } = await import("@/lib/firebase-admin.server");
    const now = new Date();
    const id = await adminAddDoc("showroom_bookings", {
      status: "pending",
      source: "contact_form",
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      notes: data.message || null,
      party_size: 1,
      showroom_id: null,
      preferred_date: now.toISOString().slice(0, 10),
      preferred_time: now.toISOString().slice(11, 16),
      created_at: now.toISOString(),
    });
    return { id };
  });
