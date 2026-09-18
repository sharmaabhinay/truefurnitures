import { adminQuery } from "@/lib/firebase-admin.server";
const ev: any[] = await adminQuery("visitors");
const sofas: any[] = await adminQuery("sofas");
for (const s of sofas) {
  const m = ev.filter(e=>e.sofaId===s.id || (s.slug&&e.slug===s.slug));
  const c:any={}; for(const e of m) c[e.type]=(c[e.type]??0)+1;
  console.log(s.name, "| id", s.id.slice(0,8), JSON.stringify(c));
}
const latest = ev.map(e=>e.time).sort().slice(-3);
console.log("latest events", latest);
