import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/lib/auth/firebase-auth-middleware";

export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return null;
}

type Result = { sent: boolean; error?: string };

/** Sends an order's invoice to its customer by email (PDF attached) and/or SMS (receipt link). Staff only. */
export const sendInvoiceToCustomer = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: { orderId: string; email: boolean; sms: boolean; pdfBase64?: string; filename?: string }) => {
    if (!d?.orderId || typeof d.orderId !== "string") throw new Error("orderId required");
    if (d.pdfBase64 && d.pdfBase64.length > 8_000_000) throw new Error("Invoice too large");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { staffOnly } = await import("@/lib/admin-data.functions");
    await staffOnly(context.role, context.userId);
    const { adminGetDoc, adminGetUser } = await import("@/lib/firebase-admin.server") as Record<string, any>;
    const { getBrand, sendResend, sendSms, SITE_URL } = await import("@/lib/email-templates");
    const order = await adminGetDoc("orders", data.orderId);
    if (!order) throw new Error("Order not found");
    const brand = await getBrand();
    const profile = order["user_id"] ? await adminGetDoc("profiles", String(order["user_id"])).catch(() => null) : null;
    let email = (profile?.["email"] as string | undefined) ?? (order["email"] as string | undefined) ?? null;
    if (!email && order["user_id"] && typeof adminGetUser === "function") {
      email = (await adminGetUser(String(order["user_id"])).catch(() => null))?.email ?? null;
    }
    const name = (profile?.["full_name"] as string | undefined) ?? (order["customer_name"] as string | undefined) ?? "";
    const orderNumber = (order["order_number"] as string | null) ?? order.id.slice(0, 8).toUpperCase();
    const link = `${SITE_URL}/orders/${order.id}/receipt`;
    const out: { email?: Result; sms?: Result } = {};

    if (data.email) {
      if (!email) out.email = { sent: false, error: "No email address on file" };
      else {
        const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a">
<p>Hi ${String(name || "there").replace(/[<>&]/g, "")},</p>
<p>Please find attached the invoice for your order <strong>#${orderNumber}</strong> with ${brand.brand_name}.</p>
<p><a href="${link}">View your receipt online</a></p><p>Thank you,<br/>${brand.brand_name}</p></div>`;
        const r = await sendResend(email, `Invoice for order #${orderNumber} · ${brand.brand_name}`, html, brand,
          data.pdfBase64 ? [{ filename: data.filename || `invoice-${orderNumber}.pdf`, content: data.pdfBase64 }] : undefined);
        out.email = r.sent ? { sent: true } : { sent: false, error: r.error === "missing_key" ? "Email sending is not set up" : `Email failed (${r.error})` };
      }
    }
    if (data.sms) {
      const phone = normalizeIndianPhone((order["phone"] as string) ?? (profile?.["phone"] as string));
      if (!phone) out.sms = { sent: false, error: "No valid phone number on file" };
      else {
        const r = await sendSms(`+${phone}`, `${brand.brand_name}: Invoice for order #${orderNumber} — ${link}`);
        out.sms = r.sent ? { sent: true } : { sent: false, error: r.error === "sms_not_configured" ? "SMS sending is not set up" : `SMS failed (${r.error})` };
      }
    }
    return out;
  });
