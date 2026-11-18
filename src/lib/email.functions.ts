import { createServerFn } from "@tanstack/react-start";
import {
  getBrand,
  orderHtml,
  sendResend,
  statusHtml,
  STATUS_EMAIL_COPY,
  welcomeHtml,
  messageReplyHtml,
  depositStatusHtml,
  depositStatusSms,
  sendSms,
  shell,
} from "@/lib/email-templates";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .validator((d: { email: string; name?: string | null }) => d)
  .handler(async ({ data }) => {
    if (!data.email) return { sent: false as const, error: "no_email" };
    const brand = await getBrand();
    return sendResend(data.email, `Welcome to ${brand.brand_name}`, welcomeHtml(brand, data.name), brand);
  });

export const sendOrderConfirmationEmail = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
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
  .validator((d: { orderId: string; status: string; note?: string | null }) => d)
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

export const sendMessageReplyEmail = createServerFn({ method: "POST" })
  .validator((d: { customerId: string; body: string }) => d)
  .handler(async ({ data }) => {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const brand = await getBrand();
    const profile = await adminGetDoc("profiles", data.customerId);
    const email = typeof profile?.['email'] === "string" ? (profile['email'] as string) : null;
    if (!email) return { sent: false as const, error: "no_email" };
    return sendResend(
      email,
      `New message from ${brand.brand_name}`,
      messageReplyHtml(brand, { name: (profile?.['full_name'] as string | null) ?? null, body: data.body }),
      brand,
    );
  });

/** Emails (and SMSes, when a provider is configured) the customer on deposit status changes. */
export const sendDepositStatusNotification = createServerFn({ method: "POST" })
  .validator(
    (d: { orderId: string; state: "paid" | "failed" | "pending"; reason?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const brand = await getBrand();
    const order = await adminGetDoc("orders", data.orderId);
    if (!order) return { sent: false as const, error: "order_not_found" };
    const profile = order['user_id'] ? await adminGetDoc("profiles", String(order['user_id'])) : null;
    const orderNumber =
      (order['order_number'] as string | null) ?? order.id.slice(0, 8).toUpperCase();
    const total = Number(order['total']) || 0;
    const amount =
      data.state === "paid"
        ? Number(order['deposit_paid']) || Math.round(total * 0.2)
        : Math.round(total * 0.2);
    const balance = Number(order['balance_due']) || Math.max(0, total - amount);

    const email = typeof profile?.['email'] === "string" ? (profile['email'] as string) : null;
    let emailResult: { sent: boolean; error?: string } = { sent: false, error: "no_email" };
    if (email) {
      emailResult = await sendResend(
        email,
        `${data.state === "paid" ? "Deposit received" : data.state === "failed" ? "Deposit payment failed" : "Deposit payment pending"} — #${orderNumber} · ${brand.brand_name}`,
        depositStatusHtml(brand, {
          name: (profile?.['full_name'] as string | null) ?? null,
          orderNumber,
          orderId: order.id,
          state: data.state,
          amount,
          balance,
          reason: data.reason ?? null,
        }),
        brand,
      );
    }

    const phoneRaw =
      (profile?.['phone'] as string | null) ?? (order['delivery_phone'] as string | null) ?? null;
    const phone = phoneRaw
      ? phoneRaw.startsWith("+")
        ? phoneRaw
        : `+91${phoneRaw.replace(/\D/g, "").slice(-10)}`
      : null;
    const smsResult = phone
      ? await sendSms(phone, depositStatusSms(brand, { orderNumber, orderId: order.id, state: data.state, amount }))
      : { sent: false as const, error: "no_phone" };

    return { sent: emailResult.sent || smsResult.sent, email: emailResult, sms: smsResult };
  });

/** Emails the customer when a quote request is answered / needs follow-up. */
export const sendQuoteStatusEmail = createServerFn({ method: "POST" })
  .validator((d: { bookingId: string; status: string; note?: string | null }) => d)
  .handler(async ({ data }) => {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const { quoteStatusHtml, QUOTE_STATUS_COPY } = await import("@/lib/email-templates");
    const brand = await getBrand();
    const booking = await adminGetDoc("showroom_bookings", data.bookingId);
    if (!booking) return { sent: false as const, error: "not_found" };
    const email = typeof booking['email'] === "string" ? (booking['email'] as string) : null;
    if (!email) return { sent: false as const, error: "no_email" };
    const copy = QUOTE_STATUS_COPY[data.status] ?? QUOTE_STATUS_COPY['reminder']!;
    return sendResend(
      email,
      `${copy.subject} · ${brand.brand_name}`,
      quoteStatusHtml(brand, {
        name: (booking['full_name'] as string | null) ?? null,
        status: data.status,
        note: data.note ?? null,
      }),
      brand,
    );
  });

/** Emails the customer a workshop progress photo the team just posted on their order. Staff only. */
export const sendOrderProgressEmail = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .validator((d: { orderId: string; imageUrl: string; caption?: string | null }) => {
    if (!/^https:\/\//.test(d.imageUrl)) throw new Error("Invalid photo link");
    return { orderId: String(d.orderId), imageUrl: d.imageUrl, caption: (d.caption ?? "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    let role = context.role;
    if (role !== "admin" && role !== "staff") {
      const row = await adminGetDoc("user_roles", context.userId);
      role = typeof row?.["role"] === "string" ? (row["role"] as string) : role;
    }
    if (role !== "admin" && role !== "staff") throw new Error("Staff only");
    const order = await adminGetDoc("orders", data.orderId);
    if (!order) return { sent: false as const, error: "order_not_found" };
    const profile = order["user_id"] ? await adminGetDoc("profiles", String(order["user_id"])) : null;
    const email = typeof profile?.["email"] === "string" ? (profile["email"] as string) : null;
    if (!email) return { sent: false as const, error: "no_email" };
    const brand = await getBrand();
    const orderNumber = (order["order_number"] as string | null) ?? order.id.slice(0, 8).toUpperCase();
    const name = (profile?.["full_name"] as string | null) ?? null;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html = shell(
      brand,
      "Workshop update",
      `<p style="margin:0 0 14px">${name ? `Hi ${esc(name.split(" ")[0])},` : "Hello,"}</p>
       <p style="margin:0 0 14px">Here's a fresh look at your sofa being made in our workshop (order #${esc(orderNumber)}).</p>
       <img src="${esc(data.imageUrl)}" alt="Your sofa in production" style="display:block;width:100%;max-width:480px;margin:0 0 14px;border:1px solid #eee" />
       ${data.caption ? `<p style="margin:0 0 18px;white-space:pre-wrap">${esc(data.caption)}</p>` : ""}
       <p style="margin:0"><a href="https://truefurnitures.lovable.app/dashboard" style="color:#C8A86B">Track your order</a></p>`,
    );
    return sendResend(email, `Workshop update — #${orderNumber} · ${brand.brand_name}`, html, brand);
  });
