import { adminQuery, adminAddDoc, adminSetDoc } from "@/lib/firebase-admin.server";
const now = new Date().toISOString();
// 1. create manufacturer (same payload shape as saveAdminManufacturer)
const mid = await adminAddDoc("manufacturers", {
  company: "Malwa Woodworks", contact_name: "Ramesh", phone: "9876543210",
  location: "Indore", partner_since: "2026-01-10", status: "active",
  payout_agreed: 200000, payments: [], deals: [], created_at: now, updated_at: now,
});
console.log("manufacturer", mid);
// 2. assign a real order, like the order page does
const orders = await adminQuery("orders");
const o: any = orders[0];
const created = new Date(o.created_at);
const delivered = new Date(created.getTime() + 21 * 86400000).toISOString();
await adminSetDoc("orders", o.id, {
  manufacturer_id: mid, manufacturer_name: "Malwa Woodworks",
  manufacturer_assigned_days: 14, status: "delivered", delivered_at: delivered, updated_at: now,
});
console.log("assigned order", o.order_number, o.id, "total", o.total);
// 3. log a payment
await adminSetDoc("manufacturers", mid, { payments: [{ amount: 50000, date: now.slice(0,10), note: "advance" }], updated_at: now });
// 4. recompute what the detail page shows
const m: any = (await adminQuery("manufacturers")).find((x: any) => x.id === mid);
const list = (await adminQuery("orders")).filter((x: any) => x.manufacturer_id === mid);
const paid = (m.payments ?? []).reduce((n: number, p: any) => n + Number(p.amount || 0), 0);
const actual = list.map((x: any) => Math.round((new Date(x.delivered_at).getTime() - new Date(x.created_at).getTime())/86400000));
console.log({ orders: list.length, assignedDays: list.map((x:any)=>x.manufacturer_assigned_days), actualDays: actual,
  agreed: m.payout_agreed, paid, balance: m.payout_agreed - paid,
  avgDelay: actual[0] - list[0].manufacturer_assigned_days, lastPayment: m.payments.at(-1).date });
