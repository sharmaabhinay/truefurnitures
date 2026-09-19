import { adminSetDoc } from "@/lib/firebase-admin.server";
const API="AIzaSyCzCk0TmecUlOuaMDuOXWJutLQaehbGh2A";
const email="qa-analytics@truefurnitures.com", password="Qa!analytics2026";
let r:any = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})})).json();
if(!r.localId){
  r = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})})).json();
}
if(!r.localId){console.log("FAIL",JSON.stringify(r).slice(0,300));process.exit(1);}
await adminSetDoc("user_roles", r.localId, { role:"admin", user_id:r.localId, email });
console.log("uid", r.localId);
