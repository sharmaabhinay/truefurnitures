import { adminQuery } from "@/lib/firebase-admin.server";
const rows: any[] = await adminQuery("visitors");
console.log("total", rows.length);
const byType: Record<string, number> = {};
for (const r of rows) byType[r.type ?? "?"] = (byType[r.type ?? "?"] ?? 0) + 1;
console.log(byType);
console.log(rows.slice(-8).map(r => ({t:r.type, time:r.time, sofaId:r.sofaId, slug:r.slug, item:r.item, page:r.page})));
