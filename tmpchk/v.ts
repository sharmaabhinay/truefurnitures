import { adminQuery } from "../src/lib/firebase-admin.server";
const v = await adminQuery("visitors");
const byType: Record<string, number> = {};
for (const e of v) byType[String((e as any).type)] = (byType[String((e as any).type)] ?? 0) + 1;
console.log("visitors total", v.length, byType);
const adds = v.filter((e:any)=>e.type==="add_to_cart").slice(-5);
console.log(JSON.stringify(adds, null, 1));
const carts = await adminQuery("carts");
console.log("carts", carts.length, JSON.stringify(carts.slice(0,2)).slice(0,600));
