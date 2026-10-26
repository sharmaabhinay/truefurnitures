import { useEffect, useState } from "react";
import { FiDownload, FiLoader } from "react-icons/fi";
import { toast } from "sonner";
import { AButton } from "@/components/admin/ui";
import { useBrand } from "@/lib/brand";
import { buildOrderInvoice, type InvoiceOrder } from "@/lib/order-invoice";
import { deliverFile } from "@/lib/download";
import { INVOICE_SHORTCUT } from "@/lib/admin-shortcuts";

export function OrderInvoiceButton({ order, customerName = "", shortcut = false }: { order: InvoiceOrder; customerName?: string; shortcut?: boolean }) {
  const brand = useBrand();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setBlob(null); setError(false);
    buildOrderInvoice(order, customerName, brand).then((result) => { if (alive) setBlob(result); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [order, customerName, brand, retry]);
  const filename = `invoice-${(order.order_number || order.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
  useEffect(() => {
    if (!shortcut) return;
    const download = () => {
      if (!blob) { toast.error(error ? "Invoice could not be prepared. Please retry." : "Your invoice is still being prepared."); return; }
      void deliverFile(blob, filename).catch(() => toast.error("Invoice download failed. Please try again."));
    };
    window.addEventListener(INVOICE_SHORTCUT, download);
    return () => window.removeEventListener(INVOICE_SHORTCUT, download);
  }, [shortcut, blob, filename, error]);
  return <AButton disabled={!blob && !error} title={shortcut ? "Download order invoice (O then I)" : "Download PDF invoice"} onClick={() => {
    if (error) { setRetry((prev) => prev + 1); return; }
    if (blob) void deliverFile(blob, filename).catch(() => toast.error("Invoice download failed. Please try again."));
  }}><span className="inline-flex items-center gap-2">{!blob && !error ? <FiLoader className="animate-spin" /> : <FiDownload />}{error ? "Retry invoice" : blob ? "Download invoice" : "Preparing invoice…"}</span></AButton>;
}