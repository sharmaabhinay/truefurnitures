declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type Prefill = { name?: string; email?: string; contact?: string };

export async function openRazorpayCheckout(params: {
  createRzp: (args: { data: { orderIds: string[] } }) => Promise<{ keyId: string; razorpayOrderId: string; amount: number; currency: string; orderIds: string[] }>;
  verifyRzp: (args: { data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; orderIds: string[] } }) => Promise<unknown>;
  orderIds: string[];
  prefill?: Prefill;
  city?: string;
  onSuccess: () => void;
  onDismiss?: () => void;
  onError?: (err: unknown) => void;
}) {
  const scriptOk = await loadRazorpayScript();
  if (!scriptOk) throw new Error("Could not load payment gateway");

  const rp = await params.createRzp({ data: { orderIds: params.orderIds } });

  const options = {
    key: rp.keyId,
    amount: rp.amount,
    currency: rp.currency,
    name: "True Furniture's",
    description: `Booking deposit (20%) · ${params.orderIds.length} item${params.orderIds.length > 1 ? "s" : ""}`,
    order_id: rp.razorpayOrderId,
    prefill: params.prefill ?? {},
    notes: { city: params.city ?? "" },
    theme: { color: "#111111" },
    handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      try {
        await params.verifyRzp({
          data: {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            orderIds: params.orderIds,
          },
        });
        params.onSuccess();
      } catch (err) {
        params.onError?.(err);
      }
    },
    modal: {
      ondismiss: () => params.onDismiss?.(),
    },
  };

  const rz = new window.Razorpay!(options);
  rz.on("payment.failed", (resp: any) => {
    params.onError?.(new Error(resp?.error?.description || "Payment failed"));
  });
  rz.open();
  return rp;
}
