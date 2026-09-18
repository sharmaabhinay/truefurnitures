import { createSign } from "crypto";
const email = process.env["FIREBASE_CLIENT_EMAIL"]!;
const key = process.env["FIREBASE_PRIVATE_KEY"]!.replace(/\\n/g, "\n");
const uid = "5YbH6GABEvOOPCDZdo2mY6tMet83";
const now = Math.floor(Date.now()/1000);
const aud = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
const b64 = (o:any)=>Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = `${b64({alg:"RS256",typ:"JWT"})}.${b64({iss:email,sub:email,aud,iat:now,exp:now+3600,uid})}`;
const sig = createSign("RSA-SHA256").update(unsigned).end().sign(key).toString("base64url");
const custom = `${unsigned}.${sig}`;
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyCzCk0TmecUlOuaMDuOXWJutLQaehbGh2A`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:custom,returnSecureToken:true})});
const j:any = await r.json();
if(!j.idToken){console.log("FAIL",JSON.stringify(j).slice(0,300));process.exit(1);}
await Bun.write("/tmp/browser/fb-session.json", JSON.stringify({uid,idToken:j.idToken,refreshToken:j.refreshToken,expiresIn:j.expiresIn}));
console.log("ok token written");
