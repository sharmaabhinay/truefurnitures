import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { trackingInput, publicOrder, samePhone } from "./order-tracking";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator(input => trackingInput.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { adminQuery } = await import("./firebase-admin.server");
    const rows = await adminQuery("orders", [{ field: "order_number", value: data.orderNumber }], { limit: 1 });
    const order = rows[0];
    if (!order || order['deleted_at']) return { order: null, error: "No matching order found. Check your order number." };
    const verified = samePhone(order['phone'], data.phone);
    if (data.phone && !verified) return { order: null, error: "The order number and phone number do not match." };
    const history = await adminQuery("order_status_history", [{ field: "order_id", value: order.id }]);
    return { order: publicOrder(order, history, verified), error: null };
  });

export const trackMyOrders = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { adminQuery } = await import("./firebase-admin.server");
    const orders = await adminQuery("orders", [{ field: "user_id", value: context.userId }]);
    return Promise.all(orders.filter(order => !order['deleted_at']).sort((a, b) => String(b['created_at']).localeCompare(String(a['created_at']))).map(async order =>
      publicOrder(order, await adminQuery("order_status_history", [{ field: "order_id", value: order.id }]), true)));
  });