import { adminQuery } from "@/lib/firebase-admin.server";
const m = await adminQuery("manufacturers");
const o = await adminQuery("orders");
console.log("manufacturers", m.length, m.map((x:any)=>({id:x.id,company:x.company,payout:x.payout_agreed,payments:(x.payments||[]).length})));
console.log("orders", o.length, o.slice(0,5).map((x:any)=>({id:x.id,num:x.order_number,status:x.status,mid:x.manufacturer_id,days:x.manufacturer_assigned_days,created:x.created_at,delivered:x.delivered_at})));
