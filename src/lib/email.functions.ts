import { createServerFn } from "@tanstack/react-start";

const SITE_URL = "https://project--457d33ec-429c-4ee3-b069-5856f6428284.lovable.app";

type Brand = {
  brand_name: string;
  tagline: string;
  cities: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
};

const FALLBACK_BRAND: Brand = {
  brand_name: "True Furniture's",
  tagline: "Fully Customizable Furniture",
  cities: "Indore & Ujjain",
  phone: "+91 77738 96496",
  whatsapp: "917773896496",
  email: "hello@truefurnitures.in",
  address: "Vijay Nagar, Indore — 452010",
};

/** Brand details come from the admin CMS (site_settings) so one edit updates every email. */
async function getBrand(): Promise<Brand> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("brand_name, tagline, cities, phone, whatsapp, email, address")
      .eq("id", "default")
      .maybeSingle();
    return { ...FALLBACK_BRAND, ...(data ?? {}) } as Brand;
  } catch {
    return FALLBACK_BRAND;
  }
}

async function sendResend(to: string, subject: string, html: string, brand: Brand) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY not set");
    return { sent: false as const, error: "missing_key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: `${brand.brand_name} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[email] resend failed", res.status, body);
    return { sent: false as const, error: `resend_${res.status}` };
  }
  return { sent: true as const };
}

function shell(brand: Brand, eyebrow: string, inner: string) {
  return `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:40px 20px;color:#1a1a1a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:48px 40px;border:1px solid #eee;">
      <p style="letter-spacing:0.3em;text-transform:uppercase;font-size:11px;color:#a3712a;margin:0 0 24px;">${eyebrow}</p>
      ${inner}
      <hr style="border:none;border-top:1px solid #eee;margin:36px 0 16px;" />
      <p style="font-size:12px;color:#888;line-height:1.7;margin:0;">
        <strong>${brand.brand_name}</strong> — ${brand.tagline}<br/>
        ${brand.address} · ${brand.cities}<br/>
        ${brand.phone} · <a href="mailto:${brand.email}" style="color:#a3712a;text-decoration:none;">${brand.email}</a><br/>
        WhatsApp us at <a href="https://wa.me/${brand.whatsapp}" style="color:#a3712a;text-decoration:none;">${brand.phone}</a>
      </p>
    </div>
  </div>`;
}

function welcomeHtml(brand: Brand, name?: string | null) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hello,";
  return shell(
    brand,
    "Welcome to the Atelier",
    `
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">${greeting}</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Thank you for joining <strong>${brand.brand_name}</strong> — where every sofa is designed, tailored, and hand-crafted for you in ${brand.cities}.</p>
      <p style="font-size:16px;line-height:1.6;color:#333;">As a welcome gift, enjoy <strong>5% off</strong> your first bespoke order with code <span style="font-family:monospace;background:#faf7f2;padding:4px 10px;border:1px dashed #a3712a;letter-spacing:2px;">TF5-WELCOME</span>.</p>
      <p style="margin:32px 0 12px;">
        <a href="${SITE_URL}/design" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">Start Designing</a>
      </p>`,
  );
}

function orderHtml(
  brand: Brand,
  o: {
    id: string;
    total: number;
    deposit_paid: number;
    balance_due: number;
    name?: string | null;
    orderNumber?: string | null;
    item?: string | null;
    fabric?: string | null;
    quantity?: number | null;
    city?: string | null;
    eta?: string | null;
  },
) {
  const first = o.name ? o.name.split(" ")[0] : "there";
  const short = o.orderNumber ?? o.id.slice(0, 8).toUpperCase();
  return shell(
    brand,
    "Order Confirmed",
    `
      <h1 style="font-size:26px;line-height:1.2;margin:0 0 16px;font-weight:400;">Thank you, ${first}.</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Your deposit has been received and your bespoke sofa is now in the ${brand.brand_name} production queue. Order reference <strong>#${short}</strong>.</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;font-size:14px;background:#faf7f2;">
        <tr><td style="padding:10px 12px;color:#666;">Item</td><td style="padding:10px 12px;text-align:right;">${o.item ?? "Custom sofa"}${o.quantity && o.quantity > 1 ? ` × ${o.quantity}` : ""}</td></tr>
        ${o.fabric ? `<tr><td style="padding:10px 12px;color:#666;">Fabric</td><td style="padding:10px 12px;text-align:right;text-transform:capitalize;">${o.fabric}</td></tr>` : ""}
        ${o.city ? `<tr><td style="padding:10px 12px;color:#666;">Deliver to</td><td style="padding:10px 12px;text-align:right;">${o.city}</td></tr>` : ""}
        ${o.eta ? `<tr><td style="padding:10px 12px;color:#666;">Expected delivery</td><td style="padding:10px 12px;text-align:right;">${o.eta}</td></tr>` : ""}
      </table>
      <table style="width:100%;margin:24px 0;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;">Order total</td><td style="text-align:right;">₹${o.total.toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Deposit paid</td><td style="text-align:right;color:#0a7d3a;">₹${o.deposit_paid.toLocaleString("en-IN")}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#666;">Balance on delivery</td><td style="text-align:right;"><strong>₹${o.balance_due.toLocaleString("en-IN")}</strong></td></tr>
      </table>
      <p style="font-size:14px;color:#666;line-height:1.6;">We begin crafting your furniture now that your order is placed and the deposit is paid. You'll receive updates as it moves through production, dispatch, and delivery.</p>
      <p style="margin:28px 0 8px;">
        <a href="${SITE_URL}/orders/${o.id}/receipt" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">View Receipt</a>
      </p>`,
  );
}

