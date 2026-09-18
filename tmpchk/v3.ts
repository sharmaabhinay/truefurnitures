import { adminQuery, adminGetDoc } from "@/lib/firebase-admin.server";
const id = "01653a50-1987-47c2-a0a7-668f3a374021";
const sofa: any = await adminGetDoc("sofas", id).catch(()=>null);
console.log("sofa", sofa && sofa.slug, sofa && sofa.name);
const events: any[] = await adminQuery("visitors");
const slug = sofa?.slug ?? ""; const name = sofa?.name ?? "";
const mine = (e:any)=> String(e.sofaId??"")===id || (slug && String(e.slug??"")===slug) || (!e.sofaId && !e.slug && String(e.item??"")===name);
const pe = events.filter(mine);
console.log("matched", pe.length, pe.reduce((m:any,e:any)=>(m[e.type]=(m[e.type]??0)+1,m),{}));
