import { adminAddDoc, adminQuery, adminSetDoc } from "../src/lib/firebase-admin.server";
const id = await adminAddDoc("manufacturers", { company: "Test Partner Works", status: "active", payout_agreed: 50000, payments: [], deals: [], created_at: new Date().toISOString() });
console.log("created", id);
await adminSetDoc("manufacturers", id, { payments: [{ amount: 1000, date: "2026-09-16", note: "advance" }] });
const rows = await adminQuery("manufacturers");
console.log(rows.length, JSON.stringify(rows.find((r:any)=>r.id===id)));
