import { adminQuery, adminListUsers } from "../src/lib/firebase-admin.server";
const p = await adminQuery("profiles");
console.log("profiles", p.length, JSON.stringify(p.slice(0,3)));
const n = await adminQuery("newsletter_subscribers");
console.log("newsletter", n.length, JSON.stringify(n.slice(0,2)));
const u = await adminListUsers();
console.log("authusers", u.length, JSON.stringify(u.slice(0,3)));
