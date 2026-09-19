import { adminQuery } from "@/lib/firebase-admin.server";
const rows:any[] = await adminQuery("sofas");
for (const s of rows.slice(0,10)) console.log(s.id, "|", s.slug, "|", s.name, "|", s.is_published);
