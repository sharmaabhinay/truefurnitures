import { createServerFn } from "@tanstack/react-start";

const FROM = "True Furniture's <onboarding@resend.dev>";

async function sendResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY not set");
    return { sent: false as const, error: "missing_key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[email] resend failed", res.status, body);
    return { sent: false as const, error: `resend_${res.status}` };
  }
  return { sent: true as const };
}

function welcomeHtml(name?: string | null) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hello,";
  return `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:40px 20px;color:#1a1a1a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:48px 40px;border:1px solid #eee;">
      <p style="letter-spacing:0.3em;text-transform:uppercase;font-size:11px;color:#a3712a;margin:0 0 24px;">Welcome to the Atelier</p>
      <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">${greeting}</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Thank you for joining <strong>True Furniture's</strong> — where every sofa is designed, tailored, and hand-crafted for you in Indore &amp; Ujjain.</p>
      <p style="font-size:16px;line-height:1.6;color:#333;">As a welcome gift, enjoy <strong>5% off</strong> your first bespoke order with code <span style="font-family:monospace;background:#faf7f2;padding:4px 10px;border:1px dashed #a3712a;letter-spacing:2px;">TF5-WELCOME</span>.</p>
      <p style="margin:32px 0 12px;">
        <a href="https://project--457d33ec-429c-4ee3-b069-5856f6428284.lovable.app/design" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">Start Designing</a>
      </p>
      <p style="font-size:12px;color:#888;margin-top:40px;">If you have any questions, reply to this email or WhatsApp us at +91 77738 96496.</p>
    </div>
  </div>`;
}

function orderHtml(o: { id: string; total: number; deposit_paid: number; balance_due: number; name?: string | null }) {
  const first = o.name ? o.name.split(" ")[0] : "there";
  const short = o.id.slice(0, 8).toUpperCase();
  return `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:40px 20px;color:#1a1a1a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:48px 40px;border:1px solid #eee;">
      <p style="letter-spacing:0.3em;text-transform:uppercase;font-size:11px;color:#a3712a;margin:0 0 24px;">Order Confirmed</p>
      <h1 style="font-size:26px;line-height:1.2;margin:0 0 16px;font-weight:400;">Thank you, ${first}.</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;">Your deposit has been received and your bespoke sofa is now in our production queue. Order reference <strong>#${short}</strong>.</p>
      <table style="width:100%;margin:24px 0;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;">Order total</td><td style="text-align:right;">₹${o.total.toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Deposit paid (20%)</td><td style="text-align:right;color:#0a7d3a;">₹${o.deposit_paid.toLocaleString("en-IN")}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#666;">Balance on delivery</td><td style="text-align:right;"><strong>₹${o.balance_due.toLocaleString("en-IN")}</strong></td></tr>
      </table>
      <p style="font-size:14px;color:#666;line-height:1.6;">Our craftsmen will begin work shortly. You'll receive updates as your order progresses through production, dispatch, and delivery.</p>
      <p style="margin:28px 0 8px;">
        <a href="https://project--457d33ec-429c-4ee3-b069-5856f6428284.lovable.app/orders/${o.id}/receipt" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;">View Receipt</a>
      </p>
      <p style="font-size:12px;color:#888;margin-top:40px;">Questions? Reply here or WhatsApp +91 77738 96496.</p>
    </div>
  </div>`;
}

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; name?: string | null }) => d)
  .handler(async ({ data }) => {
    if (!data.email) return { sent: false as const, error: "no_email" };
    return sendResend(data.email, "Welcome to True Furniture's", welcomeHtml(data.name));
  });

export const sendOrderConfirmationEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, total, deposit_paid, balance_due, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) {
      return { sent: false as const, error: "order_not_found" };
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (!profile?.email) return { sent: false as const, error: "no_email" };
    return sendResend(
      profile.email,
      `Order confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
      orderHtml({
        id: order.id,
        total: Number(order.total) || 0,
        deposit_paid: Number(order.deposit_paid) || 0,
        balance_due: Number(order.balance_due) || 0,
        name: profile.full_name,
      }),
    );
  });