export type InvoiceOrder = {
  id: string; order_number?: string; created_at?: string; status?: string;
  subtotal?: number; discount?: number; total?: number; deposit_paid?: number; balance_due?: number; refund_amount?: number | null;
  delivery_address?: string | null; delivery_city?: string | null; phone?: string | null;
  razorpay_payment_id?: string | null; customer_name?: string | null;
  sofa_snapshot?: { name?: string; quantity?: number } | null;
  fabric_snapshot?: { name?: string } | null; size_snapshot?: { label?: string } | null;
  addons_snapshot?: Array<{ name?: string; price?: number }> | null;
};
export function invoiceQrPayload(order: InvoiceOrder): string {
  return `True Furniture order: ${order.order_number || order.id}`;
}
export function invoiceAmounts(order: InvoiceOrder) {
  const amount = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
  return { subtotal: amount(order.subtotal), discount: amount(order.discount), total: amount(order.total), paid: amount(order.deposit_paid), balance: amount(order.balance_due), refund: amount(order.refund_amount) };
}

export async function buildOrderInvoice(order: InvoiceOrder, customerName: string, brand: { brand_name: string; address: string; phone: string; email: string }): Promise<Blob> {
  const [{ PDFDocument }, fontkit, QRCode] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit"), import("qrcode")]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit.default);
  const fonts = await Promise.all(["regular", "bold"].map(async (name) => {
    const response = await fetch(`/fonts/invoice-${name}.ttf`);
    if (!response.ok) throw new Error("Invoice font could not be loaded.");
    // Preserve merged Latin/Devanagari glyph IDs; subsetting this combined font
    // can produce valid text extraction but blank glyphs in PDF viewers.
    return pdf.embedFont(await response.arrayBuffer(), { subset: false });
  }));
  const regular = fonts[0]; const bold = fonts[1];
  if (!regular || !bold) throw new Error("Invoice fonts unavailable.");
  let page = pdf.addPage([595.28, 841.89]);
  let y = 795;
  const draw = (text: string, strong = false, size = 11) => {
    const font = strong ? bold : regular;
    // Wrap every field, including long customer addresses and unbroken identifiers.
    const supported = new Set(font.getCharacterSet());
    const safe = [...text].map((c) => supported.has(c.codePointAt(0) ?? 0) ? c : "?").join("");
    for (const paragraph of safe.split(/\r?\n/)) {
      let line = "";
      for (const char of [...paragraph]) {
        if (font.widthOfTextAtSize(line + char, size) > 495 && line) {
          if (y < 55) { page = pdf.addPage([595.28, 841.89]); y = 795; }
          page.drawText(line, { x: 50, y, size, font }); y -= size + 7; line = "";
        }
        line += char;
      }
      if (y < 55) { page = pdf.addPage([595.28, 841.89]); y = 795; }
      page.drawText(line, { x: 50, y, size, font }); y -= size + 7;
    }
  };
  draw(brand.brand_name, true, 22);
  draw("ORDER INVOICE", true, 14);
  draw(`Invoice / Order: ${order.order_number || order.id}`, true);
  const issued = order.created_at ? new Date(order.created_at) : null;
  if (issued && Number.isFinite(issued.getTime())) draw(`Issued: ${issued.toLocaleDateString("en-IN")}`);
  draw(`Order status: ${order.status ?? "Pending"}`);
  draw(brand.address); draw(`${brand.phone} | ${brand.email}`);
  y -= 12;
  draw("BILLED TO / DELIVERY", true, 13);
  draw(customerName || order.customer_name || "Customer");
  if (order.phone) draw(order.phone);
  if (order.delivery_address) draw(order.delivery_address);
  if (order.delivery_city) draw(order.delivery_city);
  y -= 12;
  draw("ITEMS", true, 13);
  draw(order.sofa_snapshot?.name ?? "Custom sofa", true);
  draw([order.fabric_snapshot?.name, order.size_snapshot?.label, `Quantity: ${order.sofa_snapshot?.quantity ?? 1}`].filter(Boolean).join(" | "));
  const money = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  for (const addon of order.addons_snapshot ?? []) draw(`Add-on: ${addon.name ?? "Add-on"} - ${money(Number(addon.price) || 0)}`);
  y -= 12;
  const amounts = invoiceAmounts(order);
  draw(`Subtotal: ${money(amounts.subtotal)}`);
  draw(`Discount: ${money(amounts.discount)}`);
  draw(`Order total: ${money(amounts.total)}`, true, 14);
  draw(`Paid: ${money(amounts.paid)}`);
  draw(`Balance due: ${money(amounts.balance)}`);
  if (amounts.refund) draw(`Refund recorded: ${money(amounts.refund)}`);
  if (order.razorpay_payment_id) draw(`Payment reference: ${order.razorpay_payment_id}`);
  y -= 12;
  draw("Order amounts as recorded. This document is not a GST tax invoice.", false, 9);
  draw("QR code identifies the order only; it is not a payment request or proof of payment.", false, 9);
  if (y < 170) { page = pdf.addPage([595.28, 841.89]); y = 795; }
  const qr = await QRCode.toDataURL(invoiceQrPayload(order), { width: 240, margin: 2, errorCorrectionLevel: "M" });
  const image = await pdf.embedPng(qr);
  page.drawImage(image, { x: 50, y: y - 110, width: 110, height: 110 });
  pdf.setTitle(`Order invoice ${order.order_number || order.id}`);
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}