import { adminQuery } from "@/lib/firebase-admin.server";
console.log(await adminQuery("user_roles"));
