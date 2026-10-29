import { useState } from "react";
import { FiSend, FiLoader } from "react-icons/fi";
import { toast } from "sonner";
import { AButton, AModal, dark } from "@/components/admin/ui";
import { useBrand } from "@/lib/brand";
import { buildOrderInvoice, type InvoiceOrder } from "@/lib/order-invoice";
import { normalizeIndianPhone, sendInvoiceToCustomer } from "@/lib/invoice-share.functions";

const SITE = "https://truefurnitures.lovable.app";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

type Channel = "whatsapp" | "email" | "sms";

export function SendInvoiceButton({ order, customerName, email, phone }: { order: InvoiceOrder & { id: string }; customerName: string; email?: string | null; phone?: string | null }) {
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Record<Channel, boolean>>({ whatsapp: true, email: true, sms: false });
  const wa = normalizeIndianPhone(phone);
  const orderNo = order.order_number || order.id.slice(0, 8).toUpperCase();
  const link = `${SITE}/orders/${order.id}/receipt`;

  const send = async () => {
    if (!sel.whatsapp && !sel.email && !sel.sms) { toast.error("Choose at least one way to send"); return; }
    // WhatsApp must open inside the click so the browser doesn't block it.
    if (sel.whatsapp) {
      if (!wa) toast.error("WhatsApp: no valid phone number on file");
      else window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${customerName || ""}, here is the invoice for your ${brand.brand_name} order #${orderNo}: ${link}`)}`, "_blank", "noopener");
    }
    if (!sel.email && !sel.sms) { setOpen(false); return; }
    setBusy(true);
    try {
      let pdfBase64: string | undefined;
      if (sel.email) pdfBase64 = await blobToBase64(await buildOrderInvoice(order, customerName, brand));
      const res = await sendInvoiceToCustomer({ data: { orderId: order.id, email: sel.email, sms: sel.sms, pdfBase64, filename: `invoice-${orderNo}.pdf` } });
      if (res.email) res.email.sent ? toast.success("Invoice emailed with PDF attached") : toast.error(`Email: ${res.email.error}`);
      if (res.sms) res.sms.sent ? toast.success("Invoice link sent by SMS") : toast.error(`SMS: ${res.sms.error}`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send invoice");
    } finally { setBusy(false); }
  };

  const row = (key: Channel, label: string, target: string) => (
    <label key={key} className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer" style={{ border: `1px solid ${dark.border}`, background: dark.card }}>
      <input type="checkbox" checked={sel[key]} onChange={(e) => setSel((s) => ({ ...s, [key]: e.target.checked }))} />
      <span className="flex-1 text-[13px]" style={{ color: dark.text }}>{label}</span>
      <span className="text-[11px] truncate max-w-[50%]" style={{ color: dark.mute }}>{target}</span>
    </label>
  );

  return (
    <>
      <AButton variant="ghost" onClick={() => setOpen(true)}><span className="inline-flex items-center gap-2"><FiSend /> Send invoice</span></AButton>
      <AModal open={open} onClose={() => !busy && setOpen(false)} title="Send invoice to customer"
        footer={<><AButton variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</AButton>
          <AButton onClick={send} disabled={busy}><span className="inline-flex items-center gap-2">{busy ? <FiLoader className="animate-spin" /> : <FiSend />}Send now</span></AButton></>}>
        <div className="space-y-2">
          <div className="flex justify-end"><button className="text-[11px] underline" style={{ color: dark.accent }} onClick={() => setSel({ whatsapp: true, email: true, sms: true })}>Select all</button></div>
          {row("whatsapp", "WhatsApp", wa ? `+${wa}` : "No phone")}
          {row("email", "Email (PDF attached)", email || "No email")}
          {row("sms", "SMS (receipt link)", wa ? `+${wa}` : "No phone")}
          <p className="text-[11px] pt-1" style={{ color: dark.mute }}>WhatsApp opens with the message ready — tap send in WhatsApp.</p>
        </div>
      </AModal>
    </>
  );
}
