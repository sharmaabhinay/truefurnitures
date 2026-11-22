import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listHomeModeration, moderateHome } from "@/lib/real-homes.functions";

export function RealHomesModeration() {
  const load = useServerFn(listHomeModeration); const update = useServerFn(moderateHome); const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const query = useQuery({ queryKey: ["admin-real-homes"], queryFn: () => load() });
  async function moderate(id: string, status: "approved" | "rejected") {
    setBusy(id); try { await update({ data: { id, status } }); await Promise.all([qc.invalidateQueries({ queryKey: ["admin-real-homes"] }), qc.invalidateQueries({ queryKey: ["real-homes"] })]); toast.success(status === "approved" ? "Home published" : "Home removed from public gallery"); } catch { toast.error("Couldn’t update this submission."); } finally { setBusy(""); }
  }
  return <section className="border-b border-border pb-6 mb-6 text-foreground"><h2 className="text-xl font-display mb-4">Real Homes of Indore</h2>{query.isPending ? <p>Loading submissions…</p> : query.isError ? <><p role="alert">Submissions couldn’t be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></> : !query.data?.length ? <p className="text-muted-foreground text-sm">No customer homes submitted yet.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{query.data.map(home => <article key={home.id} className="border border-border rounded-md overflow-hidden bg-card text-card-foreground"><div className="flex overflow-x-auto">{home.images.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="min-w-full"><img src={url} alt={home.caption} loading="lazy" className="w-full aspect-[4/3] object-cover" /></a>)}</div><div className="p-4 space-y-3"><h3 className="font-medium">{home.locality} · {home.sofaName}</h3><p className="text-sm break-words">{home.caption}</p><p className="text-xs text-muted-foreground">{home.status}</p><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!!busy || home.status === 'approved'} onClick={() => moderate(home.id, "approved")}><Check />Publish</Button><Button size="sm" variant="outline" disabled={!!busy || home.status === 'rejected'} onClick={() => moderate(home.id, "rejected")}><X />{home.status === 'approved' ? 'Unpublish' : 'Reject'}</Button></div></div></article>)}</div>}</section>;
}