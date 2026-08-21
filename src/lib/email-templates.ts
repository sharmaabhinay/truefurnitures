const SITE_URL = "https://project--457d33ec-429c-4ee3-b069-5856f6428284.lovable.app";

export type Brand = {
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
export async function getBrand(): Promise<Brand> {
  try {
    const { adminGetDoc } = await import("@/lib/firebase-admin.server");
    const data = await adminGetDoc("site_settings", "default");
    if (!data) return FALLBACK_BRAND;
    const pick = (k: keyof Brand) =>
      typeof data[k] === "string" && data[k] ? (data[k] as string) : FALLBACK_BRAND[k];
    return {
      brand_name: pick("brand_name"),
      tagline: pick("tagline"),
      cities: pick("cities"),
      phone: pick("phone"),
      whatsapp: pick("whatsapp"),
      email: pick("email"),
      address: pick("address"),
    };
  } catch {
    return FALLBACK_BRAND;
  }
}

export async function sendResend(to: string, subject: string, html: string, brand: Brand) {
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

export function welcomeHtml(brand: Brand, name?: string | null) {
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

export function orderHtml(
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

export function statusHtml(
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


/** Notification sent to a customer when the studio replies in chat. */
export function messageReplyHtml(brand: Brand, args: { name?: string | null; body: string }) {
  const greeting = args.name ? `Hi ${args.name.split(" ")[0]},` : "Hello,";
  const safe = args.body.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return shell(
    brand,
    "New message",
    `<p style="margin:0 0 14px">${greeting}</p>
     <p style="margin:0 0 14px">You have a new reply from the ${brand.brand_name} team:</p>
     <blockquote style="margin:0 0 18px;padding:12px 16px;background:#f6f3ee;border-left:3px solid #C8A86B;white-space:pre-wrap">${safe}</blockquote>
     <p style="margin:0"><a href="https://truefurnitures.lovable.app/messages" style="color:#C8A86B">Open your messages</a></p>`,
  );
}

/** Deposit payment status update (paid / failed / pending) with receipt + next steps. */
export function depositStatusHtml(
  brand: Brand,
  args: {
    name?: string | null;
    orderNumber: string;
    orderId: string;
    state: "paid" | "failed" | "pending";
    amount: number;
    balance?: number;
    reason?: string | null;
  },
) {
  const first = args.name ? args.name.split(" ")[0] : "there";
  const heading =
    args.state === "paid"
      ? "Deposit received"
      : args.state === "failed"
        ? "Deposit payment failed"
        : "Deposit payment pending";
  const body =
    args.state === "paid"
      ? `We've received your ₹${args.amount.toLocaleString("en-IN")} deposit for order <strong>#${args.orderNumber}</strong>. Your build slot is locked and our craftsmen begin work now.`
      : args.state === "failed"
        ? `Your ₹${args.amount.toLocaleString("en-IN")} deposit for order <strong>#${args.orderNumber}</strong> could not be completed${args.reason ? ` (${args.reason})` : ""}. No amount has been charged — you can retry securely below.`
        : `Your ₹${args.amount.toLocaleString("en-IN")} deposit for order <strong>#${args.orderNumber}</strong> is still being confirmed by the bank. We'll email you the moment it clears.`;
  const cta =
    args.state === "paid"
      ? { label: "View Receipt", href: `${SITE_URL}/orders/${args.orderId}/receipt` }
      : { label: "Retry Payment", href: `${SITE_URL}/payment-status?orderId=${args.orderId}` };
  const next =
    args.state === "paid"
      ? `Next: we'll share production updates as your furniture moves through the workshop. Balance of ₹${(args.balance ?? 0).toLocaleString("en-IN")} is payable on delivery.`
      : "Next: retry the deposit to confirm your order. Your configuration and price stay reserved for 48 hours.";
  return shell(
    brand,
    "Payment Update",
    `
      <h1 style="font-size:26px;line-height:1.2;margin:0 0 16px;font-weight:400;">${heading}</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Hi ${first}, ${body}</p>
      <p style="font-size:14px;color:#666;line-height:1.6;">${next}</p>
      <p style="margin:28px 0 8px;">
        <a href="${cta.href}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">${cta.label}</a>
      </p>`,
  );
}

/**
 * Sends an SMS through Twilio when credentials are configured.
 * Silently no-ops (returns a reason) when no SMS provider is connected.
 */
export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { sent: false as const, error: "sms_not_configured" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    console.error("[sms] twilio failed", res.status, await res.text());
    return { sent: false as const, error: `twilio_${res.status}` };
  }
  return { sent: true as const };
}

export function depositStatusSms(
  brand: Brand,
  args: { orderNumber: string; orderId: string; state: "paid" | "failed" | "pending"; amount: number },
) {
  const amt = `₹${args.amount.toLocaleString("en-IN")}`;
  if (args.state === "paid")
    return `${brand.brand_name}: Deposit of ${amt} received for order #${args.orderNumber}. Receipt: ${SITE_URL}/orders/${args.orderId}/receipt`;
  if (args.state === "failed")
    return `${brand.brand_name}: Deposit of ${amt} for order #${args.orderNumber} failed. Retry: ${SITE_URL}/payment-status?orderId=${args.orderId}`;
  return `${brand.brand_name}: Deposit of ${amt} for order #${args.orderNumber} is pending confirmation. Status: ${SITE_URL}/payment-status?orderId=${args.orderId}`;
}