/** Customer-facing copy for each order status. */
export const STATUS_EMAIL_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  confirmed: {
    subject: "Order confirmed — we're starting your build",
    heading: "Your order is confirmed",
    body: "Your deposit is in and your build slot is locked. Our craftsmen begin work on your furniture now.",
  },
  in_production: {
    subject: "Your furniture is being crafted",
    heading: "Now in the workshop",
    body: "Your frame is on the bench and the upholstery is being cut. This is the longest stage — we'll tell you the moment it clears quality check.",
  },
  quality_check: {
    subject: "Your furniture is in quality check",
    heading: "Final inspection underway",
    body: "Stitching, seams, foam density and finish are being inspected by hand before dispatch.",
  },
  shipped: {
    subject: "Your furniture has been dispatched",
    heading: "Dispatched",
    body: "Your order has left our workshop and is on the way to your city.",
  },
  out_for_delivery: {
    subject: "Out for delivery today",
    heading: "Out for delivery",
    body: "Our delivery team is on the way. Please keep the balance amount ready and clear the access path.",
  },
  delivered: {
    subject: "Delivered — thank you",
    heading: "Delivered",
    body: "Your furniture has been delivered and installed. We'd love a review — it helps other families in your city choose with confidence.",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    heading: "Order cancelled",
    body: "Your order has been cancelled. If a deposit was paid, our team will be in touch about the refund.",
  },
  refunded: {
    subject: "Your refund has been processed",
    heading: "Refund processed",
    body: "Your refund has been processed and should reflect in your account within 5–7 working days.",
  },
};

function statusHtml(
  brand: Brand,
  args: { name?: string | null; orderNumber: string; status: string; note?: string | null; eta?: string | null; orderId: string },
) {
  const copy = STATUS_EMAIL_COPY[args.status];
  const first = args.name ? args.name.split(" ")[0] : "there";
  return shell(
    brand,
    "Order Update",
    `
      <h1 style="font-size:26px;line-height:1.2;margin:0 0 16px;font-weight:400;">${copy?.heading ?? "Order update"}</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Hi ${first}, here's an update on order <strong>#${args.orderNumber}</strong>.</p>
      <p style="font-size:16px;line-height:1.6;color:#333;">${copy?.body ?? "Your order status has been updated."}</p>
      ${args.note ? `<p style="font-size:14px;line-height:1.6;color:#555;background:#faf7f2;padding:14px 16px;border-left:3px solid #a3712a;">${args.note}</p>` : ""}
      ${args.eta ? `<p style="font-size:14px;color:#666;">Expected delivery: <strong>${args.eta}</strong></p>` : ""}
      <p style="margin:28px 0 8px;">
        <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">Track My Order</a>
      </p>`,
  );
}

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const brand = await getBrand();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, total, deposit_paid, balance_due, user_id, delivery_city, expected_delivery_date, sofa_snapshot, fabric_snapshot",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { sent: false as const, error: "order_not_found" };
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (!profile?.email) return { sent: false as const, error: "no_email" };
    const sofa = (order.sofa_snapshot ?? {}) as { name?: string; quantity?: number };
    const fabric = (order.fabric_snapshot ?? {}) as { name?: string };
    return sendResend(
      profile.email,
      `Order confirmed — #${order.order_number ?? order.id.slice(0, 8).toUpperCase()} · ${brand.brand_name}`,
      orderHtml(brand, {
        id: order.id,
        orderNumber: order.order_number ?? null,
        total: Number(order.total) || 0,
        deposit_paid: Number(order.deposit_paid) || 0,
        balance_due: Number(order.balance_due) || 0,
        name: profile.full_name,
        item: sofa.name ?? null,
        quantity: sofa.quantity ?? null,
        fabric: fabric.name ?? null,
        city: order.delivery_city ?? null,
        eta: order.expected_delivery_date ?? null,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const brand = await getBrand();
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, user_id, expected_delivery_date")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { sent: false as const, error: "order_not_found" };
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (!profile?.email) return { sent: false as const, error: "no_email" };
    const orderNumber = order.order_number ?? order.id.slice(0, 8).toUpperCase();
    return sendResend(
      profile.email,
      `${copy.subject} — #${orderNumber} · ${brand.brand_name}`,
      statusHtml(brand, {
        name: profile.full_name,
        orderNumber,
        status: data.status,
        note: data.note ?? null,
        eta: order.expected_delivery_date ?? null,
        orderId: order.id,
      }),
      brand,
    );
  });
