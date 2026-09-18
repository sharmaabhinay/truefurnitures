import { adminQuery } from "@/lib/firebase-admin.server";
const rows: any[] = await adminQuery("visitors");
const rel = rows.filter(r => ["impression","product_view","add_to_cart","view_3d"].includes(r.type));
console.log(rel.slice(0,10).map(r=>({t:r.type,sofaId:r.sofaId,slug:r.slug,item:r.item})));
const sofas: any[] = await adminQuery("sofas");
console.log(sofas.map(s=>({id:s.id,slug:s.slug,name:s.name})));
