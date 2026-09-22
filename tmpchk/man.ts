import { adminAddDoc, adminSetDoc, adminDeleteDoc, adminQuery } from "@/lib/firebase-admin.server";
const payload = { company:"QA Test Co", contact_name:"A", phone:"9", email:"a@b.c", location:"Indore", specialities:"", notes:"", partner_since:"2026-01-01", status:"active", ended_at:"", end_reason:"", products_delivered:0, payout_agreed:1000, deals:[], payments:[], updated_at:new Date().toISOString() };
try {
  const id = await adminAddDoc("manufacturers", { ...payload, created_at: new Date().toISOString() });
  console.log("created", id);
  await adminSetDoc("manufacturers", id, { ...payload, deals:[{title:"D1",value:5000,start:"2026-01-01",end:""}], payments:[{amount:500,date:"2026-02-01",note:"x"}] });
  console.log("updated ok");
  const rows = await adminQuery("manufacturers");
  console.log(rows.map(r=>r["company"]));
  await adminDeleteDoc("manufacturers", id);
  console.log("deleted");
} catch (e) { console.log("ERR", (e as Error).message); }
