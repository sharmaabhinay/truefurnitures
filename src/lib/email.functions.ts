import { createServerFn } from "@tanstack/react-start";
import {
  getBrand,
  orderHtml,
  sendResend,
  statusHtml,
  STATUS_EMAIL_COPY,
  welcomeHtml,
} from "@/lib/email-templates";

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; name?: string | null }) => d)
  .handler(async ({ data }) => {
    if (!data.email) return { sent: false as const, error: "no_email" };
    const brand = await getBrand();
    return sendResend(data.email, `Welcome to ${brand.brand_name}`, welcomeHtml(brand, data.name), brand);
  });

export const sendOrderConfirmationEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const brand = await getBrand();
    const order = await adminGetDoc("orders", data.orderId);
    if (!order) return { sent: false as const, error: "order_not_found" };
    const profile = order['user_id']
      ? await adminGetDoc("profiles", String(order['user_id']))
      : null;
    const email = typeof profile?.['email'] === "string" ? (profile['email'] as string) : null;
    if (!email) return { sent: false as const, error: "no_email" };
    const sofa = (order.sofa_snapshot ?? {}) as { name?: string; quantity?: number };
    const fabric = (order.fabric_snapshot ?? {}) as { name?: string };
    return sendResend(
      email,
      `Order confirmed — #${order.order_number ?? order.id.slice(0, 8).toUpperCase()} · ${brand.brand_name}`,
      orderHtml(brand, {
        id: order.id,
        orderNumber: (order['order_number'] as string | null) ?? null,
        total: Number(order.total) || 0,
        deposit_paid: Number(order.deposit_paid) || 0,
        balance_due: Number(order.balance_due) || 0,
        name: (profile?.['full_name'] as string | null) ?? null,
        item: sofa.name ?? null,
        quantity: sofa.quantity ?? null,
        fabric: fabric.name ?? null,
        city: (order['delivery_city'] as string | null) ?? null,
        eta: (order['expected_delivery_date'] as string | null) ?? null,
      }),
      brand,
    );
  });

/** Notifies the customer when an admin moves the order to a new status. */
export const sendOrderStatusEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; status: string; note?: string | null }) => d)
  .handler(async ({ data }) => {
    const copy = STATUS_EMAIL_COPY[data.status];
    if (!copy) return { sent: false as const, error: "no_template_for_status" };
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const brand = await getBrand();
    const order = await adminGetDoc("orders", data.orderId);
    if (!order) return { sent: false as const, error: "order_not_found" };
    const profile = order['user_id']
      ? await adminGetDoc("profiles", String(order['user_id']))
      : null;
    const email = typeof profile?.['email'] === "string" ? (profile['email'] as string) : null;
    if (!email) return { sent: false as const, error: "no_email" };
    const orderNumber = (order['order_number'] as string | null) ?? order.id.slice(0, 8).toUpperCase();
    return sendResend(
      email,
      `${copy.subject} — #${orderNumber} · ${brand.brand_name}`,
      statusHtml(brand, {
        name: (profile?.['full_name'] as string | null) ?? null,
        orderNumber,
        status: data.status,
        note: data.note ?? null,
        eta: (order['expected_delivery_date'] as string | null) ?? null,
        orderId: order.id,
      }),
      brand,
    );
  });
