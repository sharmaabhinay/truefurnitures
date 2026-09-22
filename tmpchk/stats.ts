import { adminQuery } from "@/lib/firebase-admin.server";
const [sofas, events, orders, carts]: any[][] = await Promise.all([adminQuery("sofas"),adminQuery("visitors"),adminQuery("orders"),adminQuery("carts")]);
for (const s of sofas) {
  const slug=String(s.slug??""), name=String(s.name??"");
  const mine=events.filter((e:any)=>{const eid=String(e.sofaId??e.sofa_id??"");if(eid)return eid===s.id;const es=String(e.slug??"");if(es)return !!slug&&es===slug;return !!name&&String(e.item??"").toLowerCase().trim()===name.toLowerCase().trim();});
  const c=(t:string)=>mine.filter((e:any)=>e.type===t).length;
  const ord=orders.filter((o:any)=>!o.deleted_at&&(o.sofa_id===s.id||(slug&&o.sofa_snapshot?.slug===slug))).length;
  let units=0,cust=0;
  for(const ct of carts){if(ct.deleted_at)continue;const q=(ct.items??[]).filter((it:any)=>it&&(it.sofaId===s.id||(slug&&it.slug===slug))).reduce((n:number,it:any)=>n+(Number(it.quantity)||0),0);if(q>0){units+=q;cust++;}}
  console.log(name.padEnd(28), "imp",c("impression"),"views",c("product_view"),"atc",c("add_to_cart"),"orders",ord,"cartUnits",units,"cust",cust);
}
