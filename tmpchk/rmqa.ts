import { adminDeleteDoc, adminDeleteUser, adminQuery } from "@/lib/firebase-admin.server";
const uid = "FhjTe9YfELdNeYmM34Xzekj1aR22";
for (const d of await adminQuery("user_roles")) {
  if (String(d["user_id"] ?? d.id) === uid) await adminDeleteDoc("user_roles", d.id);
}
await adminDeleteUser(uid).catch((e) => console.log("auth delete:", String(e).slice(0, 120)));
console.log("remaining roles:", (await adminQuery("user_roles")).map((r) => [r.id, r["role"], r["email"]]));
